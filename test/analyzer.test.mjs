import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyFind } from '../src/app/home/analyzer.js';

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
