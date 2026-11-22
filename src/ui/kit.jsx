import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, CrystalIcon, EnergyIcon } from './Icons.jsx';

export const fmt = (n) => Math.round(n || 0).toLocaleString('es-ES');

export function Meter({ label, value, max = 100, color = 'var(--meadow)', text }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <div className="meter">
      <span>{label}</span>
      <div className="meter-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
        <div className={`meter-fill ${pct < 1 ? 'zero' : ''}`} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="meter-value num">{text ?? `${Math.round(pct)} %`}</span>
    </div>
  );
}

export function Cost({ energy, crystals }) {
  return (
    <span className="sub">
      {energy != null && <><EnergyIcon width="16" height="16" /> {fmt(energy)}</>}
      {crystals != null && <><CrystalIcon width="16" height="16" /> {fmt(crystals)}</>}
    </span>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children, label }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label || title} tabIndex={-1} ref={ref}>
        <div className="sheet-grab" />
        {(title || onClose) && (
          <div className="sheet-head">
            {title ? <h2>{title}</h2> : <span />}
            {onClose && (
              <button className="btn icon-btn small" onClick={onClose} aria-label="Cerrar">
                <CloseIcon width="20" height="20" />
              </button>
            )}
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

let toastId = 0;
const toastListeners = new Set();
export function toast(text, { kind = 'info', icon = null, ms = 2600 } = {}) {
  const t = { id: ++toastId, text, kind, icon, ms };
  toastListeners.forEach((l) => l(t));
}

export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const add = (t) => {
      setItems((list) => [...list.slice(-2), t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), t.ms);
    };
    toastListeners.add(add);
    return () => toastListeners.delete(add);
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          {t.icon}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export async function shareOrCopy(text, title = 'Wokamon') {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
