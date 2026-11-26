// Editor panel for ingrown lines (pieceConfig.ingrown, js/ingrown.js).
// Edits a plain config object in place and reports changes through api.onChange.
//
//   renderIngrownEditor(root, cfg | null, {
//     ui,                      // { patchIdx, lineIdx, tool } — persists across renders
//     blockIds,                // for action targets
//     onEnable(), onDisable(),
//     onChange(cfg, { remount }),
//     onTool(tool), onShowPatch(idx), onSelectLine(idx), onRestart()
//   })
import { INGROWN_LINE_TYPES, INGROWN_CAMERA_MODES, normalizeIngrownLine } from './ingrown.js';

const ACTIONS = ['none', 'revealBlock', 'hideBlock', 'skipBlock', 'setFlag', 'sound', 'particles', 'bgColor'];
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const TYPE_HELP = 'arc: a gentle curve · wave: curly · hook: curls at the root · pin: doubles back on itself · loop: crosses itself once · knot: tangled · coil: a spiral · giant: a big deep spiral · spring: a run of curls, twisting on itself · eight: twisted into a figure eight · fold: zig-zags back and forth · bridge: a curve of text already out, going in through two pores close together — pull the curve and it comes out of both sides';
const CAMERA_HELP = 'Where the next set of lines is. right/left/down/up: the rounds lie side by side across a wider page, and when one is cleared the view pans to the next. none: the next round grows in where you are.';

