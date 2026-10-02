(() => {
  'use strict';
  const M = window.Checklist;
  const main = document.querySelector('#main'), dialog = document.querySelector('#editor'), form = document.querySelector('#editor-form');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const icons = {
    plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12 4 4L19 6"/>',
    list: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m7 9 1 1 2-3m2 2h5m-10 7 1 1 2-3m2 2h5"/>',
    drag: '<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    up: '<path d="m6 14 6-6 6 6"/>', down: '<path d="m6 10 6 6 6-6"/>', back: '<path d="m14 5-7 7 7 7"/>',
    archive: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8m-10 4h6"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
  document.querySelector('#close-dialog').innerHTML = svg('close');
  const button = (action, label, icon, cls = '', attrs = '') => `<button type="button" class="button ${cls}" data-action="${action}" ${attrs}>${icon ? svg(icon) : ''}${escape(label)}</button>`;
  const iconButton = (action, label, icon, attrs = '', cls = '') => `<button type="button" class="icon-button ${cls}" data-action="${action}" aria-label="${escape(label)}" title="${escape(label)}" ${attrs}>${svg(icon)}</button>`;

  let state, blocked = false, incomplete = false, submitHandler = null, returnFocus = null, dragging = null, toastTimer;
  let inlineHost = null, inlineAnchor = null;
  const current = (data = state) => data;
  function storageError(error, startup = false) {
    const box = document.querySelector('#storage-error'); box.hidden = false;
    box.textContent = startup ? `無法讀取本機清單：${error.message}。資料未覆寫，請確認本機儲存權限後重新整理。` : `儲存失敗：${error.message}。修改尚未套用，請確認儲存權限與空間。`;
    document.querySelector('#save-status').textContent = '儲存異常';
    if (startup) { blocked = true; document.body.classList.add('storage-blocked'); }
  }
  try { state = M.load(localStorage); M.save(localStorage, state); } catch (error) { state = M.initial(); storageError(error, true); }
  function transact(change, redraw = true) {
    if (blocked) return false;
    const next = M.clone(state);
    try {
      change(next); M.save(localStorage, next); state = next;
      document.querySelector('#storage-error').hidden = true; document.querySelector('#save-status').textContent = '已儲存於本機';
      if (redraw) render(); return true;
    } catch (error) { storageError(error); return false; }
  }
  const entityChange = (fn, redraw = true) => transact(fn, redraw);
  function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 2800); }
  function orderButtons(kind, list, index, sectionId = '') {
    const attrs = `data-kind="${kind}" data-id="${list[index].id}" data-section="${sectionId}"`;
    return iconButton('move-up', '向上移動 ' + list[index].name, 'up', `${attrs} ${index === 0 ? 'disabled' : ''}`) + iconButton('move-down', '向下移動 ' + list[index].name, 'down', `${attrs} ${index === list.length - 1 ? 'disabled' : ''}`);
  }
  function handle(kind, id, name, sectionId = '', disabled = false) {
    return `<button type="button" class="icon-button drag-handle" draggable="${!disabled}" data-drag="${kind}" data-id="${id}" data-section="${sectionId}" aria-label="拖曳排序 ${escape(name)}" title="拖曳排序；也可使用向上／向下按鈕" ${disabled ? 'disabled' : ''}>${svg('drag')}</button>`;
  }

  function renderItem(i, s) {
    const attrs = `data-item="${i.id}" data-section="${s.id}"`, index = s.items.findIndex(x => x.id === i.id);
    const pending = i.critical && !i.done && !i.na;
    return `<div class="check-row ${i.done ? 'done' : i.na ? 'na' : pending ? 'critical-pending' : ''}" data-drop="item" data-id="${i.id}" data-section="${s.id}">
      ${handle('item', i.id, i.name, s.id, incomplete)}<span class="item-title">${escape(i.name)}${pending ? '<span class="critical-label">Critical · 待確認</span>' : ''}</span>
      <label class="checkbox-wrap done-cell"><input type="checkbox" data-toggle="done" ${attrs} aria-label="Done：${escape(i.name)}" ${i.done ? 'checked' : ''} ${i.na ? 'disabled' : ''}><span class="mobile-label">Done</span></label>
      <div class="note-cell"><textarea rows="1" data-note ${attrs} aria-label="Note：${escape(i.name)}" placeholder="Add note…">${escape(i.note)}</textarea></div>
      <label class="checkbox-wrap na-cell"><input type="checkbox" data-toggle="na" ${attrs} aria-label="N/A：${escape(i.name)}" ${i.na ? 'checked' : ''}><span class="mobile-label">N/A</span></label>
      <button type="button" class="icon-button star" data-action="critical" ${attrs} aria-label="Critical：${escape(i.name)}" aria-pressed="${i.critical}" title="Critical item — must be completed before run." aria-describedby="critical-help">${svg('star')}</button>
      <details class="row-menu"><summary class="icon-button" aria-label="更多操作：${escape(i.name)}">${svg('more')}</summary><div class="menu"><button type="button" data-action="edit-item" ${attrs}>Edit item</button><button type="button" data-action="move-up" data-kind="item" data-id="${i.id}" data-section="${s.id}" ${index === 0 || incomplete ? 'disabled' : ''}>Move up</button><button type="button" data-action="move-down" data-kind="item" data-id="${i.id}" data-section="${s.id}" ${index === s.items.length - 1 || incomplete ? 'disabled' : ''}>Move down</button><button type="button" class="danger" data-action="delete-item" ${attrs}>Delete item</button></div></details></div>`;
  }
  function render() {
    // Keep an inline form draft intact when checklist rows refresh.
    if (inlineHost) dialog.appendChild(form);
    const p = M.progress(state), count = state.sections.reduce((n, s) => n + s.items.length, 0);
    main.innerHTML = `<div class="page-heading"><div><h1>Pre-Run Checklist</h1><p>開算前直接確認。下一次使用，Reset 清除勾選即可。</p></div>${button('reset', 'Reset 全部勾選', 'reset')}</div>
      <div class="direct-summary"><div class="direct-progress"><strong class="number">${p.done}<span> / ${p.total}</span></strong><span class="percent number">${p.percent}%</span><div class="progress-track" role="progressbar" aria-label="完成率" aria-valuenow="${p.percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p.percent}%"></span></div></div><div class="direct-status"><p class="readiness ${p.blocked ? 'blocked' : p.ready ? 'ready' : ''}">${p.blocked ? p.blocked + ' 個 Critical 項目待確認' : p.ready ? '適用項目全部完成' : count ? '逐項確認後勾選 Done' : '先新增檢查項目'}${p.na ? ' · ' + p.na + ' 個 N/A 不計入進度' : ''}</p><label class="filter"><input type="checkbox" id="incomplete-filter" ${incomplete ? 'checked' : ''}>Show Incomplete Only</label></div></div>
      <div class="direct-toolbar"><div class="section-shortcuts" aria-label="跳至檢查區塊">${state.sections.map(s => `<a class="section-chip color-${s.color}" href="#section-${s.id}">${escape(s.name)}<span class="number">${M.progress({ sections: [s] }).done}/${M.progress({ sections: [s] }).total}</span></a>`).join('')}</div>${button('new-section', 'Add Section', 'plus', 'light-action')}</div>
      <div class="state-legend"><span class="legend-done">Done 已確認</span><span class="legend-na">N/A 不適用</span><span class="legend-critical">Critical 待確認</span><span id="critical-help" class="critical-help">Critical item — must be completed before run.</span></div>
      ${incomplete ? '<p class="reorder-tip filter-tip">篩選時暫停排序，取消篩選後可拖曳。</p>' : ''}
      ${state.sections.map((s, n) => {
        const items = s.items.filter(i => !incomplete || (!i.done && !i.na)), sp = M.progress({ sections: [s] });
        return `<section id="section-${s.id}" class="panel section color-${s.color}" data-drop="section" data-id="${s.id}"><div class="section-heading">${handle('section', s.id, s.name, '', incomplete)}<span class="section-index">${String(n + 1).padStart(2, '0')}</span><h2 class="section-name">${escape(s.name)}</h2><span class="section-progress number">${sp.done} / ${sp.total}</span><div class="actions section-actions">${iconButton('reset-section', '清除勾選 ' + s.name, 'reset', `data-section="${s.id}"`)}<details class="row-menu section-menu"><summary class="icon-button" aria-label="Section 操作：${escape(s.name)}" title="Section 操作">${svg('more')}</summary><div class="menu"><button type="button" data-action="edit-section" data-section="${s.id}">Edit Section</button><button type="button" data-action="move-up" data-kind="section" data-id="${s.id}" ${n === 0 || incomplete ? 'disabled' : ''}>Move up</button><button type="button" data-action="move-down" data-kind="section" data-id="${s.id}" ${n === state.sections.length - 1 || incomplete ? 'disabled' : ''}>Move down</button><button type="button" class="danger" data-action="delete-section" data-section="${s.id}">Delete Section</button></div></details></div></div>
        ${items.length ? `<div class="check-head" aria-hidden="true"><span></span><span>CHECKLIST ITEM</span><span class="center">DONE</span><span>NOTE</span><span class="center">N/A</span><span class="center">CRITICAL</span><span></span></div>${items.map(i => renderItem(i, s)).join('')}` : `<div class="section-empty">${incomplete && s.items.length ? '此區塊沒有未完成的適用項目。' : '尚無項目，加入第一個檢查。'}</div>`}
        <div class="section-footer" data-drop="item-end" data-section="${s.id}">${button('new-item', 'Add Item', 'plus', 'light-action', `data-section="${s.id}"`)}</div></section>`;
      }).join('') || '<div class="empty"><h2>建立檢查清單</h2><p>先新增 Section，再加入檢查項目。</p></div>'}
      <p class="reorder-tip">拖曳把手排序；Edit Item 可移到其他 Section。Note 與勾選會自動儲存。</p>`;
    if (inlineHost) placeInlineForm();
  }
  function field(name, label, value = '', required = false) { return `<div class="field"><label for="field-${name}">${label}${required ? ' <span class="muted">*</span>' : ''}</label><input id="field-${name}" name="${name}" value="${escape(value)}" maxlength="160" ${required ? 'required' : ''}></div>`; }
  function placeInlineForm() {
    const anchor = main.querySelector(inlineAnchor);
    if (!anchor) { closeDialog(); return; }
    const host = document.createElement('div');
    host.className = 'inline-add'; host.setAttribute('role', 'region'); host.setAttribute('aria-labelledby', 'dialog-title');
    anchor.insertAdjacentElement('afterend', host); host.appendChild(form); inlineHost = host;
  }
  function openDialog(title, fields, handler, submit = 'Save', destructive = false) {
    const trigger = document.activeElement;
    if (inlineHost) closeDialog();
    returnFocus = trigger;
    document.querySelector('#dialog-title').textContent = title;
    document.querySelector('#dialog-fields').innerHTML = fields;
    document.querySelector('#form-error').hidden = true;
    const submitBtn = document.querySelector('#submit-dialog'); submitBtn.textContent = submit; submitBtn.className = 'button ' + (destructive ? 'danger' : 'primary');
    submitHandler = handler;
    if (title === 'Add Item' || title === 'Add Section') {
      inlineAnchor = title === 'Add Item' ? '[data-drop="item-end"][data-section="' + trigger.dataset.section + '"]' : '.direct-toolbar';
      placeInlineForm();
    } else dialog.showModal();
    if (destructive) document.querySelector('#cancel-dialog').focus();
    else dialog.querySelector('input,select,textarea')?.focus();
  }
  function closeDialog() {
    if (inlineHost) { dialog.appendChild(form); inlineHost.remove(); inlineHost = null; inlineAnchor = null; }
    dialog.close(); submitHandler = null;
    if (returnFocus?.isConnected) returnFocus.focus(); else main.focus();
  }
  function confirm(title, description, action, label) {
    openDialog(title, `<p>${escape(description)}</p>`, () => transact(action), label, true);
  }
  function sectionDialog(sectionId) {
    const s = state.sections.find(x => x.id === sectionId), color = s?.color || Object.keys(M.COLORS)[state.sections.length % 6];
    openDialog(s ? 'Edit Section' : 'Add Section', field('name', 'Section Name', s?.name || '', true) + `<div class="field"><label for="field-color">區塊顏色</label><select id="field-color" name="color">${Object.entries(M.COLORS).map(([key, label]) => `<option value="${key}" ${key === color ? 'selected' : ''}>${label}</option>`).join('')}</select></div>`, values => {
      const name = values.name.trim(); if (!name) throw new Error('請填寫 Section Name');
      return transact(data => { if (s) Object.assign(data.sections.find(x => x.id === s.id), { name, color: values.color }); else data.sections.push(M.section(name, [], values.color)); });
    }, s ? 'Save' : 'Add Section');
  }
  function itemDialog(sectionId, itemId) {
    const s = current().sections.find(x => x.id === sectionId); const i = s.items.find(x => x.id === itemId);
    openDialog(i ? 'Edit Item' : 'Add Item', field('name', 'Checklist Item', i?.name || '', true) + `<div class="field"><label for="field-section">Section</label><select id="field-section" name="sectionId">${current().sections.map(sec => `<option value="${sec.id}" ${sec.id === sectionId ? 'selected' : ''}>${escape(sec.name)}</option>`).join('')}</select></div><div class="field"><label for="field-note">Note</label><textarea id="field-note" name="note">${escape(i?.note || '')}</textarea></div><label class="filter"><input type="checkbox" name="critical" ${i?.critical ? 'checked' : ''}>Critical item — must be completed before run.</label>`, values => {
      const name = values.name.trim(); if (!name) throw new Error('請填寫 Checklist Item');
      return entityChange(e => {
        const target = e.sections.find(x => x.id === values.sectionId);
        if (!target) throw new Error('找不到指定的 Section');
        if (i) {
          const source = e.sections.find(x => x.id === sectionId);
          Object.assign(source.items.find(x => x.id === i.id), { name, note: values.note, critical: Boolean(values.critical) });
          if (source.id !== target.id) M.moveItem(e, i.id, source.id, target.id);
        } else target.items.push(M.item(name, values.note, Boolean(values.critical)));
      });
    }, i ? 'Save' : 'Add Item');
  }

  main.addEventListener('click', event => {
    const target = event.target.closest('[data-action]'); if (!target || target.disabled || blocked) return;
    const { action, id, section: sectionId, item: itemId, kind } = target.dataset;
    const s = state.sections.find(x => x.id === sectionId);
    if (action === 'reset') return confirm('Reset 全部勾選', '清除所有 Done 與 N/A？清單、備註、Critical、區塊顏色與排序都會保留。', data => M.reset(data), 'Reset');
    if (action === 'reset-section') return confirm('Reset ' + s.name, '只清除此區塊的 Done 與 N/A，保留項目與備註。', data => M.reset({ sections: [data.sections.find(x => x.id === sectionId)] }), 'Reset');
    if (action === 'new-section') return sectionDialog();
    if (action === 'edit-section') return sectionDialog(sectionId);
    if (action === 'delete-section') return confirm('Delete Section', `刪除「${s.name}」與其中的 ${s.items.length} 個 Item？`, data => { data.sections = data.sections.filter(x => x.id !== sectionId); }, 'Delete Section');
    if (action === 'new-item') return itemDialog(sectionId);
    if (action === 'edit-item') return itemDialog(sectionId, itemId);
    if (action === 'delete-item') return confirm('Delete Item', `刪除「${s.items.find(x => x.id === itemId).name}」與其備註？`, data => { const sec = data.sections.find(x => x.id === sectionId); sec.items = sec.items.filter(x => x.id !== itemId); }, 'Delete Item');
    if (action === 'critical') {
      if (transact(data => { const i = data.sections.find(x => x.id === sectionId).items.find(x => x.id === itemId); i.critical = !i.critical; })) main.querySelector(`[data-action="critical"][data-item="${itemId}"]`)?.focus(); return;
    }
    if (action === 'move-up' || action === 'move-down') {
      const direction = action === 'move-up' ? -1 : 1;
      if (transact(data => { const list = kind === 'section' ? data.sections : data.sections.find(x => x.id === sectionId).items; const index = list.findIndex(x => x.id === id); if (list[index + direction]) M.move(list, id, list[index + direction].id, direction > 0); })) { toast('順序已更新'); main.querySelector(`[data-drag="${kind}"][data-id="${id}"]`)?.focus(); }
    }
  });
  main.addEventListener('change', event => {
    const el = event.target;
    if (el.id === 'incomplete-filter') { incomplete = el.checked; render(); document.querySelector('#incomplete-filter').focus(); return; }
    if (el.dataset.toggle) {
      const { section: sectionId, item: itemId, toggle } = el.dataset, value = el.checked;
      if (!transact(data => { const i = data.sections.find(x => x.id === sectionId).items.find(x => x.id === itemId); i[toggle] = value; if (value) i[toggle === 'na' ? 'done' : 'na'] = false; })) el.checked = !value;
      main.querySelector(`[data-toggle="${toggle}"][data-item="${itemId}"]`)?.focus();
    }
  });
  main.addEventListener('input', event => {
    const el = event.target; if (!el.hasAttribute('data-note')) return;
    transact(data => { data.sections.find(x => x.id === el.dataset.section).items.find(x => x.id === el.dataset.item).note = el.value; }, false);
  });
  main.addEventListener('dragstart', event => {
    const h = event.target.closest('[data-drag]'); if (!h || h.disabled || incomplete) { event.preventDefault(); return; }
    dragging = { kind: h.dataset.drag, id: h.dataset.id, sectionId: h.dataset.section };
    event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', dragging.id); h.closest('.check-row,.section')?.classList.add('dragging');
  });
  function dropTarget(event) { return dragging ? event.target.closest(dragging.kind === 'section' ? '[data-drop="section"]' : '[data-drop="item"],[data-drop="item-end"]') : null; }
  main.addEventListener('dragover', event => { const target = dropTarget(event); if (!target) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; main.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target')); target.classList.add('drop-target'); });
  main.addEventListener('drop', event => {
    const target = dropTarget(event); if (!target) return; event.preventDefault();
    const { kind, id, sectionId } = dragging, rect = target.getBoundingClientRect(), after = event.clientY > rect.top + rect.height / 2;
    transact(data => { if (kind === 'section') M.move(data.sections, id, target.dataset.id, after); else M.moveItem(data, id, sectionId, target.dataset.section, target.dataset.drop === 'item' ? target.dataset.id : null, after); });
    dragging = null; toast('順序已儲存');
  });
  main.addEventListener('dragend', () => { dragging = null; main.querySelectorAll('.dragging,.drop-target').forEach(x => x.classList.remove('dragging', 'drop-target')); });
  form.addEventListener('submit', event => { event.preventDefault(); try { if (submitHandler?.(Object.fromEntries(new FormData(form)))) closeDialog(); else throw new Error('資料尚未儲存，請確認上方訊息後再試。'); } catch (error) { const el = document.querySelector('#form-error'); el.hidden = false; el.textContent = error.message; } });
  document.querySelector('#close-dialog').addEventListener('click', closeDialog); document.querySelector('#cancel-dialog').addEventListener('click', closeDialog);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  document.addEventListener('click', event => document.querySelectorAll('.row-menu[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !dialog.open) { if (inlineHost) closeDialog(); document.querySelectorAll('.row-menu[open]').forEach(menu => menu.open = false); } });
  window.addEventListener('storage', event => {
    if (event.key !== M.KEY) return;
    if (dialog.open || inlineHost) { closeDialog(); toast('另一個分頁已更新清單，請重新開啟編輯'); }
    try { if (!event.newValue) throw new Error('本機資料已從其他分頁清除'); state = M.validate(JSON.parse(event.newValue)); render(); } catch (error) { storageError(error, true); }
  });
  render();
})();
