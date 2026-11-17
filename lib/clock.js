'use strict';

/**
 * Clock of the base station.
 *
 * The base station keeps local time. Without its own NTP sync (switched off by default) the clock
 * drifts. The adapter can compare it with the clock of ioBroker and set it. Both clocks show
 * local time of the same place.
 */

/** allowed difference before the clock is set */
const MAX_OFFSET_S = 30;
/** how often the clock is compared */
const CHECK_EVERY_MS = 60 * 60 * 1000;
/** no setting this close to a change between summer and winter time */
const TIME_CHANGE_GUARD_MS = 3 * 60 * 60 * 1000;

const pad = n => String(n).padStart(2, '0');

/**
 * Reads the time of the base station ("YYYY-MM-DDTHH:MM:SS", local time).
 *
 * @param {unknown} text DATETIME from the base station
 * @returns {Date | null} time, or null if the text is no valid time
 */
function parseDeviceTime(text) {
    const m = typeof text === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(text.trim());
    if (!m) {
        return null;
    }
    const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
    const date = new Date(y, mo - 1, d, h, mi, s);
    const same =
        date.getFullYear() === y &&
        date.getMonth() === mo - 1 &&
        date.getDate() === d &&
        date.getHours() === h &&
        date.getMinutes() === mi &&
        date.getSeconds() === s;
    return same ? date : null;
}

/**
 * Formats a time like the base station does (local time, full seconds).
 *
 * @param {Date} date time
 * @returns {string} "YYYY-MM-DDTHH:MM:SS"
 */
function formatDeviceTime(date) {
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

/**
 * True if summer or winter time starts or ends within a few hours.
 *
 * @param {Date} now time
 * @returns {boolean} close to a time change
 */
function nearTimeChange(now) {
    const t = now.getTime();
    const before = new Date(t - TIME_CHANGE_GUARD_MS).getTimezoneOffset();
    const after = new Date(t + TIME_CHANGE_GUARD_MS).getTimezoneOffset();
    return before !== after;
}

/**
 * Compares the clock of the base station with the clock of ioBroker.
 *
 * @param {unknown} deviceText DATETIME from the base station
 * @param {Date} now time of ioBroker when the answer arrived
 * @returns {{ set: boolean, offset: number | null, reason: string }} offset in s (positive: base station is ahead)
 */
function compareClock(deviceText, now) {
    const device = parseDeviceTime(deviceText);
    if (!device) {
        return { set: false, offset: null, reason: `time of the base station unknown ("${String(deviceText)}")` };
    }
    const offset = Math.round((device.getTime() - now.getTime()) / 1000);
    if (Math.abs(offset) <= MAX_OFFSET_S) {
        return { set: false, offset, reason: 'clock is right' };
    }
    if (nearTimeChange(now)) {
        return { set: false, offset, reason: 'summer/winter time changes soon' };
    }
    return { set: true, offset, reason: '' };
}

/**
 * Describes an offset for the log.
 *
 * @param {number} offset seconds, positive: base station is ahead
 * @returns {string} e.g. "45 s behind"
 */
function describeOffset(offset) {
    const abs = Math.abs(offset);
    const amount = abs >= 120 ? `${Math.round(abs / 60)} min` : `${abs} s`;
    return `${amount} ${offset > 0 ? 'ahead' : 'behind'}`;
}

module.exports = {
    MAX_OFFSET_S,
    CHECK_EVERY_MS,
    parseDeviceTime,
    formatDeviceTime,
    nearTimeChange,
    compareClock,
    describeOffset,
};
