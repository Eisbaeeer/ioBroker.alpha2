'use strict';

/**
 * Turns a changed ioBroker state into a POST body for data/changes.xml.
 *
 * Only the settings listed here can be written. System commands of the base station
 * (factory reset, network or cloud settings, deleting data) can not be sent by this adapter.
 * Every value is checked before it leaves ioBroker.
 */

const { encode } = require('./xml');

const TEMP_FALLBACK = { min: 5, max: 30 };

/**
 * deviceId ID of the base station (from static.xml)
 *
 * limits target temperature limits of a heat area
 */

/**
 * body XML body for data/changes.xml
 *
 * description short text for the log
 */

/**
 * Rejected command.
 */
class CommandError extends Error {}

/**
 * Number from a state value.
 *
 * @param {unknown} v value
 * @param {string} what name for the error text
 * @returns {number} number
 */
function toNumber(v, what) {
    const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
    if (!Number.isFinite(n)) {
        throw new CommandError(`${what}: "${String(v)}" is not a number`);
    }
    return n;
}

/**
 * Integer within a range.
 *
 * @param {unknown} v value (number, numeric string or boolean)
 * @param {number} min lowest
 * @param {number} max highest
 * @param {string} what name for the error text
 * @returns {number} integer
 */
function toInt(v, min, max, what) {
    const n = typeof v === 'boolean' ? Number(v) : toNumber(v, what);
    if (!Number.isInteger(n) || n < min || n > max) {
        throw new CommandError(`${what}: ${String(v)} is not allowed (${min}…${max})`);
    }
    return n;
}

/**
 * Switch value (true/false, 1/0, "1"/"0", "true"/"false").
 *
 * @param {unknown} v value
 * @param {string} what name for the error text
 * @returns {0 | 1} flag
 */
function toFlag(v, what) {
    if (v === true || v === 1 || v === '1' || v === 'true') {
        return 1;
    }
    if (v === false || v === 0 || v === '0' || v === 'false') {
        return 0;
    }
    throw new CommandError(`${what}: "${String(v)}" is not true/false`);
}

/**
 * Temperature, rounded to 0.1 °C and kept inside the allowed range.
 *
 * @param {unknown} v value
 * @param {{min: number, max: number}} range allowed range
 * @param {string} what name for the error text
 * @returns {{value: string, clamped: boolean}} formatted temperature
 */
function toTemperature(v, range, what) {
    const n = toNumber(v, what);
    const r = Math.round(Math.min(range.max, Math.max(range.min, n)) * 10) / 10;
    return { value: r.toFixed(1), clamped: Math.abs(r - n) > 0.05 };
}

/**
 * Time of a switching program, quarter hours only.
 *
 * @param {unknown} v value
 * @param {boolean} isEnd END also allows 24:00
 * @param {string} what name for the error text
 * @returns {string} hh:mm
 */
function toTime(v, isEnd, what) {
    const s = String(v).trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (m) {
        const h = Number(m[1]);
        const min = Number(m[2]);
        if (((h >= 0 && h <= 23) || (isEnd && h === 24 && min === 0)) && min % 15 === 0 && min < 60) {
            return `${String(h).padStart(2, '0')}:${m[2]}`;
        }
    }
    throw new CommandError(`${what}: "${s}" is not a time in quarter hours (hh:mm, e.g. 06:15)`);
}

/**
 * Calendar date YYYY-MM-DD.
 *
 * @param {unknown} v value
 * @param {string} what name for the error text
 * @returns {string} date
 */
function toDate(v, what) {
    const s = String(v).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
        const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
        if (
            d.getUTCFullYear() === Number(m[1]) &&
            d.getUTCMonth() === Number(m[2]) - 1 &&
            d.getUTCDate() === Number(m[3])
        ) {
            return s;
        }
    }
    throw new CommandError(`${what}: "${s}" is not a date (YYYY-MM-DD)`);
}

/**
 * @param {string} tag element name
 * @param {string | number} value value
 * @returns {string} element
 */
