(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Checklist = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'cae-pre-run-checklist.v2', LEGACY_KEY = 'cae-pre-run-checklist.v1';
  const COLORS = { blue: '藍色', orange: '橘色', purple: '紫色', teal: '青色', green: '綠色', gray: '灰色' };
  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => globalThis.crypto?.randomUUID?.() || 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  const item = (name, note = '', critical = false) => ({ id: id(), name, note, critical, done: false, na: false });
  const section = (name, items = [], color = 'blue') => ({ id: id(), name, color, items });
  function initial() {
    return { version: 2, sections: [section('Sagging', [
      item('3D網格改成二階'), item('進行模態or線性模擬', '確保東西都有綁好'), item('接觸設定'),
      item('Intersection檢查', '通常有都是part零貼零，把其中一件移動0.01'), item('干涉檢查', '標準抓0.01'),
      item('Model Checker'), item('File taxes and maintain tax records.')
    ], 'blue'), section('Shock', [item('3D網格改回一階'), item('改作正反面的時候，要檢查Tied的接觸')], 'orange')] };
  }
  function progress(entity) {
    const all = entity.sections.flatMap(s => s.items), applicable = all.filter(i => !i.na);
    const done = applicable.filter(i => i.done).length, blocked = applicable.filter(i => i.critical && !i.done).length;
    return { done, total: applicable.length, na: all.length - applicable.length,
      percent: applicable.length ? Math.round(done / applicable.length * 100) : (all.length ? 100 : 0),
      blocked, ready: all.length > 0 && done === applicable.length };
  }
  function reset(entity) { entity.sections.forEach(s => s.items.forEach(i => { i.done = false; i.na = false; })); }
  function move(list, source, target, after = false) {
    if (source === target) return false;
    const from = list.findIndex(x => x.id === source);
    if (from < 0 || !list.some(x => x.id === target)) return false;
    const [entry] = list.splice(from, 1), to = list.findIndex(x => x.id === target);
    list.splice(to + (after ? 1 : 0), 0, entry); return true;
  }
  function moveItem(entity, itemId, sourceId, targetId, beforeId = null, after = false) {
    const source = entity.sections.find(s => s.id === sourceId), target = entity.sections.find(s => s.id === targetId);
    if (!source || !target || itemId === beforeId || (beforeId && !target.items.some(i => i.id === beforeId))) return false;
    const from = source.items.findIndex(i => i.id === itemId); if (from < 0) return false;
    const [entry] = source.items.splice(from, 1);
    const to = beforeId ? target.items.findIndex(i => i.id === beforeId) + (after ? 1 : 0) : target.items.length;
    target.items.splice(to, 0, entry); return true;
  }
  function validate(state) {
    if (!state || state.version !== 2 || !Array.isArray(state.sections)) throw new Error('資料格式不相容');
    const ids = new Set();
    function validId(value) { if (typeof value !== 'string' || !value || ids.has(value)) throw new Error('資料 ID 不相容'); ids.add(value); }
    for (const s of state.sections) {
      validId(s.id);
      if (typeof s.name !== 'string' || !Object.hasOwn(COLORS, s.color) || !Array.isArray(s.items)) throw new Error('Section 資料不相容');
      for (const i of s.items) {
        validId(i.id);
        if (typeof i.name !== 'string' || typeof i.note !== 'string' || ['done', 'na', 'critical'].some(k => typeof i[k] !== 'boolean') || (i.done && i.na)) throw new Error('Item 資料不相容');
      }
    }
    return state;
  }
  function load(storage) {
    const raw = storage.getItem(KEY); if (raw !== null) return validate(JSON.parse(raw));
    const oldRaw = storage.getItem(LEGACY_KEY); if (oldRaw === null) return initial();
    const old = JSON.parse(oldRaw);
    if (old?.version !== 1 || !Array.isArray(old.templates)) throw new Error('舊清單資料不相容');
    const sections = old.templates.flatMap(t => {
      if (!Array.isArray(t.sections)) throw new Error('舊模板資料不相容');
      return t.sections.map(s => ({ ...clone(s), color: t.analysisType === 'Shock' ? 'orange' : t.analysisType === 'Sagging' ? 'blue' : ['purple', 'teal', 'green', 'gray'][Math.max(0, ['Vibration', 'Drop', 'Packaging', 'Other'].indexOf(t.analysisType))] }));
    });
    return validate({ version: 2, sections });
  }
  function save(storage, state) { validate(state); storage.setItem(KEY, JSON.stringify(state)); }
  return { KEY, LEGACY_KEY, COLORS, clone, id, item, section, initial, progress, reset, move, moveItem, validate, load, save };
});
