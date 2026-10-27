import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { diagnose, rewrite, hasRejectableCriterion } = require('../src/rules.cjs');

const VAGUE = 'PARA 方法，等相关的方法论，目的是企业协作、经验沉淀';

const PRECISE =
  '我们在做「企业标准→交付前预检」的插件，现在阶段是 L1 编译法设计。' +
  '给我一张选型表：候选方法论 / 用在哪一层 / 具体怎么用 / 局限。' +
  '材料我已经给了思达知识包和 sam-work。' +
  '判据是每条方法论必须能落到「一条条件怎么改写」上。不要综述，不要超过 10 条。';

test('vague prompt scores low and is judged topic-style', () => {
  const d = diagnose(VAGUE);
  assert.equal(d.score, 0);
  assert.equal(d.verdict, 'topic');
  assert.equal(d.missing.length, 6);
  assert.ok(d.topicSignals.length >= 2);
});

test('rewritten prompt fills all six slots', () => {
  const d = diagnose(PRECISE);
  assert.equal(d.score, 6);
  assert.equal(d.verdict, 'process');
  assert.deepEqual(d.missing, []);
});

test('negated 综述 is a boundary, not a topic signal', () => {
  const d = diagnose(PRECISE);
  assert.deepEqual(d.topicSignals, []);
});

test('a criterion needs an action and an artifact, not adjectives', () => {
  assert.equal(hasRejectableCriterion('每条必须能落到一条条件怎么改写上'), true);
  assert.equal(hasRejectableCriterion('每条都要有深度、要全面'), false);
});

test('rewrite asks at most two questions and leaves six placeholders for the vague prompt', () => {
  const r = rewrite(VAGUE);
  assert.ok(r.askFirst.length <= 2);
  assert.equal(r.gaps.length, 6);
  assert.match(r.skeleton, /【判据】/);
  assert.equal((r.skeleton.match(/____/g) || []).length >= 6, true);
});

test('rewrite keeps the user words for filled slots', () => {
  const r = rewrite(PRECISE);
  assert.equal(r.gaps.length, 0);
  assert.match(r.skeleton, /企业标准/);
  assert.match(r.skeleton, /选型表/);
  assert.doesNotMatch(r.skeleton, /【判据】____/);
});

test('empty draft does not crash', () => {
  const d = diagnose('');
  assert.equal(d.score, 0);
  assert.equal(d.verdict, 'topic');
});
