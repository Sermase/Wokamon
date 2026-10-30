import { useMemo, useState } from 'react';
import { session$, IS_DEMO } from '../data/store.js';
import { Creature } from '../art/Creature.jsx';
import { HabitatScene } from '../art/Habitat.jsx';
import { babyGenotype, randomGenotype, sanitizeGenotype } from '../game/genetics.js';
import { partOfDay } from '../game/time.js';

export default function Welcome({ error }) {
  const [mode, setMode] = useState(null); // null | signin | signup
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(error ? 'No se pudo conectar con tu partida. Comprueba la conexión y vuelve a intentarlo.' : '');
  const crowd = useMemo(() => [
    sanitizeGenotype(randomGenotype()),
    babyGenotype(),
    sanitizeGenotype(randomGenotype()),
  ], []);

  const run = async (method) => {
    setBusy(true);
    setMessage('');
    const res = await session$.signIn(method, id, password);
    setBusy(false);
    if (!res.ok) setMessage(res.message);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!id.trim() || password.length < 6) {
      setMessage('Escribe tu usuario o email y una contraseña de al menos 6 caracteres.');
      return;
    }
    run(mode);
  };

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <HabitatScene part={partOfDay()} />
        <div style={{ position: 'absolute', top: 22, left: 22, right: 22 }}>
          <div className="welcome-title">Wokamon</div>
          <p className="welcome-tag">Camina para criar criaturas únicas con tus pasos de verdad.</p>
        </div>
        <div className="welcome-crowd">
          {crowd.map((g, i) => <Creature key={i} genotype={g} seed={`welcome${i}`} stage={i === 1 ? 'Niño' : 'Adulto'} />)}
        </div>
      </div>

      {error && (
        <div className="stack">
          <p className="error-text">{message}</p>
          <button className="btn sun block" onClick={() => session$.retry()}>Reintentar</button>
        </div>
      )}

      {!error && !mode && (
        <div className="stack">
          {!IS_DEMO && (
            <>
              <button className="btn sun block" disabled={busy} onClick={() => run('google')}>Continuar con Google</button>
              <button className="btn block" disabled={busy} onClick={() => setMode('signin')}>Entrar con usuario o email</button>
              <div className="divider">o</div>
            </>
          )}
          <button className="btn meadow block" onClick={() => session$.playAsGuest()}>Probar sin cuenta</button>
          <p className="muted small" style={{ textAlign: 'center' }}>Sin cuenta, la partida se guarda solo en este dispositivo. Puedes pasarla a una cuenta más tarde.</p>
          {message && <p className="error-text">{message}</p>}
        </div>
      )}

      {!error && mode && (
        <form className="card stack" onSubmit={submit}>
          <h2>{mode === 'signin' ? 'Entrar' : 'Crear cuenta'}</h2>
          <label className="field-label">
            Usuario o email
            <input className="field" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} placeholder="tu nombre o tu@email.com" />
          </label>
          <label className="field-label">
            Contraseña
            <input className="field" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {message && <p className="error-text">{message}</p>}
          <button className="btn sun block" type="submit" disabled={busy}>{busy ? 'Conectando…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}</button>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn ghost" onClick={() => { setMode(null); setMessage(''); }}>Volver</button>
            <button type="button" className="btn ghost" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>
              {mode === 'signin' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
