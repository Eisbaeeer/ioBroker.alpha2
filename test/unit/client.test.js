'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { Alpha2Client, parseAddress } = require('../../lib/client');
const { FakeAlpha2 } = require('../fake-device');

describe('client', () => {
    it('understands the address formats', () => {
        assert.deepEqual(parseAddress('192.168.1.100'), { host: '192.168.1.100', port: 80 });
        assert.deepEqual(parseAddress(' 192.168.1.100:8080 '), { host: '192.168.1.100', port: 8080 });
        assert.deepEqual(parseAddress('http://alpha2.local/'), { host: 'alpha2.local', port: 80 });
        assert.deepEqual(parseAddress('[fe80::1]:81'), { host: 'fe80::1', port: 81 });
        assert.throws(() => parseAddress(''));
        assert.throws(() => parseAddress('1.2.3.4:99999'));
    });

    describe('with a simulated base station', () => {
        let fake;
        let client;
        beforeEach(async () => {
            fake = new FakeAlpha2({ delay: 30 });
            const port = await fake.start();
            client = new Alpha2Client({ address: `127.0.0.1:${port}`, timeout: 2000 });
        });
        afterEach(async () => {
            client.close();
            await fake.stop();
        });

        it('sends requests strictly one after another', async () => {
            const answers = await Promise.all([
                client.get('/data/cyclic.xml'),
                client.get('/data/static.xml'),
                client.post('/data/changes.xml', '<x/>'),
                client.get('/data/cyclic.xml'),
                client.get('/data/dynamic.xml'),
            ]);
            assert.equal(answers.length, 5);
            assert.equal(fake.maxActive, 1);
            assert.equal(fake.rejected, 0);
            assert.deepEqual(
                fake.requests.map(r => r.path),
                ['/data/cyclic.xml', '/data/static.xml', '/data/changes.xml', '/data/cyclic.xml', '/data/dynamic.xml'],
            );
            assert.equal(client.pending, 0);
        });

        it('sends the POST body completely', async () => {
            const body =
                '<?xml version="1.0" encoding="UTF-8"?><Devices><Device><ID>EZR012345</ID><HEATAREA nr="1"><T_TARGET>21.4</T_TARGET></HEATAREA></Device></Devices>';
            await client.post('/data/changes.xml', body);
            assert.deepEqual(fake.posts, [body]);
            assert.match(await client.get('/data/static.xml'), /<T_TARGET>21.4<\/T_TARGET>/);
        });

        it('gives up after the timeout and goes on with the next request', async () => {
            fake.delay = 400;
            const short = new Alpha2Client({ address: `127.0.0.1:${fake.server.address().port}`, timeout: 100 });
            await assert.rejects(short.get('/data/cyclic.xml'), /no answer within 100 ms/);
            fake.delay = 0;
            await new Promise(r => setTimeout(r, 450));
            assert.match(await short.get('/data/cyclic.xml'), /<Devices>/);
            short.close();
        });

        it('reports HTTP errors and a switched off base station', async () => {
            await assert.rejects(client.get('/data/nothing.xml'), /HTTP 404/);
            fake.down = true;
            await assert.rejects(client.get('/data/cyclic.xml'));
        });
    });

    it('rejects an answer that breaks off and goes on with the next request', async () => {
        let cut = true;
        const server = http.createServer((req, res) => {
            if (!cut) {
                res.end('<Devices></Devices>');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/xml', 'Content-Length': 1000 });
            res.write('<Devices><Device>');
            setTimeout(() => res.socket?.destroy(), 20);
        });
        await new Promise(r => server.listen(0, '127.0.0.1', () => r(undefined)));
        const client = new Alpha2Client({ address: `127.0.0.1:${server.address().port}`, timeout: 2000 });
        try {
            await assert.rejects(client.get('/data/cyclic.xml'), /aborted/);
            cut = false;
            assert.equal(await client.get('/data/cyclic.xml'), '<Devices></Devices>');
        } finally {
            client.close();
            await new Promise(r => server.close(() => r(undefined)));
        }
    });
});