export function defaultIngrownConfig() {
  return {
    fontSize: 20, camera: 'right', panTime: 1.8, resistance: 1, snapTolerance: 1, openEffort: 1, painRate: 1, gravity: 1, pores: 1, sound: true,
    patches: [{
      fuzz: 10, fuzzWords: '',
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
function setAction(obj, key, action, target) { const v = actionTo(action, target); if (v) obj[key] = v; else delete obj[key]; }

const row = (label, help, input, cls = 'editor-row inline') => `<div class="${cls}"><label data-help="${esc(help)}">${label}</label>${input}</div>`;
const numIn = (k, v, min, max, step, help = '') => `<input data-k="${k}" type="number" min="${min}" max="${max}" step="${step}" value="${esc(v)}" data-help="${esc(help)}">`;
const actionSel = (attr, k, a) => `<select ${attr}="${k}">${ACTIONS.map(x => `<option value="${x}" ${x === a ? 'selected' : ''}>${x}</option>`).join('')}</select>`;

export function renderIngrownEditor(root, cfg, api) {
  if (!cfg) {
    root.innerHTML = `<div class="editor-actions"><button type="button" data-ig="enable" data-help="Bury lines of text under this scene's page: rub a dark tip open, then pull the line out slowly.">Add ingrown lines</button></div>`;
    root.querySelector('[data-ig=enable]').addEventListener('click', () => api.onEnable());
    return;
  }
  const ui = api.ui;
  cfg.patches = Array.isArray(cfg.patches) && cfg.patches.length ? cfg.patches : defaultIngrownConfig().patches;
  ui.patchIdx = Math.max(0, Math.min(cfg.patches.length - 1, ui.patchIdx || 0));
  const patch = cfg.patches[ui.patchIdx];
  patch.lines = Array.isArray(patch.lines) ? patch.lines : [];
  const dl = 'ingrownBlockIds';
  const complete = actionOf(cfg.onComplete), clear = actionOf(patch.onClear);
  const pool = Array.isArray(cfg.textPool) ? cfg.textPool.join('\n') : String(cfg.textPool || '');

  const lineHtml = (l, i) => {
    const n = normalizeIngrownLine(l), ex = actionOf(l.onExtract);
    return `<div class="tie-item ig-line${i === ui.lineIdx ? ' is-selected' : ''}" data-li="${i}">
      <div class="tie-top">
        <span class="ig-line-num" data-help="Line number (shown on the page while Move lines is on)">${i + 1}</span>
        <input data-lk="text" type="text" value="${esc(l.text)}" placeholder="buried text…" data-help="The buried text. Its first letters are the dark tip in the pore; the rest comes out in order.">
        <button type="button" class="ig-line-dup" data-help="Duplicate this line">⧉</button>
        <button type="button" class="ig-line-del danger-icon-button" data-help="Remove this line">×</button>
      </div>
      <div class="editor-grid-2">
        ${row('Shape', TYPE_HELP, `<select data-lk="type">${INGROWN_LINE_TYPES.map(t => `<option value="${t}" ${t === n.type ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
        ${row('Depth', 'How deep it lies (0–1): deeper = more rubbing to open, slower and heavier to pull, fainter. Empty = random for its shape.', `<input data-lk="depth" type="number" min="0" max="1" step="0.05" value="${n.depth ?? ''}" placeholder="auto">`)}
        ${row('Snags', 'Gaps between words where it catches; a firm tug gets it through.', `<input data-lk="snags" type="number" min="0" max="6" step="1" value="${n.snags}">`)}
        ${row('Hidden', 'Fraction of the text that runs deeper than you can see (0–0.9): longer than it looks.', `<input data-lk="hidden" type="number" min="0" max="0.9" step="0.05" value="${n.hidden}">`)}
        ${row('Pale', 'Pale ink, like a white hair.', `<input data-lk="white" type="checkbox" ${n.white ? 'checked' : ''}>`)}
        ${row('Chain', 'Pulling it out drags the tips of nearby buried lines out too.', `<input data-lk="chain" type="checkbox" ${n.chain ? 'checked' : ''}>`)}
      </div>
      ${row('Text EN', 'English version of the text (used when the page is in English). Empty = the main text.', `<input data-lk="textEn" type="text" value="${esc(l.textEn || '')}" placeholder="(same as main)">`, 'editor-row')}
      ${row('Twin', 'A second line joined to the root of this one: as you pull, it follows the first out.', `<input data-lk="twin" type="text" value="${esc(n.twin)}" placeholder="(none)">`, 'editor-row')}
      ${row('Twin EN', 'English version of the twin.', `<input data-lk="twinEn" type="text" value="${esc(l.twinEn || '')}" placeholder="(same as main)">`, 'editor-row')}
      <div class="editor-grid-2">
        ${row('X', 'Centre across the page (0–1). Empty = placed automatically. Drag it with Move lines.', `<input data-lk="x" type="number" min="0" max="1" step="0.01" value="${n.x ?? ''}" placeholder="auto">`)}
        ${row('Y', 'Centre down the buried area (0–1). Empty = automatic.', `<input data-lk="y" type="number" min="0" max="1" step="0.01" value="${n.y ?? ''}" placeholder="auto">`)}
        ${row('Angle', 'Direction it grows from the tip (degrees). Empty = random. With Move lines, drag the numbered tip to turn it.', `<input data-lk="angle" type="number" min="-360" max="720" step="1" value="${n.angle ?? ''}" placeholder="auto">`)}
        ${row('On extract', 'What happens when this line comes out whole.', actionSel('data-lk', 'lineAction', ex.action))}
        <div class="editor-row inline ig-line-target" style="display:${ex.action === 'none' ? 'none' : 'grid'}"><label data-help="Block id, flag, sound, particle preset or colour">Target</label><input data-lk="lineTarget" type="text" list="${dl}" value="${esc(ex.target)}"></div>
      </div>
    </div>`;
  };

  root.innerHTML = `
    <div class="ig-editor">
      <div class="editor-row">
        <label data-help="Canvas tools">Canvas tool</label>
        <div class="lineart-draw-tools ig-tools">
          <button type="button" data-ig-tool="move" class="${ui.tool === 'move' ? 'active' : ''}" aria-pressed="${ui.tool === 'move'}" data-help="Drag lines on the page to move them; drag a line's numbered tip to turn it. Click a line to select it here.">Move lines</button>
          <button type="button" data-ig="restart" data-help="Bury everything again, from the first round">Restart</button>
          <button type="button" data-ig="auto" data-help="Forget set positions and angles in this round so its lines are placed automatically">Auto-place</button>
          <button type="button" data-ig="disable" class="danger-icon-button" data-help="Remove ingrown lines from this scene">×</button>
        </div>
      </div>
      <div class="editor-grid-2">
        ${row('Font size', 'Size of the letters (px, adapts to the screen).', numIn('fontSize', cfg.fontSize ?? 20, 8, 48, 1))}
        ${row('Area height', 'Height of the buried area in px. 0 = one screen.', numIn('height', cfg.height ?? 0, 0, 6000, 10))}
        ${row('Resistance', 'How hard lines are to draw out (×). Higher = slower.', numIn('resistance', cfg.resistance ?? 1, 0.2, 5, 0.1))}
        ${row('Snap at', 'How much stretch a line takes before it snaps (×).', numIn('snapTolerance', cfg.snapTolerance ?? 1, 0.3, 4, 0.1))}
        ${row('Open effort', 'How much rubbing opens a pore (×).', numIn('openEffort', cfg.openEffort ?? 1, 0.2, 5, 0.1))}
        ${row('Pain', 'How fast rubbing bare page makes it flinch (×). 0 = never.', numIn('painRate', cfg.painRate ?? 1, 0, 5, 0.1))}
        ${row('Gravity', 'Gravity on pulled text (× PeelType letters).', numIn('gravity', cfg.gravity ?? 1, 0, 3, 0.1))}
        ${row('Pores', 'Density of the page’s pores. 0 = none.', numIn('pores', cfg.pores ?? 1, 0, 3, 0.1))}
        ${row('Ink', 'Colour of the lines. Empty = the scene’s text colour.', `<input data-k="ink" type="text" value="${esc(cfg.ink || '')}" placeholder="scene colour">`)}
        ${row('Pale ink', 'Colour of pale lines.', `<input data-k="paleInk" type="color" value="${esc(cfg.paleInk || '#a39c93')}">`)}
        ${row('Font', 'Font family. Empty = the scene’s font.', `<input data-k="fontFamily" type="text" value="${esc(cfg.fontFamily || '')}" placeholder="scene font">`)}
        ${row('Sound', 'Scraping, sliding, strain and pop sounds.', `<input data-k="sound" type="checkbox" ${cfg.sound !== false ? 'checked' : ''}>`)}
        ${row('Camera', CAMERA_HELP, `<select data-k="camera">${INGROWN_CAMERA_MODES.map(m => `<option value="${m}" ${m === (cfg.camera || 'none') ? 'selected' : ''}>${m === 'none' ? 'none (grow in place)' : 'pan ' + m}</option>`).join('')}</select>`)}
        ${row('Pan time', 'Seconds the camera takes to glide to the next set.', numIn('panTime', cfg.panTime ?? 1.8, 0.3, 6, 0.1))}
        ${row('Endless', 'After the last round (or for rounds with no lines), keep growing random lines from the text pool.', `<input data-k="endless" type="checkbox" ${cfg.endless ? 'checked' : ''}>`)}
        ${row('On complete', 'What happens when the last round is cleared.', actionSel('data-k', 'completeAction', complete.action))}
        <div class="editor-row inline" style="display:${complete.action === 'none' ? 'none' : 'grid'}"><label>Target</label><input data-k="completeTarget" type="text" list="${dl}" value="${esc(complete.target)}"></div>
      </div>
      ${row('Text pool', 'One line per row. Endless mode grows random lines from these.', `<textarea data-k="textPool" rows="3" placeholder="one line per row">${esc(pool)}</textarea>`, 'editor-row')}
      ${row('Pool EN', 'English text pool, one line per row. Empty = the main pool.', `<textarea data-k="textPoolEn" rows="3" placeholder="one line per row">${esc(Array.isArray(cfg.textPoolEn) ? cfg.textPoolEn.join('\n') : (cfg.textPoolEn || ''))}</textarea>`, 'editor-row')}
      <div class="editor-row inline">
        <label data-help="Each round is a set of buried lines. When all are out, the next round grows in.">Round</label>
        <div class="ig-round-row">
          <select data-k="patchSel">${cfg.patches.map((p, i) => `<option value="${i}" ${i === ui.patchIdx ? 'selected' : ''}>${i + 1} (${(p.lines || []).length} lines)</option>`).join('')}</select>
          <button type="button" data-ig="patchAdd" data-help="Add a round after this one">+</button>
          <button type="button" data-ig="patchUp" data-help="Move this round earlier">↑</button>
          <button type="button" data-ig="patchDel" class="danger-icon-button" data-help="Delete this round">×</button>
        </div>
      </div>
      <div class="editor-grid-2">
        ${row('Fuzz', 'Short words already standing out of pores (pinch and pluck).', `<input data-pk="fuzz" type="number" min="0" max="80" step="1" value="${patch.fuzz ?? 10}">`)}
        ${row('Fuzz words', 'Words for the fuzz, separated by spaces.', `<input data-pk="fuzzWords" type="text" value="${esc(patch.fuzzWords || '')}" placeholder="sí no ya…">`)}
        ${row('Fuzz EN', 'English fuzz words. Empty = the main ones.', `<input data-pk="fuzzWordsEn" type="text" value="${esc(patch.fuzzWordsEn || '')}" placeholder="yes no so…">`)}
        ${row('Offset X', 'Where this round lies, in screens across (camera mode only). Empty = next along the camera direction.', `<input data-pk="offsetX" type="number" step="0.1" value="${patch.offset?.x ?? ''}" placeholder="auto">`)}
        ${row('Offset Y', 'Where this round lies, in screens down (camera mode only). Empty = next along the camera direction.', `<input data-pk="offsetY" type="number" step="0.1" value="${patch.offset?.y ?? ''}" placeholder="auto">`)}
        ${row('On clear', 'What happens when this round’s lines are all out.', actionSel('data-pk', 'clearAction', clear.action))}
        <div class="editor-row inline" style="display:${clear.action === 'none' ? 'none' : 'grid'}"><label>Target</label><input data-pk="clearTarget" type="text" list="${dl}" value="${esc(clear.target)}"></div>
      </div>
      <div class="ig-lines tie-list">${patch.lines.map(lineHtml).join('')}</div>
      <div class="editor-actions"><button type="button" data-ig="lineAdd" data-help="Add a buried line to this round">+ Line</button></div>
      <datalist id="${dl}">${(api.blockIds || []).map(id => `<option value="${esc(id)}"></option>`).join('')}</datalist>
    </div>`;

  let timer = 0;
  const changed = (remount = true, rerender = false, wait = 0) => {
    clearTimeout(timer);
    const go = () => { api.onChange(cfg, { remount }); if (rerender) renderIngrownEditor(root, cfg, api); };
    if (wait) timer = setTimeout(go, wait); else go();
  };
  const val = el => (el.type === 'checkbox' ? el.checked : el.value);
  const evName = el => (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color' ? 'change' : 'input');

  root.querySelectorAll('[data-k]').forEach(el => el.addEventListener(evName(el), e => {
    const k = el.dataset.k, v = val(el);
    if (k === 'patchSel') { ui.patchIdx = Number(v); ui.lineIdx = -1; api.onShowPatch?.(ui.patchIdx); renderIngrownEditor(root, cfg, api); return; }
    if (k === 'completeAction' || k === 'completeTarget') {
      setAction(cfg, 'onComplete', root.querySelector('[data-k="completeAction"]').value, root.querySelector('[data-k="completeTarget"]').value.trim());
      changed(true, k === 'completeAction'); return;
    }
    if (k === 'textPool' || k === 'textPoolEn') { const list = String(v).split('\n').map(s => s.trim()).filter(Boolean); if (list.length || k === 'textPool') cfg[k] = list; else delete cfg[k]; }
    else if (el.type === 'number') { if (v === '') delete cfg[k]; else cfg[k] = Number(v); }
    else if (el.type === 'text' && !String(v).trim()) delete cfg[k];
    else cfg[k] = v;
    changed(true, false, e.type === 'input' ? 450 : 0);
  }));
  root.querySelectorAll('[data-pk]').forEach(el => el.addEventListener(evName(el), e => {
    const k = el.dataset.pk, v = val(el);
    if (k === 'clearAction' || k === 'clearTarget') {
      setAction(patch, 'onClear', root.querySelector('[data-pk="clearAction"]').value, root.querySelector('[data-pk="clearTarget"]').value.trim());
      changed(true, k === 'clearAction'); return;
    }
    if (k === 'offsetX' || k === 'offsetY') {
      const ox = root.querySelector('[data-pk="offsetX"]').value, oy = root.querySelector('[data-pk="offsetY"]').value;
      if (ox === '' && oy === '') delete patch.offset; else patch.offset = { x: Number(ox) || 0, y: Number(oy) || 0 };
      changed(true, false, e.type === 'input' ? 450 : 0); return;
    }
    patch[k] = el.type === 'number' ? Number(v) || 0 : v;
    changed(true, false, e.type === 'input' ? 450 : 0);
  }));
  root.querySelectorAll('.ig-line').forEach(item => {
    const i = Number(item.dataset.li), line = patch.lines[i];
    item.addEventListener('focusin', () => {
      if (ui.lineIdx === i) return;
      ui.lineIdx = i; root.querySelectorAll('.ig-line').forEach(x => x.classList.toggle('is-selected', x === item)); api.onSelectLine?.(i);
    });
    item.querySelectorAll('[data-lk]').forEach(el => el.addEventListener(evName(el), e => {
      const k = el.dataset.lk, v = val(el);
      if (k === 'lineAction' || k === 'lineTarget') {
        const a = item.querySelector('[data-lk="lineAction"]').value;
        setAction(line, 'onExtract', a, item.querySelector('[data-lk="lineTarget"]').value.trim());
        item.querySelector('.ig-line-target').style.display = a === 'none' ? 'none' : 'grid';
        changed(false); return;
      }
      if (el.type === 'checkbox') { if (v) line[k] = true; else delete line[k]; }
      else if (el.type === 'number') { if (v === '') delete line[k]; else line[k] = Number(v); }
      else if ((k === 'twin' || k === 'textEn' || k === 'twinEn') && !String(v).trim()) delete line[k];
      else line[k] = v;
      changed(true, false, e.type === 'input' ? 500 : 0);
    }));
    item.querySelector('.ig-line-del').addEventListener('click', () => { patch.lines.splice(i, 1); ui.lineIdx = -1; changed(true, true); });
    item.querySelector('.ig-line-dup').addEventListener('click', () => { const c = structuredClone(line); delete c.x; delete c.y; patch.lines.splice(i + 1, 0, c); ui.lineIdx = i + 1; changed(true, true); });
  });
  root.querySelectorAll('[data-ig-tool]').forEach(b => b.addEventListener('click', () => {
    ui.tool = ui.tool === b.dataset.igTool ? 'off' : b.dataset.igTool;
    api.onTool?.(ui.tool); renderIngrownEditor(root, cfg, api);
  }));
  root.querySelectorAll('[data-ig]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.ig;
    if (a === 'restart') { api.onRestart?.(); return; }
    if (a === 'disable') { api.onDisable?.(); return; }
    if (a === 'auto') { patch.lines.forEach(l => { delete l.x; delete l.y; delete l.angle; }); changed(true, true); return; }
    if (a === 'lineAdd') { patch.lines.push({ text: 'una línea nueva bajo la página', type: 'arc' }); ui.lineIdx = patch.lines.length - 1; changed(true, true); return; }
    if (a === 'patchAdd') { cfg.patches.splice(ui.patchIdx + 1, 0, { fuzz: patch.fuzz ?? 10, fuzzWords: patch.fuzzWords || '', lines: [{ text: 'otra frase, más adentro', type: 'arc' }] }); ui.patchIdx += 1; ui.lineIdx = -1; changed(true, true); api.onShowPatch?.(ui.patchIdx); return; }
    if (a === 'patchUp' && ui.patchIdx > 0) { const [p] = cfg.patches.splice(ui.patchIdx, 1); cfg.patches.splice(ui.patchIdx - 1, 0, p); ui.patchIdx -= 1; changed(true, true); return; }
    if (a === 'patchDel' && cfg.patches.length > 1) { cfg.patches.splice(ui.patchIdx, 1); ui.patchIdx = Math.max(0, ui.patchIdx - 1); ui.lineIdx = -1; changed(true, true); }
  }));
  if (ui.lineIdx >= 0) root.querySelector(`.ig-line[data-li="${ui.lineIdx}"]`)?.scrollIntoView?.({ block: 'nearest' });
}
