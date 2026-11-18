'use strict';

/**
 * HTTP access to the Alpha2 base station.
 *
 * The web server of the base station handles one connection at a time; parallel requests are
 * aborted. Like the web interface of the base station, this client therefore never sends a
 * request before the previous one has finished.
 */

const http = require('node:http');

/**
 * Splits the configured address into host and port.
 *
 * @param {string} address IP address or host name, optionally with :port or http://
 * @returns {{host: string, port: number}} target
 */
function parseAddress(address) {
    let s = String(address || '').trim();
    s = s.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!s) {
        throw new Error('no address of the base station configured');
    }
    const v6 = /^\[([^\]]+)\](?::(\d+))?$/.exec(s);
    if (v6) {
        return { host: v6[1], port: v6[2] ? Number(v6[2]) : 80 };
    }
    const m = /^([^:]+)(?::(\d+))?$/.exec(s);
    if (!m) {
        throw new Error(`invalid address "${s}"`);
    }
    const port = m[2] ? Number(m[2]) : 80;
    if (!(port > 0 && port < 65536)) {
        throw new Error(`invalid port in "${s}"`);
    }
    return { host: m[1], port };
}

/**
 * Queue of HTTP requests to one base station.
 */
class Alpha2Client {
    /**
     * @param {object} options options
     * @param {string} options.address address of the base station
     * @param {number} [options.timeout] timeout per request in ms
     */
    constructor(options) {
        const { host, port } = parseAddress(options.address);
        this.host = host;
        this.port = port;
        this.timeout = options.timeout || 5000;
        /** @type {Promise<unknown>} end of the request queue */
        this.queue = Promise.resolve();
        /** number of requests waiting or running */
        this.pending = 0;
        this.closed = false;
        this.active = new Set();
    }

    /**
     * Queues a request; it starts when all earlier requests have finished.
     *
     * @param {'GET'|'POST'} method method
     * @param {string} path path, e.g. /data/static.xml
     * @param {string} [body] request body
     * @returns {Promise<string>} answer
     */
    request(method, path, body) {
        this.pending++;
        const run = this.queue.then(() => this.send(method, path, body));
        this.queue = run.catch(() => undefined);
        return run.finally(() => this.pending--);
    }

    /**
     * @param {string} path path
     * @returns {Promise<string>} answer
     */
    get(path) {
        return this.request('GET', path);
    }

    /**
     * @param {string} path path
     * @param {string} body body
     * @returns {Promise<string>} answer
     */
    post(path, body) {
        return this.request('POST', path, body);
    }

    /**
     * Sends one request.
     *
     * @param {'GET'|'POST'} method method
     * @param {string} path path
     * @param {string} [body] body
     * @returns {Promise<string>} answer
     */
    send(method, path, body) {
        if (this.closed) {
            return Promise.reject(new Error('client closed'));
        }
        return new Promise((resolve, reject) => {
            const headers = { Accept: 'text/xml, */*' };
            const data = body !== undefined ? Buffer.from(body, 'utf8') : undefined;
            if (data) {
                // same content type the web interface of the base station sends
                headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                headers['Content-Length'] = data.length;
            }
            const req = http.request(
                { host: this.host, port: this.port, path, method, headers, agent: false, timeout: this.timeout },
                res => {
                    const chunks = [];
                    res.on('data', c => chunks.push(c));
                    res.on('error', reject);
                    // a connection that breaks off during the answer must not deliver half of it
                    res.on('close', () => {
                        if (!res.complete) {
                            reject(new Error('answer aborted'));
                        }
                    });
                    res.on('end', () => {
                        if (res.statusCode !== 200) {
                            reject(new Error(`${method} ${path}: HTTP ${res.statusCode}`));
                        } else {
                            resolve(Buffer.concat(chunks).toString('utf8'));
                        }
                    });
                },
            );
            this.active.add(req);
            req.on('close', () => this.active.delete(req));
            req.on('timeout', () => req.destroy(new Error(`${method} ${path}: no answer within ${this.timeout} ms`)));
            req.on('error', err => reject(err));
            req.end(data);
        });
    }

    /**
     * Cancels running requests; no new ones are sent.
     */
    close() {
        this.closed = true;
        for (const req of this.active) {
            req.destroy(new Error('client closed'));
        }
    }
}

module.exports = { Alpha2Client, parseAddress };
