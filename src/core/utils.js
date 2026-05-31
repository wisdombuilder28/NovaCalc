export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function formatNumber(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return String(n);
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) {
    return n.toExponential(8).replace(/\.?0+e/, 'e');
  }
  // Round to 12 sig figs to hide FP dust like 0.1+0.2
  const s = Number(n.toPrecision(12)).toString();
  return s;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'html') node.innerHTML = v; // only used with trusted strings
    else if (v === false || v == null) continue;
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}
