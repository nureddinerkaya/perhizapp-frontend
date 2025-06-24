import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyFind, extractAmount } from '../src/app/home/analyzer.js';

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

test('3 adet with portion 90 returns 270 grams', () => {
  const grams = extractAmount('3 adet tavuk', 90);
  assert.equal(grams, 270);
});

test('200gram returns 200 grams', () => {
  const grams = extractAmount('200gram tavuk');
  assert.equal(grams, 200);
});

test('yarım kg returns 500 grams', () => {
  const grams = extractAmount('yarım kg pirinç');
  assert.equal(grams, 500);
});

test('1/2 paket with portion 100 returns 50 grams', () => {
  const grams = extractAmount('1/2 paket bisküvi', 100);
  assert.equal(grams, 50);
});
