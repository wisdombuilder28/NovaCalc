// KaTeX live-preview. KaTeX loaded lazily from CDN, cached by SW once installed.
import { parse } from '../parser/parser.js';
import { astToLatex } from '../engine/latex.js';

let katexPromise = null;

function loadKatex() {
  if (katexPromise) return katexPromise;
  katexPromise = new Promise((resolve, reject) => {
    if (window.katex) { resolve(window.katex); return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
    script.onload = () => resolve(window.katex);
    script.onerror = () => reject(new Error('Failed to load KaTeX'));
    document.head.appendChild(script);
  });
  return katexPromise;
}

// Pre-warm KaTeX so the first render is instant.
export function warmupPreview() {
  loadKatex().catch(() => {});
}

export async function renderPreview(target, expression) {
  if (!expression || !expression.trim()) {
    target.textContent = '';
    return;
  }
  let latex;
  try {
    latex = astToLatex(parse(expression));
  } catch {
    // Show raw expression in a dim style when it can't parse yet.
    target.textContent = expression;
    return;
  }
  try {
    const katex = await loadKatex();
    katex.render(latex, target, {
      throwOnError: false,
      displayMode: true,
      output: 'html',
    });
  } catch {
    target.textContent = expression;
  }
}

export async function renderLatex(target, latex, displayMode = true) {
  try {
    const katex = await loadKatex();
    katex.render(latex, target, { throwOnError: false, displayMode, output: 'html' });
  } catch {
    target.textContent = latex;
  }
}
