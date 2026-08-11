/**
 * Utrecht Voor Jou — minimal QR encoder (byte mode, error correction level M).
 *
 * The printable hand-outs need a QR per benefit so someone can leave the paper
 * sheet with the URL in their pocket. Pulling in a QR library would be the
 * obvious move, but devDependencies is deliberately empty and the build runs on
 * bare Node, so the encoder lives here.
 *
 * Scope on purpose: byte mode only, levels M only, versions 1 to 10 (up to 216
 * bytes). Every URL this site generates is around 65 characters, so version 5
 * is the realistic ceiling. encode() throws rather than silently truncating if
 * something longer ever shows up.
 *
 * Verified module-for-module against the reference `qrcode` Python library for
 * every version in range and for the real benefit URLs; see
 * scripts/lib/qr.test.js.
 */

'use strict';

// [data codewords, ec codewords per block, blocks in group 1, blocks in group 2]
// for error correction level M. Group 2 blocks hold one codeword more than
// group 1, which is what the interleaving below relies on.
const VERSIONS = {
  1: { dataCodewords: 16, ecPerBlock: 10, group1: 1, group2: 0 },
  2: { dataCodewords: 28, ecPerBlock: 16, group1: 1, group2: 0 },
  3: { dataCodewords: 44, ecPerBlock: 26, group1: 1, group2: 0 },
  4: { dataCodewords: 64, ecPerBlock: 18, group1: 2, group2: 0 },
  5: { dataCodewords: 86, ecPerBlock: 24, group1: 2, group2: 0 },
  6: { dataCodewords: 108, ecPerBlock: 16, group1: 4, group2: 0 },
  7: { dataCodewords: 124, ecPerBlock: 18, group1: 4, group2: 0 },
  8: { dataCodewords: 154, ecPerBlock: 22, group1: 2, group2: 2 },
  9: { dataCodewords: 182, ecPerBlock: 22, group1: 3, group2: 2 },
  10: { dataCodewords: 216, ecPerBlock: 26, group1: 4, group2: 1 }
};

const ALIGNMENT_POSITIONS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50]
};

// Bits left over after the interleaved codewords, filled with zeros.
const REMAINDER_BITS = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0, 9: 0, 10: 0 };

const MAX_VERSION = 10;
const ECC_LEVEL_M_BITS = 0b00;

/* ---------------------------------------------------------------- GF(256) */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function buildTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // primitive polynomial of QR's field
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function generatorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    // Multiplying by (x + a^i), with index 0 holding the highest degree, so the
    // polynomial stays monic and generator[0] is always 1.
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function reedSolomon(data, ecCount) {
  const generator = generatorPoly(ecCount);
  const remainder = new Array(ecCount).fill(0);

  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        remainder[j] ^= gfMul(generator[j + 1], factor);
      }
    }
  }
  return remainder;
}

/* ------------------------------------------------------------- bit stream */

function charCountBits(version) {
  return version <= 9 ? 8 : 16;
}

function pickVersion(byteLength) {
  for (let version = 1; version <= MAX_VERSION; version++) {
    const capacityBits = VERSIONS[version].dataCodewords * 8;
    const neededBits = 4 + charCountBits(version) + byteLength * 8;
    if (neededBits <= capacityBits) return version;
  }
  throw new Error(
    `QR payload of ${byteLength} bytes exceeds version ${MAX_VERSION} at ECC level M`
  );
}

function buildCodewords(bytes, version) {
  const { dataCodewords } = VERSIONS[version];
  const bits = [];
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4); // byte mode
  push(bytes.length, charCountBits(version));
  bytes.forEach(byte => push(byte, 8));

  const capacityBits = dataCodewords * 8;
  push(0, Math.min(4, capacityBits - bits.length)); // terminator
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  const PAD = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < dataCodewords) {
    codewords.push(PAD[padIndex++ % 2]);
  }
  return codewords;
}

