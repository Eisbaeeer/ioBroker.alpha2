'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseXml, deviceOf, children, fields, encode } = require('../../lib/xml');

const fixture = name => fs.readFileSync(path.join(__dirname, '..', 'fixtures', `${name}.xml`), 'utf8');

describe('xml', () => {
    it('reads the recorded answers of a base station', () => {
        for (const name of ['static', 'cyclic', 'dynamic']) {
            const device = deviceOf(fixture(name));
            assert.equal(device.name, 'Device');
            assert.equal(children(device, 'HEATAREA').length, 5, name);
        }
    });

    it('throws on a cut off answer instead of using half of it', () => {
        const xml = fixture('static');
        for (const cut of [100, Math.floor(xml.length / 2), xml.length - 5]) {
            assert.throws(() => parseXml(xml.slice(0, cut)));
        }
    });

    it('throws on empty or broken answers', () => {
        assert.throws(() => parseXml(''));
        assert.throws(() => parseXml('<html><body>error</html>'));
        assert.throws(() => parseXml('no xml at all'));
        assert.throws(() => deviceOf('<?xml version="1.0"?><Devices></Devices>'));
    });

    it('decodes entities, attributes and empty elements', () => {
        const d = deviceOf(
            '<Devices><Device><NAME>B&#252;ro &amp; Bad &lt;1&gt;</NAME><X/><HEATAREA nr="3"><T>1</T></HEATAREA></Device></Devices>',
        );
        assert.equal(fields(d).NAME, 'Büro & Bad <1>');
        assert.equal(fields(d).X, '');
        assert.equal(children(d, 'HEATAREA')[0].attrs.nr, '3');
    });

    it('encodes values for the POST body', () => {
        assert.equal(encode('a<b>&"\''), 'a&lt;b&gt;&amp;&quot;&apos;');
        assert.equal(encode(21.5), '21.5');
    });
});