const el = (tag, value) => `<${tag}>${encode(value)}</${tag}>`;

/**
 * Builds the command for a changed state.
 *
 * @param {string} id relative state id, e.g. HEATAREA.1.T_TARGET
 * @param {unknown} value new value
 * @param {CommandContext} ctx context
 * @returns {Command} command
 * @throws {CommandError} if the state can not be written or the value is not allowed
 */
function buildCommand(id, value, ctx) {
    if (!ctx.deviceId) {
        throw new CommandError('ID of the base station is not known yet');
    }
    let inner;
    let description;
    let m;

    if ((m = /^HEATAREA\.(\d{1,3})\.(T_TARGET|T_HEAT_DAY|T_HEAT_NIGHT|T_COOL_DAY|T_COOL_NIGHT)$/.exec(id))) {
        const range = ctx.limits(m[1]) || TEMP_FALLBACK;
        const temp = toTemperature(value, range, id);
        inner = `<HEATAREA nr="${m[1]}">${el(m[2], temp.value)}</HEATAREA>`;
        description = `${id} = ${temp.value} °C${temp.clamped ? ` (limited to ${range.min}…${range.max} °C)` : ''}`;
    } else if (
        (m = /^HEATAREA\.(\d{1,3})\.(HEATAREA_MODE|PROGRAM_WEEK|PROGRAM_WEEKEND|ISLOCKED|PARTY|PRESENCE)$/.exec(id))
    ) {
        const tag = m[2];
        let v;
        if (tag === 'HEATAREA_MODE') {
            v = toInt(value, 0, 2, id);
        } else if (tag === 'PROGRAM_WEEK' || tag === 'PROGRAM_WEEKEND') {
            v = toInt(value, 0, 3, id);
        } else {
            v = toFlag(value, id);
        }
        inner = `<HEATAREA nr="${m[1]}">${el(tag, v)}</HEATAREA>`;
        description = `${id} = ${v}`;
    } else if (id === 'DEVICE.T_HEAT_VACATION') {
        const temp = toTemperature(value, TEMP_FALLBACK, id);
        inner = el('T_HEAT_VACATION', temp.value);
        description = `${id} = ${temp.value} °C${temp.clamped ? ` (limited to ${TEMP_FALLBACK.min}…${TEMP_FALLBACK.max} °C)` : ''}`;
    } else if (id === 'DEVICE.LOCK_MODE') {
        const v = toInt(value, 0, 1, id);
        inner = el('LOCK_MODE', v);
        description = `${id} = ${v}`;
    } else if ((m = /^PROGRAM\.(\d{1,3})\.(\d{1,3})\.(START|END)$/.exec(id))) {
        const time = toTime(value, m[3] === 'END', id);
        inner = `<PROGRAM><SHIFT_PROGRAM nr="${m[1]}" shiftingtime="${m[2]}">${el(m[3], time)}</SHIFT_PROGRAM></PROGRAM>`;
        description = `${id} = ${time}`;
    } else if ((m = /^VACATION\.(START_DATE|END_DATE)$/.exec(id))) {
        const date = toDate(value, id);
        inner = `<VACATION>${el(m[1], date)}</VACATION>`;
        description = `${id} = ${date}`;
    } else if (id === 'VACATION.STATE') {
        if (toFlag(value, id) === 1) {
            throw new CommandError('VACATION.STATE: start a vacation with VACATION.START_DATE and VACATION.END_DATE');
        }
        // same as "end vacation" in the web interface of the base station
        inner = `<VACATION>${el('VACATION_STATE', 0)}${el('START_DATE', '2000-00-00')}${el('END_DATE', '2000-00-00')}</VACATION>`;
        description = 'vacation ended';
    } else {
        throw new CommandError(`${id} can not be written`);
    }

    return {
        body: `<?xml version="1.0" encoding="UTF-8"?><Devices><Device>${el('ID', ctx.deviceId)}${inner}</Device></Devices>`,
        description,
    };
}

module.exports = { buildCommand, CommandError };
