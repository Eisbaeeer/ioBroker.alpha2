'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { tests } = require('@iobroker/testing');
const { FakeAlpha2 } = require('./fake-device');

/**
 * Waits until a condition holds.
 *
 * @param {() => Promise<boolean>} check condition
 * @param {number} [ms] longest wait
 */
async function waitFor(check, ms = 20000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        if (await check()) {
            return;
        }
        await new Promise(r => setTimeout(r, 200));
    }
    throw new Error('condition not reached in time');
}

tests.integration(path.join(__dirname, '..'), {
    // e.g. IOB_CONTROLLER=7.2.5 to test against a released js-controller
    controllerVersion: process.env.IOB_CONTROLLER || undefined,
    defineAdditionalTests({ suite }) {
        suite('with a simulated base station', getHarness => {
            let fake;
            let harness;
            const ns = 'alpha2.0';
            const val = async id => (await harness.states.getStateAsync(`${ns}.${id}`))?.val;

            before(async function () {
                this.timeout(60000);
                fake = new FakeAlpha2({ delay: 20 });
                const port = await fake.start();
                harness = getHarness();

                // objects as adapter 1.x left them: history settings and the old string type must survive
                await harness.objects.setObjectAsync(`${ns}.HEATCTRL.1.ACTOR_PERCENT`, {
                    type: 'state',
                    common: {
                        name: 'HEATCTRL 1 ACTOR_PERCENT',
                        type: 'number',
                        role: 'state',
                        unit: '%',
                        read: true,
                        write: false,
                        custom: { 'influxdb.0': { enabled: true, changesOnly: true } },
                    },
                    native: {},
                });
                await harness.objects.setObjectAsync(`${ns}.HEATAREA.1.HEATAREA_MODE`, {
                    type: 'state',
                    common: {
                        name: 'HEATAREA 1 HEATAREA_MODE',
                        type: 'string',
                        role: 'state',
                        read: true,
                        write: true,
                        states: '0:Auto;1:Day;2:Night',
                    },
                    native: {},
                });

                await harness.changeAdapterConfig('alpha2', {
                    native: { host: `127.0.0.1:${port}`, polltime: 2000, staticInterval: 10, timeout: 2000 },
                });
                await harness.startAdapterAndWait();
            });

            after(async () => {
                await fake.stop();
            });

            it('reads the base station and reports the connection', async function () {
                this.timeout(30000);
                await waitFor(async () => (await val('info.connection')) === true);
                await waitFor(async () => (await val('HEATAREA.5.T_TARGET')) === 23);
                assert.equal(await val('DEVICE.ID'), 'EZR012345');
                assert.equal(await val('HEATAREA.1.T_ACTUAL'), 22.1);
                assert.equal(await val('HEATAREA.1.HEATAREA_MODE'), '0');
                assert.equal(await val('IODEVICE.1.BATTERY'), '2');
                assert.equal(typeof (await val('HEATAREA.1.HEATING')), 'boolean');
                assert.equal(await val('IODEVICE.3.LOWBAT'), true);
            });

            it('keeps history settings and types of existing objects', async () => {
                const actor = await harness.objects.getObjectAsync(`${ns}.HEATCTRL.1.ACTOR_PERCENT`);
                assert.equal(actor.common.custom?.['influxdb.0']?.enabled, true);
                assert.equal(actor.common.type, 'number');
                const mode = await harness.objects.getObjectAsync(`${ns}.HEATAREA.1.HEATAREA_MODE`);
                assert.equal(mode.common.type, 'string');
                const target = await harness.objects.getObjectAsync(`${ns}.HEATAREA.1.T_TARGET`);
                assert.equal(target.common.min, 5);
                assert.equal(target.common.max, 26);
                assert.equal(target.common.role, 'level.temperature');
                const area = await harness.objects.getObjectAsync(`${ns}.HEATAREA.2`);
                assert.equal(area.common.name, 'Room 2');
            });

            it('creates no objects for credentials or network settings', async () => {
                const objs = await harness.objects.getObjectListAsync({ startkey: `${ns}.`, endkey: `${ns}.香` });
                const ids = objs.rows.map(r => r.id);
                assert.ok(ids.length > 100, `only ${ids.length} objects`);
                assert.ok(!ids.some(id => /PASSWORD|USERID|EXPERT|LOCK_CODE|MAC|IPV4|M2MSERVER/.test(id)));
            });

            it('sets a target temperature and confirms it with ack', async function () {
                this.timeout(30000);
                await harness.states.setStateAsync(`${ns}.HEATAREA.2.T_TARGET`, { val: 21.43, ack: false });
                await waitFor(async () => {
                    const s = await harness.states.getStateAsync(`${ns}.HEATAREA.2.T_TARGET`);
                    return s?.ack === true && s.val === 21.4;
                });
                const post = fake.posts.find(b => b.includes('T_TARGET'));
                assert.ok(
                    post?.includes('<ID>EZR012345</ID><HEATAREA nr="2"><T_TARGET>21.4</T_TARGET></HEATAREA>'),
                    post,
                );
            });

            it('sends only the last value of a quick series', async function () {
                this.timeout(30000);
                const before = fake.posts.length;
                for (const v of [20, 20.5, 21, 21.5, 22]) {
                    await harness.states.setStateAsync(`${ns}.HEATAREA.3.T_TARGET`, { val: v, ack: false });
                }
                await waitFor(async () => {
                    const s = await harness.states.getStateAsync(`${ns}.HEATAREA.3.T_TARGET`);
                    return s?.ack === true && s.val === 22;
                });
                const sent = fake.posts.slice(before);
                assert.ok(sent.length < 5, `${sent.length} posts for 5 quick changes`);
                assert.ok(sent.at(-1)?.includes('<T_TARGET>22.0</T_TARGET>'));
            });

            it('refuses invalid values and shows the value of the base station again', async function () {
                this.timeout(30000);
                const before = fake.posts.length;
                await harness.states.setStateAsync(`${ns}.HEATAREA.1.HEATAREA_MODE`, { val: '7', ack: false });
                await waitFor(async () => {
                    const s = await harness.states.getStateAsync(`${ns}.HEATAREA.1.HEATAREA_MODE`);
                    return s?.ack === true && s.val === '0';
                });
                assert.equal(fake.posts.length, before);
                assert.ok(harness.hasLog(/Not sent: HEATAREA\.1\.HEATAREA_MODE/, 'warn'));
            });

            it('never sends two requests at the same time', () => {
                assert.equal(fake.maxActive, 1);
                assert.equal(fake.rejected, 0);
            });

            it('reports a switched off base station and recovers', async function () {
                this.timeout(60000);
                fake.down = true;
                await waitFor(async () => (await val('info.connection')) === false, 40000);
                fake.down = false;
                await waitFor(async () => (await val('info.connection')) === true, 40000);
            });
        });
    },
});
