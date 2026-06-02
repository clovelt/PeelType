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
