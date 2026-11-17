'use strict';

/*
 * ioBroker adapter for the Möhlenhoff Alpha 2 underfloor heating control (base station EZR).
 * Reads and writes the local XML API of the base station, no cloud needed.
 */

const utils = require('@iobroker/adapter-core');
const { Alpha2Client } = require('./lib/client');
const { deviceOf } = require('./lib/xml');
const { extract, commonOf, parentsOf } = require('./lib/mapping');
const { buildCommand, buildTimeCommand, CommandError } = require('./lib/commands');
const { CHECK_EVERY_MS, compareClock, describeOffset, formatDeviceTime } = require('./lib/clock');

const PATH_STATIC = '/data/static.xml';
const PATH_CYCLIC = '/data/cyclic.xml';
const PATH_CHANGES = '/data/changes.xml';
/** after this many failed requests in a row the base station counts as offline */
const FAILURES_UNTIL_OFFLINE = 3;
/** longest pause between attempts while the base station does not answer */
const MAX_BACKOFF_MS = 5 * 60 * 1000;
/** the base station needs a moment until a change shows up in static.xml */
const READBACK_DELAY_MS = 2000;
/** writable temperatures that get min/max of their heat area */
const LIMITED_TEMPS = ['T_TARGET', 'T_HEAT_DAY', 'T_HEAT_NIGHT'];

/**
 * @param {number} v value
 * @param {number} min lowest
 * @param {number} max highest
 * @returns {number} value within min…max
 */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

