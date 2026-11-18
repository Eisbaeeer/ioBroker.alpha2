'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { deviceOf } = require('../../lib/xml');
const { extract, definition, commonOf, parentsOf, DEFS } = require('../../lib/mapping');

const fixture = name => fs.readFileSync(path.join(__dirname, '..', 'fixtures', `${name}.xml`), 'utf8');
const v1 = require('../fixtures/v1-states.json');

describe('mapping', () => {
    const all = extract(deviceOf(fixture('static')));
    const live = extract(deviceOf(fixture('cyclic')));

    it('keeps every state of adapter 1.x with the same type', () => {
        for (const [key, old] of Object.entries(v1)) {
            const def = DEFS[key];
            assert.ok(def, `${key} is missing`);
            assert.equal(def.type, old.type, `${key} changed its type`);
            if (old.write) {
                assert.ok(def.write || key === 'VACATION.START_TIME', `${key} is no longer writable`);
            }
        }
    });

    it('delivers values in the 1.x format', () => {
        assert.equal(all.get('DEVICE.ID'), 'EZR012345');
        assert.equal(all.get('HEATAREA.1.T_ACTUAL'), 21.4);
        assert.equal(all.get('HEATAREA.1.T_TARGET'), 21);
        assert.equal(all.get('HEATAREA.1.HEATAREA_MODE'), '0');
        assert.equal(all.get('HEATAREA.1.HEATAREA_NAME'), 'Room 1');
        assert.equal(all.get('IODEVICE.1.BATTERY'), '2');
        assert.equal(all.get('IODEVICE.1.HEATAREA_NR'), '1');
        assert.equal(typeof all.get('HEATCTRL.1.ACTOR'), 'boolean');
        assert.equal(typeof all.get('HEATCTRL.1.ACTOR_PERCENT'), 'number');
        assert.equal(all.get('DEVICE.PUMP'), true);
        assert.equal(all.get('VACATION.STATE'), false);
        assert.equal(all.get('PROGRAM.2.2.START') !== undefined, true);
    });

    it('adds the new values', () => {
        assert.equal(all.get('HEATAREA.1.T_TARGET_MIN'), 6);
        assert.equal(all.get('HEATAREA.1.T_TARGET_MAX'), 28);
        assert.equal(all.get('HEATAREA.1.PARTY'), false);
        assert.equal(all.get('DEVICE.VERS_SW_STM'), '02.17');
        assert.equal(all.get('DEVICE.ERRORCOUNT'), 0);
        assert.equal(all.get('DEVICE.CLOUD_STATE'), 'Offline');
        assert.equal(typeof all.get('HEATAREA.3.HEATING'), 'boolean');
        assert.equal(all.get('IODEVICE.3.LOWBAT'), true, 'battery 1 (yellow) counts as low');
        assert.equal(all.get('IODEVICE.1.LOWBAT'), false);
        assert.equal(all.get('IODEVICE.1.UNREACH'), false);
    });

    it('never reads credentials, codes or network settings', () => {
        const bad = /PASSWORD|USERID|EXPERT|LOCK_CODE|MAC|IPV4|IPV6|GATEWAY|DNS|NETMASK|M2MSERVER|KWL_URL|CODE/;
        for (const [key, value] of all) {
            assert.ok(!bad.test(key), key);
            assert.notEqual(value, 'example', key);
            assert.notEqual(value, '0000000000000000', key);
            assert.notEqual(value, '192.0.2.10', key);
        }
    });

    it('gives every value a matching definition and parents', () => {
        for (const map of [all, live]) {
            for (const [key, value] of map) {
                const def = definition(key);
                assert.ok(def, key);
                assert.equal(typeof value, def.type, key);
                assert.ok(commonOf(key), key);
                assert.ok(parentsOf(key).length, key);
            }
        }
    });

    it('reads live values from cyclic.xml without actuators', () => {
        assert.equal(live.get('HEATAREA.4.T_ACTUAL'), 19.6);
        assert.equal(live.get('HEATAREA.4.T_TARGET'), 18);
        assert.equal(live.has('HEATAREA.1.HEATING'), false);
        assert.equal(live.has('HEATCTRL.1.ACTOR'), false);
        assert.equal(live.has('DEVICE.ID'), false);
    });
});
