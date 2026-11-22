import { useMemo, useState } from 'react';
import { session$, IS_DEMO } from '../data/store.js';
import { Creature } from '../art/Creature.jsx';
import { HabitatScene } from '../art/Habitat.jsx';
import { babyGenotype, sanitizeGenotype } from '../game/genetics.js';
import { partOfDay } from '../game/time.js';

export default function Welcome({ error }) {
  const [mode, setMode] = useState(null); // null | signin | signup
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(error ? 'No se pudo conectar con tu partida. Comprueba la conexión y vuelve a intentarlo.' : '');
  const crowd = useMemo(() => {
    const base = babyGenotype();
    const col = (h, l, sat = 78, belly = 45) => ({ ...base.colorGenes, huePrimary: [h, h], lightPrimary: [l, l], satPrimary: [sat, sat], hueSecondary: [belly, belly], hueAccent: [(h + 160) % 360, (h + 160) % 360] });
    const pick = (over) => sanitizeGenotype({ ...base, topAppendage: ['n', 'n'], tailType: ['N', 'N'], ...over });
    const others = [
      [pick({ topAppendage: ['b', 'b'], bodyBase: ['p', 'p'], tailType: ['p', 'p'], colorGenes: col(330, 76) }), { head: 'flower' }],
      [pick({ topAppendage: ['H', 'H'], wings: ['d', 'd'], tailType: ['s', 's'], mouthStyle: ['f', 'f'], colorGenes: col(200, 62) }), null],
      [pick({ topAppendage: ['u', 'u'], wings: ['a', 'a'], bodyBase: ['o', 'o'], colorGenes: col(268, 76, 70) }), null],
      [pick({ topAppendage: ['o', 'o'], markings: ['m', 'm'], tailType: ['f', 'f'], colorGenes: col(28, 56, 60) }), { neck: 'scarf' }],
    ];
    const start = Math.floor(Math.random() * others.length);
    return [others[start], [base, null], others[(start + 1 + Math.floor(Math.random() * 3)) % others.length]];
  }, []);

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
          {crowd.map(([g, outfit], i) => <Creature key={i} genotype={g} outfit={outfit} seed={`welcome${i}`} stage={i === 1 ? 'Niño' : 'Adulto'} age={i === 1 ? 0 : 9} idle />)}
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
