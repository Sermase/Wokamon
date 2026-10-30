import { useState } from 'react';
import { IS_DEMO, session$, setPref } from '../data/store.js';
import { RULES } from '../game/creatures.js';
import { GiftIcon } from '../ui/Icons.jsx';
import { Sheet, fmt } from '../ui/kit.jsx';

export default function Settings({ open, onClose, session, prefs, steps, stepService, onRedeem }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [askOut, setAskOut] = useState(false);
  const guest = session.mode === 'guest';

  const signIn = async (method) => {
    if (method !== 'google' && (!id.trim() || password.length < 6)) {
      setMessage('Escribe tu usuario o email y una contraseña de al menos 6 caracteres.');
      return;
    }
    setBusy(true);
    setMessage('');
    const res = await session$.signIn(method, id, password);
    setBusy(false);
    if (!res.ok) setMessage(res.message);
    else onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Ajustes">
      <section className="card stack">
        <h3>Tu cuenta</h3>
        {guest ? (
          <>
            <p className="muted">Juegas como invitado: la partida solo está en este dispositivo.</p>
            {!IS_DEMO && !authOpen && <button className="btn sun block" onClick={() => setAuthOpen(true)}>Guardar mi partida en una cuenta</button>}
            {authOpen && (
              <div className="stack">
                <button className="btn sun block" disabled={busy} onClick={() => signIn('google')}>Continuar con Google</button>
                <div className="divider">o con usuario</div>
                <input className="field" placeholder="Usuario o email" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} />
                <input className="field" type="password" placeholder="Contraseña (mín. 6)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="row">
                  <button className="btn grow" disabled={busy} onClick={() => signIn('signup')}>Crear cuenta</button>
                  <button className="btn grow" disabled={busy} onClick={() => signIn('signin')}>Ya tengo cuenta</button>
                </div>
                <p className="muted small">Si la cuenta es nueva, se lleva tu partida de invitado. Si ya tenía una partida, se usará la de la cuenta.</p>
                {message && <p className="error-text">{message}</p>}
              </div>
            )}
          </>
        ) : (
          <>
            <p><strong>{session.user?.name}</strong>{session.user?.email && !session.user.email.endsWith('@wokamon.com') ? <span className="muted"> ({session.user.email})</span> : null}</p>
            <p className="muted small">
              {session.error === 'save' ? 'No se ha podido guardar en la nube. Se reintentará con el siguiente cambio.'
                : session.saving ? 'Guardando…'
                  : session.lastSavedAt ? `Partida guardada en la nube a las ${new Date(session.lastSavedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`
                    : 'Tu partida se guarda en la nube automáticamente.'}
            </p>
          </>
        )}
        {!IS_DEMO && (
          <button className="btn block" onClick={() => (askOut ? session$.signOut() : setAskOut(true))}>
            {askOut ? (guest ? 'Sí, salir (la partida queda en este móvil)' : 'Sí, cerrar sesión') : guest ? 'Salir del modo invitado' : 'Cerrar sesión'}
          </button>
        )}
      </section>

      <section className="card stack">
        <h3>Contador de pasos</h3>
        <p className="muted small">
          {steps.status === 'on'
            ? (steps.source === 'native' ? 'Usa el sensor de pasos del móvil: cuenta aunque cierres la app.' : 'Usa el acelerómetro: cuenta mientras la app está abierta.')
            : steps.status === 'unavailable' ? 'Este dispositivo no tiene sensor de movimiento.'
              : steps.status === 'denied' ? 'Has denegado el permiso. Puedes darlo en los ajustes del sistema.'
                : 'Está apagado.'}
        </p>
        {steps.status === 'on'
          ? <button className="btn block" onClick={() => stepService.current?.stop()}>Dejar de contar</button>
          : <button className="btn meadow block" onClick={() => stepService.current?.start(true)}>Contar mis pasos</button>}
      </section>

      <section className="card stack">
        <label className="row" style={{ justifyContent: 'space-between', fontWeight: 700 }}>
          Herramientas de prueba
          <input type="checkbox" checked={prefs.devTools} onChange={(e) => setPref('devTools', e.target.checked)} style={{ width: 24, height: 24, accentColor: 'var(--ink)' }} />
        </label>
        <p className="muted small">Añade botones para sumar pasos, cristales o pasar un día. Útil para probar sin caminar.</p>
      </section>

      <button className="btn block" onClick={onRedeem}><GiftIcon width="22" />Canjear un código</button>

      <section className="card stack">
        <h3>Cómo se juega</h3>
        <ol className="rules">
          <li>Cada paso que das es energía. Además, cada {fmt(RULES.stepsPerCrystal)} pasos ganas un cristal.</li>
          <li>Cada Wokamon necesita su ración diaria de pasos ({fmt(RULES.baseNeed.Niño)} de niño, {fmt(RULES.baseNeed.Adulto)} de adulto). Dale de comer o, a las 5:00, se repartirá sola la energía que te sobre.</li>
          <li>Si se queda sin ración varios días enferma, pierde salud y puede acabar convertido en fantasma.</li>
          <li>Comer le hace crecer. En el nivel {RULES.adultLevel} (o con {RULES.adultAge} días) es adulto y puede criar.</li>
          <li>Para criar, dad un paseo de cortejo de {fmt(RULES.courtshipSteps)} pasos con una pareja salvaje o la de un amigo. El huevo se incuba caminando.</li>
          <li>Las crías heredan un alelo de cada progenitor. Cuanto más mestizas, más rápido crecen.</li>
        </ol>
      </section>
      <p className="muted small" style={{ textAlign: 'center' }}>Wokamon 2.0</p>
    </Sheet>
  );
}
