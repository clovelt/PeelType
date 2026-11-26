// Editor panel for skin attachments (ingrown lines, js/ingrown.js).
// Renders into a container inside the Illustration section; edits a plain
// config object in place and reports every change through api.onChange.
//
//   renderSkinEditor(root, skin, {
//     ui,                       // { patchIdx, lineIdx, tool } — persists across renders
//     blockIds,                 // for action targets
//     onChange(skin, { remount }),
//     onTool(tool),             // 'move' | 'off'
//     onShowPatch(idx),
//     onRestart()
//   })
import { SKIN_LINE_TYPES, normalizeSkinLine, toneToHex } from './ingrown.js';

const ACTIONS = ['none', 'revealBlock', 'hideBlock', 'skipBlock', 'setFlag', 'sound', 'particles', 'bgColor'];
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const TYPE_HELP = {
  arc: 'arc — a plain gentle curve',
  wave: 'wave — curly, waving side to side',
  hook: 'hook — straight, curling at the root end',
  pin: 'pin — grew out, hit the skin and doubled back',
  loop: 'loop — crosses over itself once',
  knot: 'knot — tangled up on itself',
  coil: 'coil — wound up in a spiral',
  giant: 'giant — a big deep spiral (the whopper)'
};

export function defaultSkinConfig() {
  return {
    mode: 'chill', fontSize: 15, sway: true, zoom: true, place: true, hints: true, sound: true,
    resistance: 1, snapTolerance: 1, openEffort: 1, painRate: 1, skinText: '',
    patches: [{
      name: 'piel 1', tone: '#f0c3a2', fuzz: 12, fuzzWords: '',
      lines: [
        { text: 'una frase que creció hacia dentro', type: 'arc' },
        { text: 'otra que dio la vuelta antes de salir', type: 'pin', snags: 1 }
      ]
    }]
  };
}

function actionOf(v) {
  const a = Array.isArray(v) ? v[0] : v;
  if (!a) return { action: 'none', target: '' };
  const action = a.type || a.action || 'none';
  return { action: ACTIONS.includes(action) ? action : 'none', target: a.blockId || a.target || a.name || a.preset || a.color || '' };
}
function actionTo(action, target) {
  if (!action || action === 'none') return undefined;
  if (action === 'revealBlock' || action === 'hideBlock' || action === 'skipBlock') return { type: action, blockId: target };
  if (action === 'setFlag' || action === 'sound') return { type: action, name: target };
  if (action === 'particles') return { type: 'particles', preset: target || 'spark' };
  if (action === 'bgColor') return { type: 'bgColor', color: target };
  return undefined;
}
function setAction(obj, key, action, target) {
  const v = actionTo(action, target);
  if (v) obj[key] = v; else delete obj[key];
}

const row = (label, help, input, cls = 'editor-row inline') => `<div class="${cls}"><label data-help="${esc(help)}">${label}</label>${input}</div>`;
const numIn = (k, v, min, max, step, help) => `<input data-k="${k}" type="number" min="${min}" max="${max}" step="${step}" value="${esc(v)}" data-help="${esc(help)}">`;
const chk = (k, v, help) => `<input data-k="${k}" type="checkbox" ${v ? 'checked' : ''} data-help="${esc(help)}">`;
const actionSel = (k, a) => `<select data-k="${k}">${ACTIONS.map(x => `<option value="${x}" ${x === a ? 'selected' : ''}>${x}</option>`).join('')}</select>`;

