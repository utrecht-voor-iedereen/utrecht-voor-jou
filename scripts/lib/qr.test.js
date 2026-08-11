/**
 * Regression test for the hand-rolled QR encoder.
 *
 * The fixtures below were produced once and checked module for module against
 * the reference `qrcode` Python library: 17 payloads x 8 masks = 136 matrices,
 * all identical, and the mask penalty matched qrcode.util.lost_point on every
 * one. The hashes freeze that verified output, so a later edit to the encoder
 * cannot quietly start printing unscannable codes on the hand-outs.
 *
 * Mask selection is deliberately not compared against that library: it scores
 * candidate masks with a blank format area, while this encoder scores the real
 * symbol, like the specification and nayuki's reference implementation.
 *
 * Run with: node scripts/lib/qr.test.js
 */

'use strict';

const crypto = require('crypto');
const { encode, toSvg } = require('./qr');

const BENEFIT_URL = 'https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/nl/beneficio/1/';

const FIXTURES = [
  { text: 'a', version: 1, mask: 5, sha: '963343f04f9af434' },
  { text: 'hallo utrecht', version: 1, mask: 2, sha: 'aa1cb8fa9dd1e3fb' },
  { text: BENEFIT_URL, version: 5, mask: 2, sha: '2246c52c75bfa5e3' },
  {
    text: 'https://utrecht-voor-iedereen.github.io/utrecht-voor-jou/pt-BR/beneficio/51/',
    version: 5,
    mask: 2,
    sha: '08764a17856a4c8f'
  },
  {
    text: 'Boomspiegel adopteren — zelfbeheertegel, gratis planten & aarde',
    version: 5,
    mask: 4,
    sha: '1d5d789e42e10e17'
  },
  { text: 'x'.repeat(108), version: 7, mask: 0, sha: '2f0a49557134b8c0' },
  { text: 'x'.repeat(213), version: 10, mask: 0, sha: '411e70c25a5f10d0' }
];

const failures = [];

function check(label, condition) {
  if (!condition) failures.push(label);
}

function fingerprint(modules) {
  return crypto
    .createHash('sha256')
    .update(modules.map(row => row.join('')).join('|'))
    .digest('hex')
    .slice(0, 16);
}

FIXTURES.forEach(fixture => {
  const result = encode(fixture.text);
  const label = `${fixture.text.slice(0, 24)}… (${Buffer.byteLength(fixture.text)} bytes)`;
  check(`${label}: version ${result.version} != ${fixture.version}`, result.version === fixture.version);
  check(`${label}: mask ${result.mask} != ${fixture.mask}`, result.mask === fixture.mask);
  check(`${label}: matrix hash changed`, fingerprint(result.modules) === fixture.sha);
});

// Structural invariants, so a broken matrix fails with a readable reason
// instead of only a hash mismatch.
const sample = encode(BENEFIT_URL);
const { modules, size } = sample;

check('size does not follow 4 * version + 17', size === sample.version * 4 + 17);
check('matrix is not square', modules.length === size && modules.every(row => row.length === size));
check('matrix holds values other than 0 and 1', modules.every(row => row.every(v => v === 0 || v === 1)));

[[0, 0], [0, size - 7], [size - 7, 0]].forEach(([row, col]) => {
  const corners = modules[row][col] === 1 && modules[row + 6][col] === 1 &&
    modules[row][col + 6] === 1 && modules[row + 6][col + 6] === 1;
  const ring = modules[row + 1][col + 1] === 0 && modules[row + 5][col + 5] === 0;
  const core = modules[row + 3][col + 3] === 1;
  check(`finder pattern at ${row},${col} is malformed`, corners && ring && core);
});

for (let i = 8; i < size - 8; i++) {
  check(`timing pattern breaks at row 6, column ${i}`, modules[6][i] === (i % 2 === 0 ? 1 : 0));
  check(`timing pattern breaks at column 6, row ${i}`, modules[i][6] === (i % 2 === 0 ? 1 : 0));
}

check('the always-dark module is light', modules[size - 8][8] === 1);

// Overflow must throw: a silently truncated URL prints a QR that leads nowhere.
let threw = false;
try {
  encode('x'.repeat(400));
} catch (e) {
  threw = /exceeds version/.test(e.message);
}
check('a payload beyond version 10 does not throw', threw);

const svg = toSvg(BENEFIT_URL, { size: 96, label: 'test' });
check('SVG is missing a viewBox', svg.includes('viewBox="0 0'));
check('SVG has no dark modules', /<path d="M/.test(svg));
check('SVG lacks the quiet zone', svg.includes(`viewBox="0 0 ${size + 8} ${size + 8}"`));

if (failures.length) {
  console.error('❌ QR encoder test failed:');
  failures.forEach(f => console.error('  - ' + f));
  process.exit(1);
}

console.log(`✅ QR encoder: ${FIXTURES.length} fixtures and the structural checks passed.`);
