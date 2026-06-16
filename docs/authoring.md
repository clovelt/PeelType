# Authoring PeelType Scenes

PeelType scenes are JSON configurations that describe text blocks, layout, peel behavior, physics, events, illustrations, and optional branching state.

## Start From The Editor

1. Run `npm start`.
2. Open `http://localhost:4242/tirita.html`.
3. Open the editor.
4. Choose an existing scene as a base or create a new one.
5. Edit text, styles, behavior, events, and assets.
6. Press **Save (↓)** to write the scene to disk (local server), or export the JSON manually.

Use `Freeze` while making layout changes, then unfreeze to test the interaction.

## Text Tags

Text supports lightweight BBCode-style tags:

```text
[b]bold[/b]
[i]italic[/i]
[s]struck[/s]
[color=#e24a4a]colored[/color]
[size=1.4]larger[/size]
[font=serif]font shift[/font]
[shake]shaking text[/shake]
[float]floating text[/float]
[wave]waving text[/wave]
[nopeel]fixed text[/nopeel]
```

Tags can be combined with peel modes to make the interaction carry the meaning of a sentence.

## Layers (matrioska)

A stack of blocks can sit on the same spot and be peeled one beneath another — skin, flesh, memory, explanation. Enable it under the editor's **Behavior → Layers** group, then give each block in the stack a layer group and depth:

```json
{ "behaviors": { "layers": { "enabled": true, "bleedThrough": true, "hideCompleted": true, "revealOpacity": 1 } } }
```

```json
{ "id": "skin",        "layer": { "group": "onion", "depth": 0 }, "...": "..." }
{ "id": "flesh",       "layer": { "group": "onion", "depth": 1 }, "...": "..." }
{ "id": "memory",      "layer": { "group": "onion", "depth": 2, "revealOpacity": 0.9 }, "...": "..." }
{ "id": "explanation", "layer": { "group": "onion", "depth": 3 }, "...": "..." }
```

- Blocks sharing a `layer.group` stack on the surface block's position instead of flowing down the page. Depth `0` is the surface (peeled first); higher numbers sit deeper.
- Only the shallowest incomplete layer is interactive. **Bleed through** fades the next layer in as you strip the active one; turn it off to keep the deeper layer hidden until the one above is fully gone.
- **Hide peeled** removes a layer once completed so the one beneath stands alone. **Reveal opacity** (global or per-block via `layer.revealOpacity`) sets how solid a revealed layer becomes.
- A deeper layer can use `[nopeel]` words or multiple `peelPoints` so peeling it only opens *parts* of what lies underneath. See the `Layers (matrioska)` example scene.

## Tangled Strips (maraña)

Pre-peeled strips (each block's `initialUnlockCount` letters, dangling from its locked frontier) can spawn already tangled with each other. At spawn the strands are woven around one another following the crossings list and pre-settled, so frame 0 hangs in equilibrium. Each crossing is a physical contact that slides along both strands: pull a strand taut — or pull the strands apart — and the twist migrates toward the free tips until it slips off, outermost first. Releasing every crossing fires `onUntangle`. Configure under **Behavior → Tangled lines** or in JSON:

```json
{ "tangledLines": [{
  "id": "twist",
  "strands":   [ { "block": "col-a", "endpoint": "end", "color": "#7a4a2a", "width": 3 },
                 { "block": "col-b", "endpoint": "end", "color": "#2a5a4a", "width": 3 } ],
  "crossings": [ { "a": 0, "b": 1, "aFrac": 0.35, "bFrac": 0.35 },
                 { "a": 0, "b": 1, "aFrac": 0.60, "bFrac": 0.60 },
                 { "a": 0, "b": 1, "aFrac": 0.85, "bFrac": 0.85 } ],
  "onUntangle": { "action": "revealBlock", "target": "hidden-block" }
}] }
```

- `aFrac`/`bFrac` place each crossing along the strand (0 = root by the locked text, 1 = free tip). Crossings on the same strand can't pass each other, so they release tip-first.
- Give the tangled blocks `peel: { unlockThreshold: 60, longStripAssist: false }` so working the tangle doesn't unzip the text — the strip needs its locked root anchored to build tension.
- Put the source blocks side by side with `groupNext` plus `groupParallel: true` on the anchor (parallel columns; all peel at once, no matrioska ghosting).
- The crossing dot itself is grabbable: dragging it shakes the whole tangle. See the `Tangling: cables` example scene.

## Scene Files

With the local Node server running (`npm start`), saving is automatic. Press the **Save (↓)** button next to the language selector and the active scene is written to its own file in `js/` (named after the scene id, e.g. `js/my-story.json`). The first save of a new scene prompts for its scene-selector label (prefilled with the poem's first line) and registers it in `js/poems.json` for you; the toast confirms the filename and marks it `(new)`. Re-saves overwrite the file and leave the label alone. Then just add assets under `illustrations/`.

Without the local server (static hosting or `file://`), save manually instead:

1. Export JSON from the editor.
2. Save it in `js/`, for example `js/my-story.json`.
3. Add a new entry to `js/poems.json`.
4. Add assets under `illustrations/`.
5. Test with `npm start`.

The built-in `js/peel-after-reading.json` scene is the most complete example.

## Assets

Supported illustration formats:

- SVG
- PNG
- JPG
- GIF

SVG line art can be interpreted as peelable Verlet chains. Animated SVG transforms are supported for certain line-art workflows, so the peelable lines can follow the source drawing.

## Shipping Your Work

You can publish your own non-commercial interactive work made with PeelType. Keep attribution to the framework and include a link back to the repository.
