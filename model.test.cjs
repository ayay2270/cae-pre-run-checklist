const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
test('direct checklist opens with Sagging and Shock, distinct colors and original notes', () => {
  const state = M.initial(); M.validate(state);
  assert.equal(state.version, 2); assert.equal('projects' in state, false);
  assert.deepEqual(state.sections.map(s => s.items.length), [7, 2]);
  assert.deepEqual(state.sections.map(s => s.color), ['blue', 'orange']);
  assert.equal(state.sections[0].items[4].note, '標準抓0.01');
});
test('N/A excluded, Critical readiness, empty and all-N/A progress', () => {
  const state = { sections: [M.section('test', [M.item('a'), M.item('b', '', true), M.item('c')])] };
  state.sections[0].items[0].done = true; state.sections[0].items[2].na = true;
  assert.deepEqual(M.progress(state), { done: 1, total: 2, na: 1, percent: 50, blocked: 1, ready: false });
  state.sections[0].items[1].na = true; assert.equal(M.progress(state).percent, 100); assert.equal(M.progress(state).blocked, 0);
  state.sections[0].items.forEach(i => { i.na = true; i.done = false; }); assert.equal(M.progress(state).percent, 100);
  assert.equal(M.progress({ sections: [] }).percent, 0);
});
test('global Reset preserves item edits, notes, colors, Critical and order', () => {
  const state = M.initial(); state.sections[0].items[0].done = true; state.sections[1].items[0].na = true;
  state.sections[0].items[0].critical = true; state.sections[0].items[0].note = 'Keep'; state.sections[1].color = 'purple';
  const before = M.clone(state); M.reset(state);
  before.sections.forEach(s => s.items.forEach(i => { i.done = false; i.na = false; })); assert.deepEqual(state, before);
});
test('section Reset leaves other section untouched', () => {
  const state = M.initial(); state.sections[0].items[0].done = true; state.sections[1].items[0].done = true;
  M.reset({ sections: [state.sections[0]] }); assert.equal(state.sections[0].items[0].done, false); assert.equal(state.sections[1].items[0].done, true);
});
test('item and section reordering and cross-section moves preserve contents', () => {
  const state = M.initial(), source = state.sections[0], target = state.sections[1], i = source.items[0];
  i.done = true; i.note = 'Keep';
  M.move(source.items, i.id, source.items[2].id, true); assert.equal(source.items[2].id, i.id);
  assert.ok(M.moveItem(state, i.id, source.id, target.id)); assert.ok(target.items.at(-1).done); assert.equal(target.items.at(-1).note, 'Keep');
  assert.equal(state.sections.flatMap(s => s.items).length, 9);
  assert.equal(M.moveItem(state, i.id, target.id, 'missing'), false);
  M.move(state.sections, target.id, source.id); assert.equal(state.sections[0].id, target.id); M.validate(state);
});
test('migration copies edited legacy templates without modifying original project data', () => {
  const initial = M.initial();
  const old = { version: 1, projects: [{ name: 'Old project' }], templates: initial.sections.map(s => ({ name: s.name, analysisType: s.name, sections: [{ id: s.id, name: s.name, items: s.items }] })) };
  old.templates[0].sections[0].items[0].note = 'Edited old note';
  const values = new Map([[M.LEGACY_KEY, JSON.stringify(old)]]), storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const before = values.get(M.LEGACY_KEY), migrated = M.load(storage); M.save(storage, migrated);
  assert.equal(migrated.sections[0].items[0].note, 'Edited old note'); assert.equal(migrated.sections[1].color, 'orange');
  assert.equal(values.get(M.LEGACY_KEY), before); assert.deepEqual(M.load(storage), migrated);
});
test('local persistence includes selections, notes and custom section colors', () => {
  const values = new Map(), storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const state = M.load(storage); state.sections[0].items[0].done = true; state.sections[1].color = 'green'; M.save(storage, state);
  assert.deepEqual(M.load(storage), state);
});
test('invalid stored data is rejected without overwriting it', () => {
  assert.throws(() => M.load({ getItem: () => '{broken' }));
  const state = M.initial(); state.sections[0].color = 'untrusted'; assert.throws(() => M.validate(state));
  state.sections[0].color = 'blue'; state.sections[0].items[0].done = true; state.sections[0].items[0].na = true; assert.throws(() => M.validate(state));
});
