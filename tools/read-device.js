'use strict';

/**
 * Reads a base station once (static.xml, then cyclic.xml) and prints the states the adapter
 * would create. Read only: nothing is sent to the base station.
 *
 *   node tools/read-device.js 192.168.1.100 [--json]
 */

const { Alpha2Client } = require('../lib/client');
const { deviceOf } = require('../lib/xml');
const { extract } = require('../lib/mapping');

async function main() {
    const address = process.argv[2];
    if (!address) {
        console.error('usage: node tools/read-device.js <address> [--json]');
        process.exit(2);
    }
    const client = new Alpha2Client({ address, timeout: 5000 });
    const t0 = Date.now();
    const all = extract(deviceOf(await client.get('/data/static.xml')));
    const t1 = Date.now();
    const live = extract(deviceOf(await client.get('/data/cyclic.xml')));
    const t2 = Date.now();

    if (process.argv.includes('--json')) {
        console.log(JSON.stringify({ static: Object.fromEntries(all), cyclic: Object.fromEntries(live) }, null, 2));
        return;
    }
    console.log(`static.xml: ${all.size} values in ${t1 - t0} ms, cyclic.xml: ${live.size} values in ${t2 - t1} ms`);
    for (const k of [
        'DEVICE.TYPE',
        'DEVICE.VERS_SW_STM',
        'DEVICE.VERS_SW_ETH',
        'DEVICE.VERS_HW',
        'DEVICE.ERRORCOUNT',
        'DEVICE.PUMP',
        'DEVICE.CLOUD_STATE',
    ]) {
        console.log(`  ${k} = ${String(all.get(k))}`);
    }
    const areas = [...all.keys()].filter(k => /^HEATAREA\.\d+\.T_ACTUAL$/.test(k)).map(k => k.split('.')[1]);
    for (const nr of areas) {
        const g = tag => all.get(`HEATAREA.${nr}.${tag}`);
        console.log(
            `  heat area ${nr} "${String(g('HEATAREA_NAME'))}": ${String(g('T_ACTUAL'))} °C, target ${String(g('T_TARGET'))} °C ` +
                `(${String(g('T_TARGET_MIN'))}…${String(g('T_TARGET_MAX'))}), mode ${String(g('HEATAREA_MODE'))}, heating ${String(g('HEATING'))}`,
        );
    }
    const ctrls = [...all.keys()].filter(k => /^HEATCTRL\.\d+\.INUSE$/.test(k) && all.get(k)).map(k => k.split('.')[1]);
    console.log(
        `  outputs in use: ${ctrls.map(n => `${n}→area ${String(all.get(`HEATCTRL.${n}.HEATAREA_NR`))} ${all.get(`HEATCTRL.${n}.ACTOR`) ? 'open' : 'closed'}`).join(', ')}`,
    );
    const ios = [...all.keys()].filter(k => /^IODEVICE\.\d+\.BATTERY$/.test(k)).map(k => k.split('.')[1]);
    console.log(
        `  room units: ${ios.map(n => `${n} battery ${String(all.get(`IODEVICE.${n}.BATTERY`))} signal ${String(all.get(`IODEVICE.${n}.SIGNALSTRENGTH`))}`).join(', ')}`,
    );
}

main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
