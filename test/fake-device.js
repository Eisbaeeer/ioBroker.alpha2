'use strict';

/**
 * Simulated Alpha2 base station for tests.
 *
 * Serves the recorded answers from test/fixtures, applies POSTs to data/changes.xml and behaves
 * like the real web server: a second request while one is running is aborted.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const FILES = { '/data/static.xml': 'static', '/data/cyclic.xml': 'cyclic', '/data/dynamic.xml': 'dynamic' };

/**
 * HTTP server that answers like a base station.
 */
class FakeAlpha2 {
    /**
     * @param {object} [options] options
     * @param {number} [options.delay] answer delay in ms
     */
    constructor(options = {}) {
        const dir = path.join(__dirname, 'fixtures');
        this.docs = {};
        for (const name of ['static', 'cyclic', 'dynamic']) {
            this.docs[name] = fs.readFileSync(path.join(dir, `${name}.xml`), 'utf8');
        }
        this.delay = options.delay || 0;
        this.active = 0;
        this.maxActive = 0;
        this.rejected = 0;
        this.requests = [];
        /** answer nothing (base station switched off) */
        this.down = false;
        this.server = http.createServer((req, res) => this.handle(req, res));
    }

    /**
     * @returns {Promise<number>} port
     */
    start() {
        return new Promise(resolve => {
            this.server.listen(0, '127.0.0.1', () => {
                const addr = this.server.address();
                resolve(addr.port);
            });
        });
    }

    /**
     * @returns {Promise<void>} closed
     */
    stop() {
        return new Promise(resolve => {
            this.server.closeAllConnections?.();
            this.server.close(() => resolve());
        });
    }

    /** @returns {string[]} POST bodies received */
    get posts() {
        return this.requests.filter(r => r.method === 'POST').map(r => r.body);
    }

    /**
     * @param {http.IncomingMessage} req request
     * @param {http.ServerResponse} res response
     */
    handle(req, res) {
        if (this.down) {
            req.socket.destroy();
            return;
        }
        if (this.active > 0) {
            this.rejected++;
            req.socket.destroy();
            return;
        }
        this.active++;
        this.maxActive = Math.max(this.maxActive, this.active);
        let done = false;
        const finish = () => {
            if (!done) {
                done = true;
                this.active--;
            }
        };
        res.on('close', finish);

        let body = '';
        req.setEncoding('utf8');
        req.on('data', c => (body += c));
        req.on('end', () => {
            this.requests.push({ method: req.method || '', path: req.url || '', body });
            setTimeout(() => {
                if (req.method === 'GET' && FILES[req.url || '']) {
                    res.writeHead(200, { 'Content-Type': 'text/xml; charset="utf-8"' });
                    res.end(this.docs[FILES[req.url || '']]);
                } else if (req.method === 'POST' && req.url === '/data/changes.xml') {
                    this.apply(body);
                    res.writeHead(200, { 'Content-Type': 'text/xml; charset="utf-8"' });
                    res.end('');
                } else {
                    res.writeHead(404);
                    res.end();
                }
            }, this.delay);
        });
    }

    /**
     * Applies a change to all recorded answers (simple and good enough for the tests).
     *
     * @param {string} body POST body
     */
    apply(body) {
        const set = (scope, tag, value) => {
            for (const name of Object.keys(this.docs)) {
                this.docs[name] = this.docs[name].replace(scope, block =>
                    block.replace(new RegExp(`<${tag}>[^<]*</${tag}>`), `<${tag}>${value}</${tag}>`),
                );
            }
        };
        for (const m of body.matchAll(/<HEATAREA nr="(\d+)">(.*?)<\/HEATAREA>/g)) {
            for (const f of m[2].matchAll(/<(\w+)>([^<]*)<\/\1>/g)) {
                set(new RegExp(`<HEATAREA nr="${m[1]}">[\\s\\S]*?</HEATAREA>`), f[1], f[2]);
            }
        }
        const vac = /<VACATION>(.*?)<\/VACATION>/.exec(body);
        if (vac) {
            for (const f of vac[1].matchAll(/<(\w+)>([^<]*)<\/\1>/g)) {
                set(/<VACATION>[\s\S]*?<\/VACATION>/, f[1], f[2]);
            }
        }
        const top = /<T_HEAT_VACATION>([^<]*)<\/T_HEAT_VACATION>/.exec(body);
        if (top) {
            set(/^[\s\S]*$/, 'T_HEAT_VACATION', top[1]);
        }
        const clock = /<DATETIME>([^<]*)<\/DATETIME>/.exec(body);
        if (clock) {
            set(/^[\s\S]*$/, 'DATETIME', clock[1]);
        }
    }
}

module.exports = { FakeAlpha2 };
