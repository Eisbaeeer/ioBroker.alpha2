'use strict';

/**
 * Maps the Alpha2 XML answers to ioBroker states.
 *
 * Only whitelisted elements become states. Cloud credentials, network settings, the expert code
 * and the lock codes of the room units are never read into ioBroker.
 *
 * Names, types and value formats of the states known from adapter 1.x stay unchanged, so aliases,
 * scripts and history settings keep working after the update.
 */

const { child, children, fields } = require('./xml');

/**
 * @param {string} en English
 * @param {string} de German
 * @returns {ioBroker.StringOrTranslated} name
 */
const t = (en, de) => ({ en, de });

const S_LEVEL3 = { 0: 'red', 1: 'yellow', 2: 'green' };
const S_OKERR = { 0: 'OK', 1: 'Error' };

/**
 * State definitions. `#` stands for a number (heat area, actuator, room unit, program, shift).
 * conv: how the XML text becomes the state value. `str` keeps the text, as adapter 1.x did.
 *
 */
const DEFS = {
    // device
    'DEVICE.ID': { name: t('Device ID', 'Geräte-ID'), type: 'string', role: 'info.serial', conv: 'str' },
    'DEVICE.NAME': { name: t('Device name', 'Gerätename'), type: 'string', role: 'info.name', conv: 'str' },
    'DEVICE.TYPE': { name: t('Device type', 'Gerätetyp'), type: 'string', role: 'info.model', conv: 'str' },
    'DEVICE.DATETIME': { name: t('Device time', 'Uhrzeit im Gerät'), type: 'string', role: 'date', conv: 'str' },
    'DEVICE.TIMEZONE': { name: t('Time zone', 'Zeitzone'), type: 'string', role: 'text', conv: 'str' },
    'DEVICE.NTPSYNC': {
        name: t('Time sync via NTP', 'Zeit über NTP'),
        type: 'boolean',
        role: 'indicator',
        conv: 'bool',
    },
    'DEVICE.T_HEAT_VACATION': {
        name: t('Vacation temperature', 'Urlaubstemperatur'),
        type: 'number',
        role: 'level',
        unit: '°C',
        conv: 'num',
        write: true,
    },
    'DEVICE.LOCK_MODE': {
        name: t('Lock mode (hotel mode)', 'Sperrmodus (Hotelmodus)'),
        type: 'string',
        role: 'state',
        conv: 'str',
        write: true,
        states: { 0: 'active', 1: 'inactive' },
    },
    'DEVICE.MODE': {
        name: t('Base station mode', 'Betriebsart der Basis'),
        type: 'string',
        role: 'state',
        conv: 'str',
        states: { 0: 'Standalone', 1: 'Master', 2: 'Slave' },
    },
    'DEVICE.PUMP': {
        name: t('Pump output active', 'Pumpenausgang aktiv'),
        type: 'boolean',
        role: 'indicator.working',
        conv: 'bool',
    },
    'DEVICE.RELAIS': {
        name: t('Relay output active', 'Relaisausgang aktiv'),
        type: 'boolean',
        role: 'indicator.working',
        conv: 'bool',
    },
    'DEVICE.COOLING': { name: t('Cooling mode', 'Kühlbetrieb'), type: 'boolean', role: 'indicator', conv: 'bool' },
    'DEVICE.ECO_INPUT_STATE': {
        name: t('ECO input active', 'ECO-Eingang aktiv'),
        type: 'boolean',
        role: 'indicator',
        conv: 'bool',
    },
    'DEVICE.ANTIFREEZE': {
        name: t('Frost protection enabled', 'Frostschutz eingeschaltet'),
        type: 'boolean',
        role: 'indicator',
        conv: 'bool',
    },
    'DEVICE.ANTIFREEZE_TEMP': {
        name: t('Frost protection temperature', 'Frostschutztemperatur'),
        type: 'number',
        role: 'value',
        unit: '°C',
        conv: 'num',
    },
    'DEVICE.SMARTSTART': {
        name: t('Smart start enabled', 'Smart Start eingeschaltet'),
        type: 'boolean',
        role: 'indicator',
        conv: 'bool',
    },
    'DEVICE.ERRORCOUNT': { name: t('Number of errors', 'Anzahl Fehler'), type: 'number', role: 'value', conv: 'num' },
    'DEVICE.CLOUD_STATE': {
        name: t('Cloud connection', 'Cloud-Verbindung'),
        type: 'string',
        role: 'info.status',
        conv: 'str',
    },
    'DEVICE.VERS_SW_STM': {
        name: t('Firmware controller', 'Firmware Regelung'),
        type: 'string',
        role: 'info.firmware',
        conv: 'str',
    },
    'DEVICE.VERS_SW_ETH': {
        name: t('Firmware network module', 'Firmware Netzwerkmodul'),
        type: 'string',
        role: 'info.firmware',
        conv: 'str',
    },
    'DEVICE.VERS_HW': {
        name: t('Hardware revision', 'Hardware-Revision'),
        type: 'string',
        role: 'info.hardware',
        conv: 'str',
    },

    // vacation
    'VACATION.STATE': {
        name: t('Vacation active (false ends it)', 'Urlaub aktiv (false beendet ihn)'),
        type: 'boolean',
        role: 'switch',
        conv: 'bool',
        write: true,
    },
    'VACATION.START_DATE': {
        name: t('Vacation start date', 'Urlaub Beginn'),
        type: 'string',
        role: 'date.start',
        conv: 'str',
        write: true,
    },
    'VACATION.START_TIME': {
        name: t('Vacation start time', 'Urlaub Beginn Uhrzeit'),
        type: 'string',
        role: 'text',
        conv: 'str',
    },
    'VACATION.END_DATE': {
        name: t('Vacation end date', 'Urlaub Ende'),
        type: 'string',
        role: 'date.end',
        conv: 'str',
        write: true,
    },
    'VACATION.END_TIME': {
        name: t('Vacation end time', 'Urlaub Ende Uhrzeit'),
        type: 'string',
        role: 'text',
        conv: 'str',
    },

    // switching programs
    'PROGRAM.#.#.START': {
        name: t('Start (hh:mm)', 'Beginn (hh:mm)'),
        type: 'string',
        role: 'text',
        conv: 'str',
        write: true,
    },
    'PROGRAM.#.#.END': {
        name: t('End (hh:mm)', 'Ende (hh:mm)'),
        type: 'string',
        role: 'text',
        conv: 'str',
        write: true,
    },

    // heat areas
    'HEATAREA.#.HEATAREA_NAME': { name: t('Name', 'Name'), type: 'string', role: 'info.name', conv: 'str' },
    'HEATAREA.#.HEATAREA_MODE': {
        name: t('Mode', 'Betriebsart'),
        type: 'string',
        role: 'state',
        conv: 'str',
        write: true,
        states: { 0: 'Auto', 1: 'Day', 2: 'Night' },
    },
    'HEATAREA.#.T_ACTUAL': {
        name: t('Room temperature', 'Raumtemperatur'),
        type: 'number',
        role: 'value.temperature',
        unit: '°C',
        conv: 'num',
    },
    'HEATAREA.#.T_ACTUAL_EXT': {
        name: t('External sensor temperature', 'Temperatur externer Fühler'),
        type: 'number',
        role: 'value',
        unit: '°C',
        conv: 'num',
    },
    'HEATAREA.#.T_TARGET': {
        name: t('Target temperature', 'Solltemperatur'),
        type: 'number',
        role: 'level.temperature',
        unit: '°C',
        conv: 'num',
        write: true,
    },
    'HEATAREA.#.T_TARGET_BASE': {
        name: t('Target temperature of the program', 'Solltemperatur laut Programm'),
        type: 'number',
        role: 'value',
        unit: '°C',
        conv: 'num',
    },
    'HEATAREA.#.T_TARGET_MIN': {
        name: t('Lowest target temperature', 'Kleinste Solltemperatur'),
        type: 'number',
        role: 'value',
        unit: '°C',
        conv: 'num',
    },
    'HEATAREA.#.T_TARGET_MAX': {
        name: t('Highest target temperature', 'Größte Solltemperatur'),
        type: 'number',
        role: 'value',
        unit: '°C',
        conv: 'num',
    },
    'HEATAREA.#.T_HEAT_DAY': {
        name: t('Heating day temperature', 'Heizen Tagtemperatur'),
        type: 'number',
        role: 'level',
        unit: '°C',
        conv: 'num',
        write: true,
    },
    'HEATAREA.#.T_HEAT_NIGHT': {
        name: t('Heating night temperature', 'Heizen Nachttemperatur'),
        type: 'number',
        role: 'level',
        unit: '°C',
        conv: 'num',
        write: true,
    },
    'HEATAREA.#.T_COOL_DAY': {
        name: t('Cooling day temperature', 'Kühlen Tagtemperatur'),
        type: 'number',
        role: 'level',
        unit: '°C',
        conv: 'num',
        write: true,
    },
    'HEATAREA.#.T_COOL_NIGHT': {
        name: t('Cooling night temperature', 'Kühlen Nachttemperatur'),
        type: 'number',
        role: 'level',
        unit: '°C',
        conv: 'num',
        write: true,
    },
    'HEATAREA.#.OFFSET': {
        name: t('Temperature offset', 'Temperaturkorrektur'),
        type: 'number',
        role: 'value',
        unit: '°C',
        conv: 'num',
    },
    'HEATAREA.#.HEATAREA_STATE': {
        name: t('Heat area state', 'Zustand Heizkreis'),
        type: 'number',
        role: 'value',
        conv: 'num',
    },
    'HEATAREA.#.PROGRAM_SOURCE': {
        name: t('Program source', 'Programmquelle'),
        type: 'number',
        role: 'value',
        conv: 'num',
    },
    'HEATAREA.#.PROGRAM_WEEK': {
        name: t('Program on weekdays', 'Programm werktags'),
        type: 'string',
        role: 'state',
        conv: 'str',
        write: true,
        states: { 0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3' },
    },
    'HEATAREA.#.PROGRAM_WEEKEND': {
        name: t('Program on weekends', 'Programm am Wochenende'),
        type: 'string',
        role: 'state',
        conv: 'str',
        write: true,
        states: { 0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3' },
    },
    'HEATAREA.#.PARTY': {
        name: t('Party mode', 'Partymodus'),
        type: 'boolean',
        role: 'switch',
        conv: 'bool',
        write: true,
    },
    'HEATAREA.#.PARTY_REMAININGTIME': {
        name: t('Party mode remaining', 'Partymodus Restzeit'),
        type: 'number',
        role: 'value',
        unit: 'min',
        conv: 'num',
    },
    'HEATAREA.#.PRESENCE': {
        name: t('Presence mode', 'Anwesenheitsmodus'),
        type: 'boolean',
        role: 'switch',
        conv: 'bool',
        write: true,
    },
    'HEATAREA.#.ISLOCKED': {
        name: t('Room unit locked (child lock)', 'Bediengerät gesperrt (Kindersicherung)'),
        type: 'string',
        role: 'state',
        conv: 'str',
        write: true,
        states: { 0: 'Delocked', 1: 'Locked' },
    },
    'HEATAREA.#.HEATING': {
        name: t('Heating (an actuator is open)', 'Heizt (ein Stellantrieb ist offen)'),
        type: 'boolean',
        role: 'indicator.working',
        conv: 'bool',
    },

    // actuator outputs
    'HEATCTRL.#.INUSE': {
        name: t('Output in use', 'Ausgang belegt'),
        type: 'boolean',
        role: 'indicator',
        conv: 'bool',
    },
    'HEATCTRL.#.HEATAREA_NR': { name: t('Heat area', 'Heizkreis'), type: 'string', role: 'text', conv: 'str' },
    'HEATCTRL.#.ACTOR': {
        name: t('Actuator open', 'Stellantrieb offen'),
        type: 'boolean',
        role: 'indicator.working',
        conv: 'bool',
    },
    'HEATCTRL.#.ACTOR_PERCENT': {
        name: t('Actuator', 'Stellantrieb'),
        type: 'number',
        role: 'value',
        unit: '%',
        conv: 'num',
    },
    'HEATCTRL.#.HEATCTRL_STATE': {
        name: t('Output state', 'Zustand Ausgang'),
        type: 'number',
        role: 'value',
        conv: 'num',
        states: { 0: 'OFF', 1: 'ON', 2: 'Error' },
    },

    // room units and sensors
    'IODEVICE.#.IODEVICE_TYPE': {
        name: t('Device type', 'Gerätetyp'),
        type: 'string',
        role: 'state',
        conv: 'str',
        states: {
            0: 'Display Radio',
            1: 'Analog Radio',
            2: 'Display BUS',
            3: 'Analog BUS',
            4: 'Room Sensor Radio',
            5: 'Window Sensor Radio',
            6: 'Room Sensor BUS',
            7: 'Window Switch BUS',
            8: 'Virtual Room',
        },
    },
    'IODEVICE.#.IODEVICE_ID': { name: t('Device number', 'Gerätenummer'), type: 'string', role: 'state', conv: 'str' },
    'IODEVICE.#.IODEVICE_VERS_SW': {
        name: t('Firmware', 'Firmware'),
        type: 'string',
        role: 'info.firmware',
        conv: 'str',
    },
    'IODEVICE.#.HEATAREA_NR': { name: t('Heat area', 'Heizkreis'), type: 'string', role: 'state', conv: 'str' },
    'IODEVICE.#.SIGNALSTRENGTH': {
        name: t('Signal strength', 'Funksignal'),
        type: 'string',
        role: 'state',
        conv: 'str',
        states: S_LEVEL3,
    },
    'IODEVICE.#.BATTERY': {
        name: t('Battery', 'Batterie'),
        type: 'string',
        role: 'state',
        conv: 'str',
        states: S_LEVEL3,
    },
    'IODEVICE.#.IODEVICE_STATE': {
        name: t('Device state', 'Gerätezustand'),
        type: 'string',
        role: 'state',
        conv: 'str',
        states: S_OKERR,
    },
    'IODEVICE.#.IODEVICE_COMERROR': {
        name: t('Communication error', 'Kommunikationsfehler'),
        type: 'string',
        role: 'state',
        conv: 'str',
        states: S_OKERR,
    },
    'IODEVICE.#.ISON': {
        name: t('Switched on', 'Eingeschaltet'),
        type: 'string',
        role: 'state',
        conv: 'str',
        states: { 0: 'OFF', 1: 'ON' },
    },
    'IODEVICE.#.LOWBAT': {
        name: t('Battery low', 'Batterie schwach'),
        type: 'boolean',
        role: 'indicator.maintenance.lowbat',
        conv: 'bool',
    },
    'IODEVICE.#.UNREACH': {
        name: t('Not reachable', 'Nicht erreichbar'),
        type: 'boolean',
        role: 'indicator.maintenance.unreach',
        conv: 'bool',
    },
};

/** XML element of <Device> → state */
const DEVICE_FIELDS = {
    ID: 'DEVICE.ID',
    NAME: 'DEVICE.NAME',
    TYPE: 'DEVICE.TYPE',
    DATETIME: 'DEVICE.DATETIME',
    TIMEZONE: 'DEVICE.TIMEZONE',
    NTPTIMESYNC: 'DEVICE.NTPSYNC',
    T_HEAT_VACATION: 'DEVICE.T_HEAT_VACATION',
    LOCK_MODE: 'DEVICE.LOCK_MODE',
    MODE: 'DEVICE.MODE',
    COOLING: 'DEVICE.COOLING',
    ECO_INPUT_STATE: 'DEVICE.ECO_INPUT_STATE',
    ANTIFREEZE: 'DEVICE.ANTIFREEZE',
    ANTIFREEZE_TEMP: 'DEVICE.ANTIFREEZE_TEMP',
    SMARTSTART: 'DEVICE.SMARTSTART',
    ERRORCOUNT: 'DEVICE.ERRORCOUNT',
    VERS_SW_STM: 'DEVICE.VERS_SW_STM',
    VERS_SW_ETH: 'DEVICE.VERS_SW_ETH',
    VERS_HW: 'DEVICE.VERS_HW',
};

/** nested XML element → state */
const NESTED_FIELDS = [
    ['PUMP_OUTPUT', 'PUMP_ISACTIVE', 'DEVICE.PUMP'],
    ['RELAIS', 'RELAIS_ISACTIVE', 'DEVICE.RELAIS'],
    ['CLOUD', 'M2MSTATE', 'DEVICE.CLOUD_STATE'],
    ['VACATION', 'VACATION_STATE', 'VACATION.STATE'],
    ['VACATION', 'START_DATE', 'VACATION.START_DATE'],
    ['VACATION', 'START_TIME', 'VACATION.START_TIME'],
    ['VACATION', 'END_DATE', 'VACATION.END_DATE'],
    ['VACATION', 'END_TIME', 'VACATION.END_TIME'],
];

const HEATAREA_TAGS = [
    'HEATAREA_NAME',
    'HEATAREA_MODE',
    'T_ACTUAL',
    'T_ACTUAL_EXT',
    'T_TARGET',
    'T_TARGET_BASE',
    'T_TARGET_MIN',
    'T_TARGET_MAX',
    'T_HEAT_DAY',
    'T_HEAT_NIGHT',
    'T_COOL_DAY',
    'T_COOL_NIGHT',
    'OFFSET',
    'HEATAREA_STATE',
    'PROGRAM_SOURCE',
    'PROGRAM_WEEK',
    'PROGRAM_WEEKEND',
    'PARTY',
    'PARTY_REMAININGTIME',
    'PRESENCE',
    'ISLOCKED',
];
const HEATCTRL_TAGS = ['INUSE', 'HEATAREA_NR', 'ACTOR', 'ACTOR_PERCENT', 'HEATCTRL_STATE'];
const IODEVICE_TAGS = [
    'IODEVICE_TYPE',
    'IODEVICE_ID',
    'IODEVICE_VERS_SW',
    'HEATAREA_NR',
    'SIGNALSTRENGTH',
    'BATTERY',
    'IODEVICE_STATE',
    'IODEVICE_COMERROR',
    'ISON',
];

const NR = /^\d{1,3}$/;

/**
 * Definition key of a state id (numbers replaced by #).
 *
 * @param {string} id relative state id
 * @returns {string} key
 */
function keyOf(id) {
    return id
        .split('.')
        .map(p => (NR.test(p) ? '#' : p))
        .join('.');
}

/**
 * Definition of a state.
 *
 * @param {string} id relative state id
 * @returns {(typeof DEFS)[string] | undefined} definition
 */
function definition(id) {
    return DEFS[keyOf(id)];
}

/**
 * Converts XML text according to the definition.
 *
 * @param {string} text XML text
 * @param {'str'|'num'|'bool'} conv conversion
 * @returns {string | number | boolean | undefined} value, undefined if not usable
 */
function convert(text, conv) {
    if (text === undefined) {
        return undefined;
    }
    if (conv === 'str') {
        return text;
    }
    if (text === '') {
        return undefined;
    }
    const n = Number(text);
    if (!Number.isFinite(n)) {
        return undefined;
    }
    return conv === 'bool' ? n !== 0 : n;
}

/**
 * Extracts all known values from a <Device> element.
 *
 * @param {import('./xml').XmlNode} device device element of static.xml, cyclic.xml or dynamic.xml
 * @returns {Map<string, string | number | boolean>} relative state id → value
 */
function extract(device) {
    const out = new Map();
    const put = (id, text) => {
        const def = definition(id);
        if (!def) {
            return;
        }
        const v = convert(text, def.conv);
        if (v !== undefined) {
            out.set(id, v);
        }
    };

    const top = fields(device);
    for (const [tag, id] of Object.entries(DEVICE_FIELDS)) {
        put(id, top[tag]);
    }
    for (const [parent, tag, id] of NESTED_FIELDS) {
        put(id, fields(child(device, parent))[tag]);
    }

    for (const sp of children(child(device, 'PROGRAM'), 'SHIFT_PROGRAM')) {
        const nr = sp.attrs.nr;
        const shift = sp.attrs.shiftingtime;
        if (!NR.test(nr || '') || !NR.test(shift || '')) {
            continue;
        }
        const f = fields(sp);
        put(`PROGRAM.${nr}.${shift}.START`, f.START);
        put(`PROGRAM.${nr}.${shift}.END`, f.END);
    }

    const areas = [];
    for (const ha of children(device, 'HEATAREA')) {
        const nr = ha.attrs.nr;
        if (!NR.test(nr || '')) {
            continue;
        }
        areas.push(nr);
        const f = fields(ha);
        for (const tag of HEATAREA_TAGS) {
            put(`HEATAREA.${nr}.${tag}`, f[tag]);
        }
    }

    const ctrls = children(device, 'HEATCTRL');
    for (const hc of ctrls) {
        const nr = hc.attrs.nr;
        if (!NR.test(nr || '')) {
            continue;
        }
        const f = fields(hc);
        for (const tag of HEATCTRL_TAGS) {
            put(`HEATCTRL.${nr}.${tag}`, f[tag]);
        }
    }
    // HEATCTRL is only part of static.xml; compute "heating" per heat area from it
    if (ctrls.length) {
        for (const nr of areas) {
            const heating = ctrls.some(hc => {
                const f = fields(hc);
                return f.INUSE === '1' && f.HEATAREA_NR === nr && f.ACTOR === '1';
            });
            out.set(`HEATAREA.${nr}.HEATING`, heating);
        }
    }

    for (const io of children(device, 'IODEVICE')) {
        const nr = io.attrs.nr;
        if (!NR.test(nr || '')) {
            continue;
        }
        const f = fields(io);
        for (const tag of IODEVICE_TAGS) {
            put(`IODEVICE.${nr}.${tag}`, f[tag]);
        }
        if (f.BATTERY !== undefined && f.BATTERY !== '') {
            out.set(`IODEVICE.${nr}.LOWBAT`, Number(f.BATTERY) < 2);
        }
        if (f.IODEVICE_COMERROR !== undefined && f.IODEVICE_COMERROR !== '') {
            out.set(`IODEVICE.${nr}.UNREACH`, f.IODEVICE_COMERROR !== '0');
        }
    }
    return out;
}

/**
 * Parent objects of a state id that must exist (folder/channel).
 *
 * @param {string} id relative state id
 * @returns {{id: string, type: 'folder'|'channel'|'device', name: ioBroker.StringOrTranslated}[]} parents, outermost first
 */
function parentsOf(id) {
    const p = id.split('.');
    switch (p[0]) {
        case 'DEVICE':
            return [{ id: 'DEVICE', type: 'device', name: t('Base station', 'Basisstation') }];
        case 'VACATION':
            return [{ id: 'VACATION', type: 'channel', name: t('Vacation', 'Urlaub') }];
        case 'PROGRAM':
            return [
                { id: 'PROGRAM', type: 'folder', name: t('Switching programs', 'Schaltprogramme') },
                { id: `PROGRAM.${p[1]}`, type: 'folder', name: t(`Program ${p[1]}`, `Programm ${p[1]}`) },
                {
                    id: `PROGRAM.${p[1]}.${p[2]}`,
                    type: 'channel',
                    name: t(`Program ${p[1]}, period ${p[2]}`, `Programm ${p[1]}, Zeitraum ${p[2]}`),
                },
            ];
        case 'HEATAREA':
            return [
                { id: 'HEATAREA', type: 'folder', name: t('Heat areas', 'Heizkreise') },
                { id: `HEATAREA.${p[1]}`, type: 'channel', name: t(`Heat area ${p[1]}`, `Heizkreis ${p[1]}`) },
            ];
        case 'HEATCTRL':
            return [
                { id: 'HEATCTRL', type: 'folder', name: t('Actuator outputs', 'Stellantriebe') },
                { id: `HEATCTRL.${p[1]}`, type: 'channel', name: t(`Actuator output ${p[1]}`, `Stellantrieb ${p[1]}`) },
            ];
        case 'IODEVICE':
            return [
                { id: 'IODEVICE', type: 'folder', name: t('Room units', 'Raumbediengeräte') },
                { id: `IODEVICE.${p[1]}`, type: 'channel', name: t(`Room unit ${p[1]}`, `Raumbediengerät ${p[1]}`) },
            ];
        default:
            return [];
    }
}

/**
 * ioBroker common part for a state.
 *
 * @param {string} id relative state id
 * @returns {Partial<ioBroker.StateCommon> | undefined} common
 */
function commonOf(id) {
    const d = definition(id);
    if (!d) {
        return undefined;
    }
    const c = { name: d.name, type: d.type, role: d.role, read: true, write: !!d.write };
    if (d.unit) {
        c.unit = d.unit;
    }
    if (d.states) {
        c.states = d.states;
    }
    return c;
}

module.exports = { extract, definition, commonOf, parentsOf, keyOf, DEFS };
