# Hosting PeelType

PeelType is a static app for playback. Any host that serves files with the correct MIME types can run it.

## Required Files

Upload:

```text
tirita.html
favicon.svg
css/
docs/media/
fonts/
illustrations/
js/
```

## GitHub Pages

Use the repository root as the Pages source. The demo path is:

```text
https://clovelt.github.io/PeelType/tirita.html
```

## Static Hosts

Netlify, Vercel, Cloudflare Pages, itch.io HTML uploads, and normal FTP/SFTP hosts should work.

Requirements:

- Preserve folder paths exactly.
- Serve `.js` files as `text/javascript` or `application/javascript`.
- Revalidate HTML/JS during active development, or bump the cache query in `tirita.html`.

## Local Authoring Versus Static Playback

Static hosting can play scenes and keep browser-local editor state.

The local Node server adds file-saving conveniences for authoring:

- Illustration file picker.
- Drag-and-drop asset saving.
- Poem JSON saving.
- Locale file saving.
