/**
 * Utrecht Voor Jou — Rolling Review Queue
 *
 * Picks the entries whose lastReviewed is oldest and reports them as the batch
 * due for re-checking. Run monthly by .github/workflows/review-rotation.yml,
 * which turns the list into a GitHub issue.
 *
 * A catalog verified in one sitting shares a single lastReviewed date, so a
 * fixed staleness threshold would flag every entry on the same day. Reviewing a
 * few of the oldest each month spreads the work and keeps the warning meaningful.
 *
 *   node scripts/review-due.js                 # default batch size
 *   node scripts/review-due.js --count=8
 *   node scripts/review-due.js --report=out.md
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'beneficios.json');
const DEFAULT_COUNT = 5;

const arg = name => {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : null;
};

const COUNT = Number(arg('count')) || DEFAULT_COUNT;
const REPORT_FILE = arg('report');

function monthsSince(dateString) {
  const then = new Date(dateString);
  if (Number.isNaN(then.getTime())) return Infinity;
  return (Date.now() - then.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

const catalog = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

const ranked = catalog
  .map(item => ({ item, age: monthsSince(item.lastReviewed) }))
  // An entry already flagged por-verificar is the most valuable to look at, so
  // it jumps the queue regardless of when it was last touched.
  .sort((a, b) => {
    const unverified = x => (x.item.verificationStatus === 'por-verificar' ? 1 : 0);
    const priority = unverified(b) - unverified(a);
    return priority !== 0 ? priority : b.age - a.age;
  });

const due = ranked.slice(0, COUNT);

function buildReport(rows) {
  const lines = [
    `These ${rows.length} entries are next in the rolling review queue.`,
    '',
    'For each one, open its official URL and confirm the amounts, the conditions',
    'and that the scheme still exists. Correct what has changed, set `lastReviewed`',
    'to the date you checked, and mark it `por-verificar` if the source does not',
    'state something the entry claims. Delete the entry if the scheme is gone.',
    '',
    '| Entry | Last reviewed | Status | Official source |',
    '| --- | --- | --- | --- |'
  ];
  rows.forEach(({ item }) => {
    lines.push(
      `| #${item.id} ${item.title.nl} | ${item.lastReviewed} | ${item.verificationStatus} | ${item.officialUrl} |`
    );
  });
  lines.push('');
  lines.push('See CONTRIBUTING.md, "Verify the facts, not just the format".');
  return lines.join('\n');
}

console.log(`📋 ${due.length} of ${catalog.length} entries are due for review:\n`);
due.forEach(({ item, age }) => {
  console.log(
    `  #${item.id} ${item.title.nl}\n     ${item.lastReviewed} (${age.toFixed(1)} months) · ${item.verificationStatus}\n     ${item.officialUrl}`
  );
});

if (REPORT_FILE) {
  fs.writeFileSync(REPORT_FILE, buildReport(due));
  console.log(`\n📝 Report written to ${REPORT_FILE}`);
}
