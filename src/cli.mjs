/**
 * CLI harness for the deterministic core.
 *
 *   node cli.mjs "<draft text>"
 *   node cli.mjs --file <path>
 *
 * Prints the six-slot diagnosis, the rewritten skeleton and what to ask first.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rules = require('./rules.cjs');

const args = process.argv.slice(2);
let text = '';
if (args[0] === '--file') text = fs.readFileSync(args[1], 'utf8');
else text = args.join(' ');

if (!text.trim()) {
  console.error('usage: node cli.mjs "<draft text>" | --file <path>');
  process.exit(1);
}

const diag = rules.diagnose(text);
const rw = rules.rewrite(text, diag);

const box = (s) => '  ' + s;

console.log('原话 (%d 字)', diag.chars);
console.log(box(diag.text));
console.log('');
console.log('六格诊断   分数 %d/6   判定 %s', diag.score, diag.verdict);
for (const s of diag.slots) {
  console.log(box((s.present ? '✔' : '✘') + '  ' + s.label.padEnd(5, '　') + (s.present ? '' : '  ← ' + s.why)));
}
console.log('');
console.log('判据可用性: %s', diag.criterionUsable ? '可以判掉一条不合格的' : '不可用（或不存在）');
if (diag.topicSignals.length) console.log('主题式信号: %s', diag.topicSignals.join('；'));
console.log('');
console.log('改写骨架');
console.log(rw.skeleton.split('\n').map(box).join('\n'));
console.log('');
if (rw.askFirst.length) {
  console.log('先问这两条（不要一次问六条）');
  rw.askFirst.forEach((g, i) => console.log(box(`${i + 1}. [${g.label}] ${g.question}`)));
} else {
  console.log('六格已满：不需要提问，直接生成。');
}
if (rw.notes.length) {
  console.log('');
  console.log('备注');
  rw.notes.forEach((n) => console.log(box('· ' + n)));
}
