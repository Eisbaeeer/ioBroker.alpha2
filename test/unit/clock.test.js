'use strict';

const assert = require('node:assert/strict');
const { parseDeviceTime, formatDeviceTime, nearTimeChange, compareClock, describeOffset } = require('../../lib/clock');
const { buildTimeCommand, CommandError } = require('../../lib/commands');

describe('clock', () => {
    let tz;
    before(() => {
        // summer time rules of Central Europe, independent of the machine running the tests
        tz = process.env.TZ;
        process.env.TZ = 'Europe/Berlin';
    });
    after(() => {
        if (tz === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = tz;
        }
    });

    it('reads the time of the base station as local time', () => {
        const d = parseDeviceTime('2025-01-15T10:24:40');
        assert.ok(d);
        assert.deepEqual(
            [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()],
            [2025, 0, 15, 10, 24, 40],
        );
        assert.equal(d.toISOString(), '2025-01-15T09:24:40.000Z');
    });

    it('rejects broken times', () => {
        for (const t of [
            '',
            null,
            undefined,
            42,
            '2025-01-15 10:24:40',
            '2026-13-01T00:00:00',
            '2026-02-30T10:00:00',
            '2025-01-15T24:00:00',
            '2000-00-00T00:00:00',
        ]) {
            assert.equal(parseDeviceTime(t), null, String(t));
        }
    });

    it('formats like the base station', () => {
        assert.equal(formatDeviceTime(new Date(2026, 0, 5, 7, 8, 9)), '2026-01-05T07:08:09');
        assert.equal(formatDeviceTime(parseDeviceTime('2025-01-15T10:24:40')), '2025-01-15T10:24:40');
    });

    it('sets the clock only when it is more than 30 s wrong', () => {
        const now = new Date(2025, 0, 15, 12, 0, 0);
        assert.deepEqual(compareClock('2025-01-15T12:00:30', now), {
            set: false,
            offset: 30,
            reason: 'clock is right',
        });
        assert.equal(compareClock('2025-01-15T11:59:31', now).set, false);
        assert.deepEqual(compareClock('2025-01-15T11:59:15', now), { set: true, offset: -45, reason: '' });
        assert.deepEqual(compareClock('2025-01-15T13:00:00', now), { set: true, offset: 3600, reason: '' });
        const unknown = compareClock('garbage', now);
        assert.equal(unknown.set, false);
        assert.equal(unknown.offset, null);
    });

    it('does not set the clock around the change between summer and winter time', () => {
        // winter time 2026 starts on 25 October at 03:00 summer time (01:00 UTC)
        assert.equal(nearTimeChange(new Date(Date.UTC(2026, 9, 25, 0, 30))), true);
        assert.equal(nearTimeChange(new Date(Date.UTC(2026, 9, 25, 3, 30))), true);
        assert.equal(nearTimeChange(new Date(Date.UTC(2026, 9, 25, 6, 0))), false);
        assert.equal(nearTimeChange(new Date(Date.UTC(2025, 0, 15, 12, 0))), false);
        // 01:00 summer time, two hours before the change; the base station is 10 min ahead
        const now = new Date(Date.UTC(2026, 9, 24, 23, 0));
        const result = compareClock(formatDeviceTime(new Date(now.getTime() + 600 * 1000)), now);
        assert.equal(result.offset, 600);
        assert.equal(result.set, false);
        assert.match(result.reason, /summer/);
    });

    it('describes the offset for the log', () => {
        assert.equal(describeOffset(-45), '45 s behind');
        assert.equal(describeOffset(3600), '60 min ahead');
    });

    it('builds the command to set the clock', () => {
        assert.equal(
            buildTimeCommand('EZR012345', '2025-01-15T10:30:00').body,
            '<?xml version="1.0" encoding="UTF-8"?><Devices><Device><ID>EZR012345</ID>' +
                '<DATETIME>2025-01-15T10:30:00</DATETIME></Device></Devices>',
        );
        assert.throws(() => buildTimeCommand('', '2025-01-15T10:30:00'), CommandError);
        assert.throws(() => buildTimeCommand('EZR012345', '2025-01-15T10:30'), CommandError);
        assert.throws(() => buildTimeCommand('EZR012345', '<x/>'), CommandError);
    });
});
