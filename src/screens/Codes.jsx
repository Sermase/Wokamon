import { useState } from 'react';
import { dispatch } from '../data/store.js';
import { Sheet, shareOrCopy, toast } from '../ui/kit.jsx';

export function CodeSheet({ code, onClose }) {
  if (!code) return null;
  const partner = code.kind === 'partner';
  const message = partner
    ? `¡Cruza tu Wokamon con ${code.label}! Pega este código en Cría > De un amigo:\n\n${code.code}`
    : `Te regalo ${code.label} en Wokamon. Canjea este código en el Criadero:\n\n${code.code}`;
  const share = async () => {
    const res = await shareOrCopy(message, 'Wokamon');
    if (res === 'copied') toast('Código copiado. Pégalo en un mensaje a tu amigo.');
    if (res === 'failed') toast('No se ha podido copiar. Selecciona el texto y cópialo a mano.', { kind: 'error' });
  };
  return (
    <Sheet open onClose={onClose} title={partner ? 'Código para cruzar' : 'Código de regalo'}>
      <p className="muted">
        {partner
          ? `Con este código tu amigo podrá usar a ${code.label} como pareja. ${code.label} se queda contigo.`
          : `${code.label.charAt(0).toUpperCase() + code.label.slice(1)} ya ha salido de tu criadero. Si no compartes este código, se perderá.`}
      </p>
      <textarea className="code" readOnly value={code.code} onFocus={(e) => e.target.select()} aria-label="Código" />
      <button className="btn sun block" onClick={share}>Compartir código</button>
    </Sheet>
  );
}

export function RedeemSheet({ open, onClose }) {
  const [code, setCode] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const events = dispatch('redeem', { code });
    if (events.some((ev) => ev.type !== 'error')) {
      setCode('');
      onClose();
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Canjear un código">
      <form className="stack" onSubmit={submit}>
        <p className="muted">Pega el código que te ha enviado un amigo: puede ser un Wokamon, un huevo o una pareja para cruzar.</p>
        <textarea className="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WOKA-…" aria-label="Código" />
        <button className="btn sun block" type="submit" disabled={!code.trim()}>Canjear</button>
      </form>
    </Sheet>
  );
}
