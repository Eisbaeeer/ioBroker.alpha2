'use strict';

const assert = require('node:assert/strict');
const { buildCommand, CommandError } = require('../../lib/commands');

const ctx = { deviceId: 'EZR012345', limits: nr => (nr === '1' ? { min: 5, max: 26 } : undefined) };
const inner = (id, v) => {
    const body = buildCommand(id, v, ctx).body;
    assert.ok(body.startsWith('<?xml version="1.0" encoding="UTF-8"?><Devices><Device><ID>EZR012345</ID>'));
    assert.ok(body.endsWith('</Device></Devices>'));
    return body.replace(/^.*<\/ID>/, '').replace(/<\/Device><\/Devices>$/, '');
};
const rejects = (id, v) => assert.throws(() => buildCommand(id, v, ctx), CommandError, `${id}=${String(v)}`);

describe('commands', () => {
    it('sets temperatures rounded to 0.1 °C and within the limits', () => {
        assert.equal(inner('HEATAREA.1.T_TARGET', 21.53), '<HEATAREA nr="1"><T_TARGET>21.5</T_TARGET></HEATAREA>');
        assert.equal(inner('HEATAREA.1.T_TARGET', '21,4'), '<HEATAREA nr="1"><T_TARGET>21.4</T_TARGET></HEATAREA>');
        assert.equal(inner('HEATAREA.1.T_TARGET', 40), '<HEATAREA nr="1"><T_TARGET>26.0</T_TARGET></HEATAREA>');
        assert.equal(
            inner('HEATAREA.1.T_HEAT_NIGHT', 1),
            '<HEATAREA nr="1"><T_HEAT_NIGHT>5.0</T_HEAT_NIGHT></HEATAREA>',
        );
        assert.equal(inner('HEATAREA.7.T_TARGET', 35), '<HEATAREA nr="7"><T_TARGET>30.0</T_TARGET></HEATAREA>');
        assert.match(buildCommand('HEATAREA.1.T_TARGET', 40, ctx).description, /limited/);
        rejects('HEATAREA.1.T_TARGET', 'warm');
        rejects('HEATAREA.1.T_TARGET', null);
        rejects('HEATAREA.1.T_TARGET', NaN);
    });

    it('sets modes, programs and switches', () => {
        assert.equal(
            inner('HEATAREA.2.HEATAREA_MODE', '1'),
            '<HEATAREA nr="2"><HEATAREA_MODE>1</HEATAREA_MODE></HEATAREA>',
        );
        assert.equal(
            inner('HEATAREA.2.PROGRAM_WEEKEND', 3),
            '<HEATAREA nr="2"><PROGRAM_WEEKEND>3</PROGRAM_WEEKEND></HEATAREA>',
        );
        assert.equal(inner('HEATAREA.2.PARTY', true), '<HEATAREA nr="2"><PARTY>1</PARTY></HEATAREA>');
        assert.equal(inner('HEATAREA.2.PRESENCE', false), '<HEATAREA nr="2"><PRESENCE>0</PRESENCE></HEATAREA>');
        assert.equal(inner('HEATAREA.2.ISLOCKED', '1'), '<HEATAREA nr="2"><ISLOCKED>1</ISLOCKED></HEATAREA>');
        assert.equal(inner('DEVICE.LOCK_MODE', '0'), '<LOCK_MODE>0</LOCK_MODE>');
        assert.equal(inner('DEVICE.T_HEAT_VACATION', 15), '<T_HEAT_VACATION>15.0</T_HEAT_VACATION>');
        rejects('HEATAREA.2.HEATAREA_MODE', 3);
        rejects('HEATAREA.2.HEATAREA_MODE', 1.5);
        rejects('HEATAREA.2.PROGRAM_WEEK', 4);
        rejects('HEATAREA.2.PARTY', 'yes');
    });

    it('sets switching times in quarter hours', () => {
        assert.equal(
            inner('PROGRAM.1.2.START', '6:15'),
            '<PROGRAM><SHIFT_PROGRAM nr="1" shiftingtime="2"><START>06:15</START></SHIFT_PROGRAM></PROGRAM>',
        );
        assert.equal(
            inner('PROGRAM.1.2.END', '24:00'),
            '<PROGRAM><SHIFT_PROGRAM nr="1" shiftingtime="2"><END>24:00</END></SHIFT_PROGRAM></PROGRAM>',
        );
        rejects('PROGRAM.1.2.START', '24:00');
        rejects('PROGRAM.1.2.START', '06:10');
        rejects('PROGRAM.1.2.START', '25:00');
        rejects('PROGRAM.1.2.START', '0615');
    });

    it('sets and ends a vacation', () => {
        assert.equal(
            inner('VACATION.START_DATE', '2026-12-24'),
            '<VACATION><START_DATE>2026-12-24</START_DATE></VACATION>',
        );
        assert.equal(
            inner('VACATION.STATE', false),
            '<VACATION><VACATION_STATE>0</VACATION_STATE><START_DATE>2000-00-00</START_DATE><END_DATE>2000-00-00</END_DATE></VACATION>',
        );
        rejects('VACATION.END_DATE', '2026-02-30');
        rejects('VACATION.END_DATE', '24.12.2026');
        rejects('VACATION.STATE', true);
    });

    it('can not write anything else', () => {
        for (const id of [
            'HEATAREA.1.T_ACTUAL',
            'HEATAREA.1.HEATAREA_NAME',
            'HEATAREA.1.OFFSET',
            'HEATAREA.1.T_TARGET_MIN',
            'HEATCTRL.1.ACTOR',
            'DEVICE.ID',
            'DEVICE.NAME',
            'COMMAND',
            'CMD_SYSTEMRESET',
            'DEVICE.CMD_SYSTEMRESET',
            'NETWORK.DHCP',
            'CLOUD.PASSWORD',
            'HEATAREA.1.T_TARGET.x',
            'HEATAREA.x.T_TARGET',
        ]) {
            rejects(id, 1);
        }
    });

    it('needs the ID of the base station and escapes it', () => {
        assert.throws(() => buildCommand('HEATAREA.1.T_TARGET', 20, { ...ctx, deviceId: '' }), CommandError);
        const body = buildCommand('HEATAREA.1.T_TARGET', 20, { ...ctx, deviceId: 'A<B&C' }).body;
        assert.ok(body.includes('<ID>A&lt;B&amp;C</ID>'));
    });
});