class Alpha2 extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options] adapter options
     */
    constructor(options = {}) {
        super({ ...options, name: 'alpha2' });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));

        this.client = null;
        this.pollTimer = undefined;
        this.stopping = false;
        this.pollMs = 10000;
        this.staticMs = 30000;
        this.lastStatic = 0;
        this.failures = 0;
        this.reachable = false;
        this.everConnected = false;
        this.deviceId = '';
        /** set the clock of the base station when it is wrong */
        this.syncClock = false;
        this.lastClockCheck = 0;
        /** target temperature limits per heat area */
        this.limits = new Map();
        /** last value written with ack per state */
        this.values = new Map();
        /** objects checked in this run */
        this.known = new Set();
        /** channel name per heat area */
        this.areaNames = new Map();
        /** newest unsent value per state */
        this.pendingWrites = new Map();
        /** all access to the base station runs one after another */
        this.queue = Promise.resolve();
    }

    async onReady() {
        await this.setStateAsync('info.connection', false, true);

        const cfg = this.config;
        const address = String(cfg.host || '').trim();
        this.pollMs = clamp(Number(cfg.polltime) || 10000, 2000, 3600000);
        this.staticMs = clamp((Number(cfg.staticInterval) || 30) * 1000, 10000, 3600000);
        const timeout = clamp(Number(cfg.timeout) || 5000, 1000, 30000);
        this.syncClock = cfg.syncTime === true || cfg.syncTime === 'true';

        if (!address) {
            this.log.error('Please enter the IP address of the Alpha2 base station in the adapter settings.');
            return;
        }
        try {
            this.client = new Alpha2Client({ address, timeout });
        } catch (e) {
            this.log.error(e instanceof Error ? e.message : String(e));
            return;
        }
        this.log.info(
            `Base station ${this.client.host}:${this.client.port}: values every ${this.pollMs / 1000} s, ` +
                `actuators and settings every ${this.staticMs / 1000} s${
                    this.syncClock ? ', clock is set when it is wrong' : ''
                }`,
        );

        await this.subscribeStatesAsync('*');
        await this.poll();
    }

    /**
     * Runs a task after all earlier tasks; keeps the queue alive on errors.
     *
     * @template T
     * @param {() => Promise<T>} fn task
     * @returns {Promise<T>} result
     */
    serial(fn) {
        const run = this.queue.then(fn);
        this.queue = run.catch(() => undefined);
        return run;
    }

    /**
     * One polling step, then schedules the next one.
     */
    async poll() {
        this.pollTimer = undefined;
        if (this.stopping) {
            return;
        }
        const full = Date.now() - this.lastStatic >= this.staticMs;
        try {
            await this.serial(() => this.refresh(full));
            await this.onSuccess();
        } catch (e) {
            await this.onFailure(e);
        }
        if (!this.stopping) {
            const delay = this.failures
                ? Math.min(this.pollMs * 2 ** Math.min(this.failures - 1, 10), MAX_BACKOFF_MS)
                : this.pollMs;
            this.pollTimer = this.setTimeout(() => this.poll(), delay);
        }
    }

    /**
     * Reads static.xml (everything) or cyclic.xml (live values) and updates the states.
     * Must run inside {@link serial}.
     *
     * @param {boolean} full read static.xml
     */
    async refresh(full) {
        if (!this.client) {
            throw new Error('no connection configured');
        }
        const xml = await this.client.get(full ? PATH_STATIC : PATH_CYCLIC);
        const receivedAt = Date.now();
        const values = extract(deviceOf(xml));
        if (full && !values.has('DEVICE.ID')) {
            throw new Error('static.xml contains no device ID');
        }
        await this.apply(values);
        if (full) {
            this.lastStatic = Date.now();
        }
        if (this.syncClock && values.has('DEVICE.DATETIME')) {
            await this.checkClock(values.get('DEVICE.DATETIME'), receivedAt);
        }
    }

    /**
     * Compares the clock of the base station with ioBroker once an hour and sets it if it is wrong.
     * Does nothing while the base station syncs its clock via NTP itself. Runs inside {@link serial}.
     *
     * @param {unknown} deviceTime DATETIME of the base station
     * @param {number} receivedAt time of ioBroker when the answer arrived
     */
    async checkClock(deviceTime, receivedAt) {
        if (receivedAt - this.lastClockCheck < CHECK_EVERY_MS || !this.client || !this.deviceId) {
            return;
        }
        this.lastClockCheck = receivedAt;
        if (this.values.get('DEVICE.NTPSYNC') === true) {
            this.log.debug('Clock: the base station syncs via NTP itself');
            return;
        }
        const result = compareClock(deviceTime, new Date(receivedAt));
        if (!result.set) {
            this.log.debug(
                `Clock: ${result.reason}${result.offset === null ? '' : ` (${describeOffset(result.offset)})`}`,
            );
            return;
        }
        // full seconds, the base station has no finer resolution
        const time = formatDeviceTime(new Date(Math.round(Date.now() / 1000) * 1000));
        try {
            const cmd = buildTimeCommand(this.deviceId, time);
            await this.client.post(PATH_CHANGES, cmd.body);
            this.log.info(`Clock of the base station set to ${time} (was ${describeOffset(result.offset ?? 0)})`);
        } catch (e) {
            // tried again in an hour
            this.log.warn(`Could not set the clock of the base station: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Writes changed values with ack and keeps objects up to date.
     *
     * @param {Map<string, string | number | boolean>} values relative state id → value
     */
    async apply(values) {
        const id = values.get('DEVICE.ID');
        if (typeof id === 'string' && id) {
            this.deviceId = id;
        }

        const changedLimits = new Set();
        for (const [key, v] of values) {
            const m = /^HEATAREA\.(\d+)\.T_TARGET_MIN$/.exec(key);
            const max = m && values.get(`HEATAREA.${m[1]}.T_TARGET_MAX`);
            if (m && typeof v === 'number' && typeof max === 'number' && v < max) {
                const old = this.limits.get(m[1]);
                if (!old || old.min !== v || old.max !== max) {
                    this.limits.set(m[1], { min: v, max });
                    changedLimits.add(m[1]);
                }
            }
        }

        for (const [key, v] of values) {
            if (this.stopping) {
                return;
            }
            await this.ensureObject(key);
            if (this.values.get(key) !== v) {
                await this.setStateAsync(key, { val: v, ack: true });
                this.values.set(key, v);
            }
            const m = /^HEATAREA\.(\d+)\.HEATAREA_NAME$/.exec(key);
            if (m && typeof v === 'string' && v && this.areaNames.get(m[1]) !== v) {
                await this.extendObjectAsync(`HEATAREA.${m[1]}`, { common: { name: v } });
                this.areaNames.set(m[1], v);
            }
        }

        for (const nr of changedLimits) {
            const { min, max } = this.limits.get(nr);
            for (const tag of LIMITED_TEMPS) {
                const sid = `HEATAREA.${nr}.${tag}`;
                if (this.known.has(sid)) {
                    await this.extendObjectAsync(sid, { common: { min, max } });
                }
            }
        }
    }

    /**
     * Creates or updates the object of a state (and its parents) once per run.
     * extendObject keeps settings such as history/InfluxDB and existing aliases.
     *
     * @param {string} id relative state id
     */
    async ensureObject(id) {
        if (this.known.has(id)) {
            return;
        }
        for (const p of parentsOf(id)) {
            if (!this.known.has(p.id)) {
                await this.setObjectNotExistsAsync(p.id, { type: p.type, common: { name: p.name }, native: {} });
                this.known.add(p.id);
            }
        }
        const common = commonOf(id);
        if (common) {
            await this.extendObjectAsync(id, { type: 'state', common, native: {} });
        }
        this.known.add(id);
    }

    /**
     * @param {string} fullId state id
     * @param {ioBroker.State | null | undefined} state state
     */
    onStateChange(fullId, state) {
        if (!state || state.ack || this.stopping || !fullId.startsWith(`${this.namespace}.`)) {
            return;
        }
        const id = fullId.slice(this.namespace.length + 1);
        if (id.startsWith('info.')) {
            return;
        }
        // a slider sends many values; only the newest one waiting for its turn is sent
        const queued = this.pendingWrites.has(id);
        this.pendingWrites.set(id, state.val);
        if (!queued) {
            this.serial(() => this.runCommand(id)).catch(e =>
                this.log.error(`Command ${id}: ${e instanceof Error ? e.message : String(e)}`),
            );
        }
    }

    /**
     * Sends the newest value of a state to the base station and reads the result back.
     * Runs inside {@link serial}.
     *
     * @param {string} id relative state id
     */
    async runCommand(id) {
        if (!this.pendingWrites.has(id) || this.stopping || !this.client) {
            return;
        }
        const value = this.pendingWrites.get(id);
        this.pendingWrites.delete(id);

        if (!this.deviceId) {
            try {
                await this.refresh(true);
            } catch {
                // reported below as "ID not known yet"
            }
        }

        let cmd;
        try {
            cmd = buildCommand(id, value, { deviceId: this.deviceId, limits: nr => this.limits.get(nr) });
        } catch (e) {
            if (e instanceof CommandError) {
                this.log.warn(`Not sent: ${e.message}`);
                await this.restore(id);
                return;
            }
            throw e;
        }

        try {
            await this.client.post(PATH_CHANGES, cmd.body);
            this.log.info(`Sent: ${cmd.description}`);
        } catch (e) {
            this.log.warn(`Could not send ${cmd.description}: ${e instanceof Error ? e.message : String(e)}`);
            await this.restore(id);
            return;
        }

        // the next answer confirms the value with ack (or shows what the base station made of it)
        this.values.delete(id);
        if (this.pendingWrites.size) {
            return; // the last command of a series reads back
        }
        await this.wait(READBACK_DELAY_MS);
        if (this.stopping) {
            return;
        }
        try {
            await this.refresh(true);
            await this.onSuccess();
        } catch (e) {
            await this.onFailure(e);
        }
    }

    /**
     * Shows the last value of the base station again after a rejected command.
     *
     * @param {string} id relative state id
     */
    async restore(id) {
        const v = this.values.get(id);
        if (v !== undefined) {
            await this.setStateAsync(id, { val: v, ack: true });
        }
    }

    /**
     * @param {number} ms pause
     * @returns {Promise<void>} resolves after the pause
     */
    wait(ms) {
        return new Promise(resolve => {
            this.setTimeout(() => resolve(), ms);
        });
    }

    async onSuccess() {
        if (this.failures >= FAILURES_UNTIL_OFFLINE) {
            this.log.info('Base station answers again');
        }
        this.failures = 0;
        this.everConnected = true;
        if (!this.reachable) {
            this.reachable = true;
            await this.setStateAsync('info.connection', true, true);
        }
    }

    /**
     * @param {unknown} err error
     */
    async onFailure(err) {
        if (this.stopping) {
            return;
        }
        this.failures++;
        const msg = err instanceof Error ? err.message : String(err);
        if (this.failures === FAILURES_UNTIL_OFFLINE || (!this.everConnected && this.failures === 1)) {
            this.log.warn(`Base station not reachable: ${msg}`);
        } else {
            this.log.debug(`Request failed (${this.failures}× in a row): ${msg}`);
        }
        if (this.failures >= FAILURES_UNTIL_OFFLINE && this.reachable) {
            this.reachable = false;
            await this.setStateAsync('info.connection', false, true);
        }
    }

    /**
     * @param {() => void} callback done
     */
    onUnload(callback) {
        try {
            this.stopping = true;
            if (this.pollTimer) {
                this.clearTimeout(this.pollTimer);
            }
            this.client?.close();
            this.setState('info.connection', false, true);
        } finally {
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = options => new Alpha2(options);
} else {
    new Alpha2();
}
