/**
 * Utrecht Voor Jou — Official Link Health Check
 * Requests every officialUrl in the catalog and reports the ones that no longer
 * resolve. Run weekly by .github/workflows/link-check.yml, which turns a failing
 * run into a GitHub issue. Uses the global fetch of Node >= 18, no dependencies.
 *
 *   node scripts/check-links.js              # human readable output
 *   node scripts/check-links.js --report=x.md  # also write a markdown report
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'beneficios.json');
const TIMEOUT_MS = 15000;
const CONCURRENCY = 4;
const USER_AGENT =
  'Mozilla/5.0 (compatible; UtrechtVoorJouLinkCheck/1.0; +https://github.com/utrecht-voor-iedereen/utrecht-voor-jou)';

const reportArg = process.argv.find(a => a.startsWith('--report='));
const REPORT_FILE = reportArg ? reportArg.split('=')[1] : null;

function collectUrls(catalog) {
  // Several entries share an official URL; group them so one dead link is
  // reported once, listing every benefit that depends on it.
  const byUrl = new Map();
  catalog.forEach(item => {
    if (!item.officialUrl) return;
    if (!byUrl.has(item.officialUrl)) byUrl.set(item.officialUrl, []);
    byUrl.get(item.officialUrl).push(item);
  });
  return [...byUrl.entries()].map(([url, items]) => ({ url, items }));
}

async function request(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' }
    });
    return { status: res.status, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url) {
  try {
    let res = await request(url, 'HEAD');
    // Plenty of government servers refuse HEAD outright; confirm with a GET
    // before calling the link dead.
    if (res.status >= 400) {
      res = await request(url, 'GET');
    }
    return { ok: res.status < 400, status: String(res.status), finalUrl: res.finalUrl };
  } catch (err) {
    const reason = err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS / 1000}s` : err.message;
    return { ok: false, status: reason, finalUrl: null };
  }
}

async function runPool(tasks, size) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(size, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const index = cursor++;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

function buildReport(failures) {
  const lines = [
    'The weekly link check could not reach the following official sources.',
    'Each one is linked from the benefit pages listed next to it, so visitors',
    'currently land on a broken page.',
    '',
    '| Status | Official URL | Affected benefits |',
    '| --- | --- | --- |'
  ];
  failures.forEach(f => {
    const affected = f.items.map(i => `#${i.id} ${i.title.nl}`).join('<br>');
    lines.push(`| \`${f.status}\` | ${f.url} | ${affected} |`);
  });
  lines.push('');
  lines.push('Fix by updating `officialUrl` in `data/beneficios.json`, then bump');
  lines.push('`lastReviewed` for the affected entries.');
  lines.push('');
  lines.push(`_Checked on ${new Date().toISOString().slice(0, 10)}._`);
  return lines.join('\n');
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const targets = collectUrls(catalog);

  console.log(`🔗 Checking ${targets.length} unique official URLs from ${catalog.length} catalog entries...`);

  const results = await runPool(
    targets.map(t => async () => ({ ...t, ...(await checkUrl(t.url)) })),
    CONCURRENCY
  );

  const failures = results.filter(r => !r.ok);

  results
    .filter(r => r.ok)
    .forEach(r => console.log(`  ✅ ${r.status}  ${r.url}`));
  failures.forEach(r => console.log(`  ❌ ${r.status}  ${r.url}`));

  if (REPORT_FILE && failures.length > 0) {
    fs.writeFileSync(REPORT_FILE, buildReport(failures));
    console.log(`\n📝 Report written to ${REPORT_FILE}`);
  }

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} of ${targets.length} official URLs are unreachable.`);
    process.exit(1);
  }

  console.log(`\n✅ All ${targets.length} official URLs are reachable.`);
}

main().catch(err => {
  console.error('Link check crashed:', err);
  process.exit(2);
});
