'use strict';

/**
 * Small, strict XML reader for the Alpha2 XML API.
 *
 * The base station delivers plain, well-formed XML: elements, a few attributes (nr, shiftingtime),
 * text and CRLF line breaks. A truncated or garbled answer throws, so it is never applied half.
 */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/**
 * name element name
 *
 * attrs attributes
 *
 * children child elements
 *
 * text text content (not trimmed)
 */

/**
 * Decodes XML entities.
 *
 * @param {string} s raw text
 * @returns {string} decoded text
 */
function decode(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
        if (e[0] === '#') {
            const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
        }
        return ENTITIES[e] ?? all;
    });
}

/**
 * Encodes text for use inside an XML element.
 *
 * @param {string | number} s value
 * @returns {string} escaped text
 */
function encode(s) {
    return String(s).replace(/[&<>"']/g, c => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' }[c]};`);
}

/**
 * Parses the attribute part of a start tag.
 *
 * @param {string} s attribute source
 * @returns {Record<string, string>} attributes
 */
function parseAttrs(s) {
    const attrs = {};
    const re = /([\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let m;
    while ((m = re.exec(s))) {
        attrs[m[1]] = decode(m[2] ?? m[3] ?? '');
    }
    return attrs;
}

const TOKEN =
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;

/**
 * Parses an XML document.
 *
 * @param {string} xml document
 * @returns {XmlNode} artificial root node; the document element is its only child
 */
function parseXml(xml) {
    if (typeof xml !== 'string' || !xml.trim()) {
        throw new Error('empty answer');
    }
    const root = { name: '#root', attrs: {}, children: [], text: '' };
    const stack = [root];
    const re = new RegExp(TOKEN.source, 'g');
    let pos = 0;
    let m;
    while ((m = re.exec(xml))) {
        if (m.index !== pos) {
            break;
        }
        pos = re.lastIndex;
        const top = stack[stack.length - 1];
        if (m[1] !== undefined) {
            top.text += m[1];
        } else if (m[3]) {
            if (m[2]) {
                if (top.name !== m[3]) {
                    throw new Error(`invalid XML: unexpected </${m[3]}> inside <${top.name}>`);
                }
                stack.pop();
            } else {
                const node = { name: m[3], attrs: parseAttrs(m[4] || ''), children: [], text: '' };
                top.children.push(node);
                if (!m[5]) {
                    stack.push(node);
                }
            }
        } else if (m[6] !== undefined) {
            top.text += decode(m[6]);
        }
    }
    if (pos !== xml.length) {
        throw new Error(`invalid XML at position ${pos}`);
    }
    if (stack.length !== 1) {
        throw new Error(`incomplete XML: <${stack[stack.length - 1].name}> is not closed`);
    }
    if (!root.children.length) {
        throw new Error('invalid XML: no element');
    }
    return root;
}

/**
 * First child element with the given name.
 *
 * @param {XmlNode | undefined} node parent
 * @param {string} name element name
 * @returns {XmlNode | undefined} child
 */
function child(node, name) {
    return node?.children.find(c => c.name === name);
}

/**
 * All child elements with the given name.
 *
 * @param {XmlNode | undefined} node parent
 * @param {string} name element name
 * @returns {XmlNode[]} children
 */
function children(node, name) {
    return node ? node.children.filter(c => c.name === name) : [];
}

/**
 * Leaf children (elements without own children) as name → trimmed text.
 *
 * @param {XmlNode | undefined} node parent
 * @returns {Record<string, string>} fields
 */
function fields(node) {
    const out = {};
    for (const c of node?.children || []) {
        if (!c.children.length && !(c.name in out)) {
            out[c.name] = c.text.trim();
        }
    }
    return out;
}

/**
 * Returns the first <Device> of a parsed answer.
 *
 * @param {string} xml answer of static.xml, cyclic.xml or dynamic.xml
 * @returns {XmlNode} device element
 */
function deviceOf(xml) {
    const root = parseXml(xml);
    const top = root.children[0];
    const device = top.name === 'Device' ? top : child(top, 'Device');
    if (!device) {
        throw new Error('answer contains no <Device>');
    }
    return device;
}

module.exports = { parseXml, deviceOf, child, children, fields, encode, decode };