export function renderSkinEditor(root, skin, api) {
  const ui = api.ui;
  skin.patches = Array.isArray(skin.patches) && skin.patches.length ? skin.patches : defaultSkinConfig().patches;
  ui.patchIdx = Math.max(0, Math.min(skin.patches.length - 1, ui.patchIdx || 0));
  const patch = skin.patches[ui.patchIdx];
  patch.lines = Array.isArray(patch.lines) ? patch.lines : [];
  const dl = `skinBlockIds`;
  const complete = actionOf(skin.onComplete), clear = actionOf(patch.onClear);
  const pool = Array.isArray(skin.textPool) ? skin.textPool.join('\n') : String(skin.textPool || '');

  const lineHtml = (l, i) => {
    const n = normalizeSkinLine(l), ex = actionOf(l.onExtract), open = i === ui.lineIdx;
    return `<div class="tie-item skin-line${open ? ' is-selected' : ''}" data-li="${i}">
      <div class="tie-top">
        <span class="skin-line-num" data-help="Line number (also shown on the skin while the Move tool is on)">${i + 1}</span>
        <input data-lk="text" type="text" value="${esc(l.text)}" placeholder="buried text…" data-help="The text buried under the skin. Its first letters are the dark tip you rub open; the rest comes out in order.">
        <button type="button" class="skin-line-dup" data-help="Duplicate this line">⧉</button>
        <button type="button" class="skin-line-del danger-icon-button" data-help="Remove this line">×</button>
      </div>
      <div class="editor-grid-2">
        ${row('Shape', 'How the line lies under the skin. ' + Object.values(TYPE_HELP).join(' · '), `<select data-lk="type">${SKIN_LINE_TYPES.map(t => `<option value="${t}" ${t === n.type ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
        ${row('Depth', 'How deep it is (0–1). Deeper = more rubbing to open, slower and heavier to pull, fainter under the skin. Empty = random for its shape.', `<input data-lk="depth" type="number" min="0" max="1" step="0.05" value="${n.depth ?? ''}" placeholder="auto">`)}
        ${row('Snags', 'Gaps between words where it catches. A firm tug gets it through.', `<input data-lk="snags" type="number" min="0" max="6" step="1" value="${n.snags}">`)}
        ${row('Hidden', 'Fraction of the text that runs out of sight, deeper than the visible channel (0–0.9). Makes a line longer than it looks.', `<input data-lk="hidden" type="number" min="0" max="0.9" step="0.05" value="${n.hidden}">`)}
        ${row('Pale', 'A pale (grey) line, like a white hair.', `<input data-lk="white" type="checkbox" ${n.white ? 'checked' : ''}>`)}
        ${row('Chain', 'Pulling this one out drags the tips of nearby buried lines out with it.', `<input data-lk="chain" type="checkbox" ${n.chain ? 'checked' : ''}>`)}
      </div>
      ${row('Twin', 'A second line sharing the same pore: it comes out right after this one.', `<input data-lk="twin" type="text" value="${esc(n.twin)}" placeholder="(none)">`, 'editor-row')}
      <div class="editor-grid-2">
        ${row('X', 'Centre of the line across the skin (0–1). Empty = placed automatically. Use the Move tool to drag it.', `<input data-lk="x" type="number" min="0" max="1" step="0.01" value="${n.x ?? ''}" placeholder="auto">`)}
        ${row('Y', 'Centre of the line down the skin (0–1, between the HUD and the tissue). Empty = automatic.', `<input data-lk="y" type="number" min="0" max="1" step="0.01" value="${n.y ?? ''}" placeholder="auto">`)}
        ${row('Angle', 'Direction (degrees) it grows from the tip. Empty = random. With the Move tool, drag the numbered tip to turn it.', `<input data-lk="angle" type="number" min="-360" max="720" step="1" value="${n.angle ?? ''}" placeholder="auto">`)}
        ${row('On extract', 'What happens when this line comes out whole.', actionSel('lineAction', ex.action).replace('data-k=', 'data-lk='))}
        <div class="editor-row inline skin-line-target" style="display:${ex.action === 'none' ? 'none' : 'grid'}"><label data-help="Block id, flag, sound, particle preset or colour">Target</label><input data-lk="lineTarget" type="text" list="${dl}" value="${esc(ex.target)}"></div>
      </div>
    </div>`;
  };

  root.innerHTML = `
    <div class="skin-editor">
      <div class="skin-editor-head" style="font-size:11px;opacity:.7;margin:6px 0 2px">Skin · ingrown lines</div>
      <div class="editor-row">
        <label data-help="Canvas tools for the skin">Canvas tool</label>
        <div class="lineart-draw-tools skin-tools">
          <button type="button" data-skin-tool="move" class="${ui.tool === 'move' ? 'active' : ''}" aria-pressed="${ui.tool === 'move'}" data-help="Drag lines on the skin to move them; drag a line's numbered tip to turn it. Click a line to select it here.">Move lines</button>
          <button type="button" data-skin-act="restart" data-help="Start the game over from the first patch">Restart</button>
          <button type="button" data-skin-act="auto" data-help="Forget every set position/angle in this patch so lines are placed automatically">Auto-place</button>
          <span class="lineart-tool-status ${ui.tool === 'move' ? 'active' : ''}">${ui.tool === 'move' ? 'Move' : 'Off'}</span>
        </div>
      </div>

      <details class="skin-sub" open><summary>Rules</summary>
        <div class="editor-grid-2">
          ${row('Mode', 'chill: no clock, ends when the last patch is clear. timed: a countdown, extra time per cleared patch, ends in a rank.', `<select data-k="mode"><option value="chill" ${skin.mode !== 'timed' ? 'selected' : ''}>chill</option><option value="timed" ${skin.mode === 'timed' ? 'selected' : ''}>timed</option></select>`)}
          ${row('Seconds', 'Time limit in timed mode.', numIn('timeLimit', skin.timeLimit ?? 60, 10, 600, 5, 'Time limit in timed mode.'))}
          ${row('Clear bonus', 'Seconds added for each patch left smooth (timed mode).', numIn('clearBonus', skin.clearBonus ?? 12, 0, 120, 1, ''))}
          ${row('Endless', 'After the authored patches (or for patches with no lines), keep making random patches from the text pool.', chk('endless', skin.endless, ''))}
          ${row('Resistance', 'How hard lines are to draw out (×). Higher = slower slide.', numIn('resistance', skin.resistance ?? 1, 0.2, 5, 0.1, ''))}
          ${row('Snap at', 'How much stretch a line takes before snapping (×). Lower = breaks sooner.', numIn('snapTolerance', skin.snapTolerance ?? 1, 0.3, 4, 0.1, ''))}
          ${row('Open effort', 'How much rubbing it takes to open a pore (×).', numIn('openEffort', skin.openEffort ?? 1, 0.2, 5, 0.1, ''))}
          ${row('Pain', 'How fast rubbing bare skin fills the pain meter (×). 0 = never hurts.', numIn('painRate', skin.painRate ?? 1, 0, 5, 0.1, ''))}
        </div>
      </details>

      <details class="skin-sub" open><summary>Look &amp; feel</summary>
        <div class="editor-grid-2">
          ${row('Font size', 'Size of the buried letters (px, scaled to the skin).', numIn('fontSize', skin.fontSize ?? 15, 8, 40, 1, ''))}
          ${row('Font', 'Font family for the lines. Empty = the block’s font.', `<input data-k="fontFamily" type="text" value="${esc(skin.fontFamily || '')}" placeholder="block font">`)}
          ${row('Ink', 'Colour of the lines.', `<input data-k="ink" type="color" value="${esc(skin.ink || '#2b1a17')}">`)}
          ${row('Pale ink', 'Colour of pale lines.', `<input data-k="paleInk" type="color" value="${esc(skin.paleInk || '#8f8a83')}">`)}
          ${row('Whip', 'Pulled text whips about on the tweezers (on) or stands out stiff (off).', chk('sway', skin.sway ?? true, ''))}
          ${row('Zoom', 'The view closes in on the line being worked on, and slows down when a big one comes out.', chk('zoom', skin.zoom ?? true, ''))}
          ${row('Place by hand', 'On: carry what you pull and put it down on the tissue yourself (the tissue can be dragged). Off: it lines up by itself.', chk('place', skin.place ?? true, ''))}
          ${row('Hints', 'Show “rub here / pinch and pull” on the first patch.', chk('hints', skin.hints ?? true, ''))}
          ${row('Sound', 'Scraping, sliding, strain and pop sounds.', chk('sound', skin.sound ?? true, ''))}
        </div>
        ${row('Skin text', 'Faint text written into the skin along its creases. Empty = none.', `<input data-k="skinText" type="text" value="${esc(skin.skinText || '')}" placeholder="(none)">`, 'editor-row')}
        ${row('Text pool', 'One line per row. Endless mode builds random patches from these.', `<textarea data-k="textPool" rows="3" placeholder="one line per row">${esc(pool)}</textarea>`, 'editor-row')}
        <div class="editor-grid-2">
          ${row('On complete', 'What happens when the game ends (last patch cleared, time up, or Finish).', actionSel('completeAction', complete.action))}
          <div class="editor-row inline" style="display:${complete.action === 'none' ? 'none' : 'grid'}"><label>Target</label><input data-k="completeTarget" type="text" list="${dl}" value="${esc(complete.target)}"></div>
        </div>
      </details>

      <details class="skin-sub" open><summary>Patches</summary>
        <div class="editor-row inline">
          <label data-help="Each patch is one screen of skin. Clearing it moves to the next.">Patch</label>
          <div class="path-picker-row">
            <select data-k="patchSel">${skin.patches.map((p, i) => `<option value="${i}" ${i === ui.patchIdx ? 'selected' : ''}>${i + 1}. ${esc(p.name || 'piel')} (${(p.lines || []).length})</option>`).join('')}</select>
            <button type="button" data-skin-act="patchAdd" data-help="Add a patch">+</button>
            <button type="button" data-skin-act="patchUp" data-help="Move this patch earlier">↑</button>
            <button type="button" data-skin-act="patchDel" class="danger-icon-button" data-help="Delete this patch">×</button>
          </div>
        </div>
        <div class="editor-grid-2">
          ${row('Name', 'Shown in the corner of the skin.', `<input data-pk="name" type="text" value="${esc(patch.name || '')}">`)}
          ${row('Tone', 'Skin colour.', `<input data-pk="tone" type="color" value="${esc(toneToHex(patch.tone || '#f0c3a2'))}">`)}
          ${row('Fuzz', 'How many short words stand out of the pores (pinch and pluck).', `<input data-pk="fuzz" type="number" min="0" max="80" step="1" value="${patch.fuzz ?? 14}">`)}
          ${row('Fuzz words', 'Words for the fuzz, separated by spaces. Empty = tiny default words.', `<input data-pk="fuzzWords" type="text" value="${esc(patch.fuzzWords || '')}" placeholder="sí no ya…">`)}
          ${row('On clear', 'What happens when this patch is left smooth.', actionSel('clearAction', clear.action).replace('data-k=', 'data-pk='))}
          <div class="editor-row inline" style="display:${clear.action === 'none' ? 'none' : 'grid'}"><label>Target</label><input data-pk="clearTarget" type="text" list="${dl}" value="${esc(clear.target)}"></div>
        </div>
        <div class="skin-lines tie-list">${patch.lines.map(lineHtml).join('')}</div>
        <div class="editor-actions"><button type="button" data-skin-act="lineAdd" data-help="Add a buried line to this patch">+ Line</button></div>
      </details>
      <datalist id="${dl}">${(api.blockIds || []).map(id => `<option value="${esc(id)}"></option>`).join('')}</datalist>
    </div>`;

  // ── wiring ──
  let t = 0;
  const changed = (remount = true, rerender = false, wait = 0) => {
    clearTimeout(t);
    const go = () => { api.onChange(skin, { remount }); if (rerender) renderSkinEditor(root, skin, api); };
    if (wait) t = setTimeout(go, wait); else go();
  };
  const val = el => el.type === 'checkbox' ? el.checked : el.value;

  root.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k;
    const apply = (e) => {
      const v = val(el);
      if (k === 'patchSel') { ui.patchIdx = Number(v); ui.lineIdx = -1; api.onShowPatch?.(ui.patchIdx); renderSkinEditor(root, skin, api); return; }
      if (k === 'completeAction' || k === 'completeTarget') {
        const a = root.querySelector('[data-k="completeAction"]').value, tg = root.querySelector('[data-k="completeTarget"]').value.trim();
        setAction(skin, 'onComplete', a, tg); changed(true, k === 'completeAction'); return;
      }
      if (k === 'textPool') skin.textPool = String(v).split('\n').map(s => s.trim()).filter(Boolean);
      else if (el.type === 'number') { if (v === '') delete skin[k]; else skin[k] = Number(v); }
      else skin[k] = v;
      changed(true, false, e.type === 'input' ? 450 : 0);
    };
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color' ? 'change' : 'input', apply);
  });
  root.querySelectorAll('[data-pk]').forEach(el => {
    const k = el.dataset.pk;
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'color' ? 'change' : 'input', e => {
      const v = val(el);
      if (k === 'clearAction' || k === 'clearTarget') {
        const a = root.querySelector('[data-pk="clearAction"]').value, tg = root.querySelector('[data-pk="clearTarget"]')?.value.trim() || '';
        setAction(patch, 'onClear', a, tg); changed(true, k === 'clearAction'); return;
      }
      patch[k] = el.type === 'number' ? Number(v) || 0 : v;
      changed(true, false, e.type === 'input' ? 450 : 0);
      if (k === 'name') { const o = root.querySelector('[data-k="patchSel"]').selectedOptions[0]; if (o) o.textContent = `${ui.patchIdx + 1}. ${v} (${patch.lines.length})`; }
    });
  });
  root.querySelectorAll('.skin-line').forEach(item => {
    const i = Number(item.dataset.li), line = patch.lines[i];
    item.addEventListener('focusin', () => { if (ui.lineIdx !== i) { ui.lineIdx = i; root.querySelectorAll('.skin-line').forEach(x => x.classList.toggle('is-selected', x === item)); api.onSelectLine?.(i); } });
    item.querySelectorAll('[data-lk]').forEach(el => {
      const k = el.dataset.lk;
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', e => {
        const v = val(el);
        if (k === 'lineAction' || k === 'lineTarget') {
          const a = item.querySelector('[data-lk="lineAction"]').value, tg = item.querySelector('[data-lk="lineTarget"]').value.trim();
          setAction(line, 'onExtract', a, tg);
          item.querySelector('.skin-line-target').style.display = a === 'none' ? 'none' : 'grid';
          changed(false); return;
        }
        if (el.type === 'checkbox') { if (v) line[k] = true; else delete line[k]; }
        else if (el.type === 'number') { if (v === '') delete line[k]; else line[k] = Number(v); }
        else if (k === 'twin' && !String(v).trim()) delete line.twin;
        else line[k] = v;
        changed(true, false, e.type === 'input' ? 500 : 0);
      });
    });
    item.querySelector('.skin-line-del').addEventListener('click', () => { patch.lines.splice(i, 1); ui.lineIdx = -1; changed(true, true); });
    item.querySelector('.skin-line-dup').addEventListener('click', () => {
      const c = structuredClone(line); delete c.x; delete c.y; patch.lines.splice(i + 1, 0, c); ui.lineIdx = i + 1; changed(true, true);
    });
  });
  root.querySelectorAll('[data-skin-tool]').forEach(b => b.addEventListener('click', () => {
    ui.tool = ui.tool === b.dataset.skinTool ? 'off' : b.dataset.skinTool;
    api.onTool?.(ui.tool); renderSkinEditor(root, skin, api);
  }));
  root.querySelectorAll('[data-skin-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.skinAct;
    if (a === 'restart') { api.onRestart?.(); return; }
    if (a === 'auto') { patch.lines.forEach(l => { delete l.x; delete l.y; delete l.angle; }); changed(true, true); return; }
    if (a === 'lineAdd') { patch.lines.push({ text: 'una línea nueva bajo la piel', type: 'arc' }); ui.lineIdx = patch.lines.length - 1; changed(true, true); return; }
    if (a === 'patchAdd') { skin.patches.splice(ui.patchIdx + 1, 0, { name: `piel ${skin.patches.length + 1}`, tone: patch.tone || '#f0c3a2', fuzz: 12, fuzzWords: '', lines: [{ text: 'otra piel, otra frase', type: 'arc' }] }); ui.patchIdx += 1; ui.lineIdx = -1; changed(true, true); api.onShowPatch?.(ui.patchIdx); return; }
    if (a === 'patchUp' && ui.patchIdx > 0) { const [p] = skin.patches.splice(ui.patchIdx, 1); skin.patches.splice(ui.patchIdx - 1, 0, p); ui.patchIdx -= 1; changed(true, true); return; }
    if (a === 'patchDel' && skin.patches.length > 1) { skin.patches.splice(ui.patchIdx, 1); ui.patchIdx = Math.max(0, ui.patchIdx - 1); ui.lineIdx = -1; changed(true, true); }
  }));
  if (ui.lineIdx >= 0) root.querySelector(`.skin-line[data-li="${ui.lineIdx}"]`)?.scrollIntoView?.({ block: 'nearest' });
}
