# AGENTS.md

## Cursor Cloud specific instructions

This is a collection of standalone static HTML pages (no build system, no package manager, no backend). Each `.html` file is a self-contained page with inline CSS and JS.

### Serving the pages

Run from `/workspace`:

```
python3 -m http.server 8080
```

All pages are then available at `http://localhost:8080/<filename>.html`.

### Pages

| File | Description |
|---|---|
| `index.html` | Retro vinyl music player (uses external MP3s from soundhelix.com) |
| `music_player.html` | "Eternal Memory" music player variant |
| `ar_shanghai.html` | Shanghai Phantom AR collectible card platform |
| `taiwei_machinery.html` | Taiwei Machinery corporate website |
| `README.html` | Animated envelope/letter UI |
| `shanghai-phantom/index.html` | Extended Shanghai Phantom page (uses Font Awesome CDN) |

### Notes

- No lint, test, or build commands exist — there are no dependencies to install.
- External resources (images from Unsplash/picsum, audio from SoundHelix, Font Awesome CDN) require internet access.
- All content is in Chinese (Simplified).
