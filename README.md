# NovaCalc — Standalone Build

Pure vanilla HTML / CSS / JS. No build step, no framework.

## Run locally

ES modules require a server (you can't just double-click `index.html`).
Pick any one of these from this folder:

    npx serve .
    # or
    python3 -m http.server 8000
    # or
    php -S localhost:8000

Then open http://localhost:8000

## Structure

    index.html              # entry — loads KaTeX from CDN + ./src/main.js
    manifest.webmanifest    # PWA manifest
    sw.js                   # service worker (offline cache)
    icons/                  # PWA icons
    src/
      main.js               # bootNovaCalc(host)
      styles.css            # all themes + layout
      core/                 # state, constants, dom utils
      parser/               # tokenizer, Pratt parser, AST, evaluator
      engine/               # math functions, LaTeX, numeric solver
      graph/                # custom Canvas plotting engine
      ui/                   # calculator, graph, solver, command palette
      themes/               # OLED / Casio / Hacker / Neon
      storage/              # IndexedDB history
      pwa/                  # service worker registration

## Shortcuts

- Ctrl/Cmd + K — command palette
- Ctrl/Cmd + / — Calculator
- Ctrl/Cmd + G — Graph
- Ctrl/Cmd + S — Solver
- Ctrl/Cmd + T — cycle theme

## Notes

- KaTeX is loaded from jsDelivr. For full offline use, vendor it locally
  and update the `<link>` / `<script>` tags in `index.html`.
- The service worker only registers on real hosts (not in iframes/preview).