function interleave(codewords, version) {
  const { ecPerBlock, group1, group2 } = VERSIONS[version];
  const totalBlocks = group1 + group2;
  const shortLength = Math.floor(VERSIONS[version].dataCodewords / totalBlocks);

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let block = 0; block < totalBlocks; block++) {
    const length = block < group1 ? shortLength : shortLength + 1;
    const chunk = codewords.slice(offset, offset + length);
    offset += length;
    dataBlocks.push(chunk);
    ecBlocks.push(reedSolomon(chunk, ecPerBlock));
  }

  const result = [];
  const longest = Math.max(...dataBlocks.map(b => b.length));
  for (let i = 0; i < longest; i++) {
    dataBlocks.forEach(block => {
      if (i < block.length) result.push(block[i]);
    });
  }
  for (let i = 0; i < ecPerBlock; i++) {
    ecBlocks.forEach(block => result.push(block[i]));
  }
  return result;
}

/* ---------------------------------------------------------------- modules */

function createMatrix(size) {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

function placeFinder(matrix, reserved, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= matrix.length || cc >= matrix.length) continue;
      const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[rr][cc] = inRing || inCore ? 1 : 0;
      reserved[rr][cc] = true;
    }
  }
}

function placeAlignment(matrix, reserved, version) {
  const positions = ALIGNMENT_POSITIONS[version];
  const size = matrix.length;
  positions.forEach(row => {
    positions.forEach(col => {
      // The three corners already carry finder patterns.
      const nearFinder =
        (row <= 8 && col <= 8) ||
        (row <= 8 && col >= size - 9) ||
        (row >= size - 9 && col <= 8);
      if (nearFinder) return;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
          matrix[row + r][col + c] = dark ? 1 : 0;
          reserved[row + r][col + c] = true;
        }
      }
    });
  });
}

function placeTiming(matrix, reserved) {
  const size = matrix.length;
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0 ? 1 : 0;
    if (!reserved[6][i]) {
      matrix[6][i] = dark;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      matrix[i][6] = dark;
      reserved[i][6] = true;
    }
  }
}

function reserveFormatAreas(matrix, reserved, version) {
  const size = matrix.length;
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
  // Always-dark module below the bottom-left finder.
  matrix[size - 8][8] = 1;
  reserved[size - 8][8] = true;

  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        reserved[i][size - 11 + j] = true;
        reserved[size - 11 + j][i] = true;
      }
    }
  }
}

function placeData(matrix, reserved, codewords, remainderBits) {
  const size = matrix.length;
  const bits = [];
  codewords.forEach(byte => {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  });
  for (let i = 0; i < remainderBits; i++) bits.push(0);

  let index = 0;
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5; // the vertical timing pattern is skipped entirely
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (reserved[row][col]) continue;
        matrix[row][col] = index < bits.length ? bits[index] : 0;
        index++;
      }
    }
    upward = !upward;
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  r => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

function applyMask(matrix, reserved, maskIndex) {
  const size = matrix.length;
  const masked = matrix.map(row => row.slice());
  const rule = MASKS[maskIndex];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      if (rule(r, c)) masked[r][c] ^= 1;
    }
  }
  return masked;
}

function penalty(matrix) {
  const size = matrix.length;
  let score = 0;

  // Rule 1: runs of five or more identical modules in a row or column.
  const runScore = line => {
    let total = 0;
    let run = 1;
    for (let i = 1; i < line.length; i++) {
      if (line[i] === line[i - 1]) {
        run++;
      } else {
        if (run >= 5) total += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) total += 3 + (run - 5);
    return total;
  };
  for (let i = 0; i < size; i++) {
    score += runScore(matrix[i]);
    score += runScore(matrix.map(row => row[i]));
  }

  // Rule 2: 2x2 blocks of one colour.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) {
        score += 3;
      }
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 patterns with four light modules beside them.
  const PATTERN_A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const PATTERN_B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const matches = (line, start, pattern) => {
    for (let i = 0; i < pattern.length; i++) {
      if (line[start + i] !== pattern[i]) return false;
    }
    return true;
  };
  const lines = [];
  for (let i = 0; i < size; i++) {
    lines.push(matrix[i]);
    lines.push(matrix.map(row => row[i]));
  }
  lines.forEach(line => {
    for (let start = 0; start + 11 <= line.length; start++) {
      if (matches(line, start, PATTERN_A) || matches(line, start, PATTERN_B)) score += 40;
    }
  });

  // Rule 4: deviation from an even split of dark and light.
  let dark = 0;
  matrix.forEach(row => row.forEach(v => (dark += v)));
  const ratio = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;

  return score;
}

