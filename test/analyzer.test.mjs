import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyFind, extractAmount } from '../src/app/analyzer.js';

const foodList = [
  { name: 'Tavuk Göğsü' },
  { name: 'Dana Beyin (Pişmiş)' },
  { name: 'Nachos' },
];

test('phrase with extra word yedim matches tavuk göğsü', () => {
  const matches = fuzzyFind(foodList, 'tavuk göğüsü yedim');
  assert.ok(matches.length > 0, 'no matches returned');
  assert.equal(matches[0].name, 'Tavuk Göğsü');
});

test('phrase with extra word içtim matches tavuk göğsü', () => {
  const matches = fuzzyFind(foodList, 'tavuk göğüsü içtim');
  assert.ok(matches.length > 0, 'no matches returned');
  assert.equal(matches[0].name, 'Tavuk Göğsü');
});

test('extractAmount handles portion keywords', () => {
  const grams = extractAmount('3 adet elma', 90);
  assert.equal(grams, 270);
});

test('extractAmount handles gram keywords without space', () => {
  assert.equal(extractAmount('200gram tavuk'), 200);
});

test('extractAmount handles kilogram with fraction', () => {
  assert.equal(extractAmount('1/2 kg et'), 500);
});

test('extractAmount handles yarım keyword', () => {
  assert.equal(extractAmount('yarım dilim kek', 80), 40);
});

test('fuzzyFind ignores portion keywords', () => {
  const matches = fuzzyFind(foodList, '3 dilim tavuk göğsü');
  assert.ok(matches.length > 0);
  assert.equal(matches[0].name, 'Tavuk Göğsü');
});

test('fuzzyFind tolerates keyword typos', () => {
  const matches = fuzzyFind(foodList, '2 tabka tavuk göğsü');
  assert.ok(matches.length > 0);
  assert.equal(matches[0].name, 'Tavuk Göğsü');
});

test('extractAmount handles typo in gram keyword', () => {
  assert.equal(extractAmount('200 gra tavuk'), 200);
});

test('extractAmount handles typo in portion keyword', () => {
  assert.equal(extractAmount('2 poriyon kek', 50), 100);
});