// BCH(15,5) for the format string and BCH(18,6) for the version string: shift
// the value left one bit at a time and reduce by the generator whenever the bit
// that falls off the top is set.
function bchRemainder(value, generator, degree) {
  let remainder = value;
  for (let i = 0; i < degree; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> (degree - 1)) * generator);
  }
  return remainder;
}

function placeFormatInfo(matrix, maskIndex) {
  const size = matrix.length;
  const raw = (ECC_LEVEL_M_BITS << 3) | maskIndex;
  const format = ((raw << 10) | bchRemainder(raw, 0x537, 10)) ^ 0b101010000010010;
  const bit = i => (format >> i) & 1;

  // First copy, wrapped around the top-left finder.
  for (let i = 0; i <= 5; i++) matrix[i][8] = bit(i);
  matrix[7][8] = bit(6);
  matrix[8][8] = bit(7);
  matrix[8][7] = bit(8);
  for (let i = 9; i <= 14; i++) matrix[8][14 - i] = bit(i);

  // Second copy, split between the other two finders.
  for (let i = 0; i <= 7; i++) matrix[8][size - 1 - i] = bit(i);
  for (let i = 8; i <= 14; i++) matrix[size - 15 + i][8] = bit(i);
}

function placeVersionInfo(matrix, version) {
  if (version < 7) return;
  const size = matrix.length;
  const info = (version << 12) | bchRemainder(version, 0x1f25, 12);
  for (let i = 0; i < 18; i++) {
    const bit = (info >> i) & 1;
    const row = Math.floor(i / 3);
    const col = size - 11 + (i % 3);
    matrix[row][col] = bit;
    matrix[col][row] = bit;
  }
}

/**
 * @param {string} text
 * @returns {{ version: number, size: number, mask: number, modules: number[][] }}
 */
function encode(text, { forcedMask = null } = {}) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const version = pickVersion(bytes.length);
  const size = version * 4 + 17;

  const codewords = interleave(buildCodewords(bytes, version), version);

  const base = createMatrix(size);
  const reserved = createMatrix(size).map(row => row.map(() => false));

  placeFinder(base, reserved, 0, 0);
  placeFinder(base, reserved, 0, size - 7);
  placeFinder(base, reserved, size - 7, 0);
  placeAlignment(base, reserved, version);
  placeTiming(base, reserved);
  reserveFormatAreas(base, reserved, version);
  placeData(base, reserved, codewords, REMAINDER_BITS[version]);

  let best = null;
  const candidates = forcedMask === null ? [0, 1, 2, 3, 4, 5, 6, 7] : [forcedMask];
  for (const maskIndex of candidates) {
    const candidate = applyMask(base, reserved, maskIndex);
    placeFormatInfo(candidate, maskIndex);
    placeVersionInfo(candidate, version);
    const score = penalty(candidate);
    if (!best || score < best.score) best = { score, maskIndex, modules: candidate };
  }

  return { version, size, mask: best.maskIndex, modules: best.modules };
}

/**
 * Renders the matrix as a standalone SVG string: one path for all dark modules,
 * so a sheet with 15 codes stays a few kilobytes. The quiet zone of 4 modules
 * is included because scanners need it and a printed sheet has no margin of its
 * own.
 */
function toSvg(text, { size = 96, label = '' } = {}) {
  const { modules, size: count } = encode(text);
  const quiet = 4;
  const total = count + quiet * 2;

  // Horizontal runs are merged into a single rectangle each: a sheet carries a
  // dozen codes, and one path command per module triples the page weight for
  // the same picture.
  let path = '';
  for (let r = 0; r < count; r++) {
    let c = 0;
    while (c < count) {
      if (!modules[r][c]) {
        c++;
        continue;
      }
      let run = 1;
      while (c + run < count && modules[r][c + run]) run++;
      path += `M${c + quiet} ${r + quiet}h${run}v1h-${run}z`;
      c += run;
    }
  }

  const title = label ? `<title>${label}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" role="img" aria-hidden="${label ? 'false' : 'true'}">${title}<rect width="${total}" height="${total}" fill="#FFFFFF"/><path d="${path}" fill="#000000"/></svg>`;
}

// Exposed so the test can compare the codeword stream, not only the final
// matrix: when a QR is wrong, the stream tells you whether it broke before or
// after Reed-Solomon.
module.exports = { encode, toSvg, _internal: { buildCodewords, interleave, pickVersion, penalty, applyMask } };
