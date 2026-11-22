import { useCallback, useEffect, useRef, useState } from 'react';
import { boot, dispatch, onGameEvent, useStore } from './data/store.js';
import { createStepService } from './steps/stepService.js';
import { BreedIcon, CrystalIcon, HomeIcon, JournalIcon, StableIcon, EggIcon, HangerIcon } from './ui/Icons.jsx';
import { setSoundEnabled, sfx } from './ui/sfx.js';
import { Toasts, toast } from './ui/kit.jsx';
import { Creature } from './art/Creature.jsx';
import Welcome from './screens/Welcome.jsx';
import Home from './screens/Home.jsx';
import Stable from './screens/Stable.jsx';
import Breed from './screens/Breed.jsx';
import Journal from './screens/Journal.jsx';
import CreatureSheet from './screens/CreatureSheet.jsx';
import Settings from './screens/Settings.jsx';
import { CodeSheet, RedeemSheet } from './screens/Codes.jsx';
import LabSheet from './screens/LabSheet.jsx';
import Hatch from './screens/Hatch.jsx';
import DayReport from './screens/DayReport.jsx';
import Moment from './screens/Moment.jsx';

const TABS = [
  { id: 'home', label: 'Inicio', Icon: HomeIcon },
  { id: 'stable', label: 'Criadero', Icon: StableIcon },
  { id: 'breed', label: 'Cría', Icon: BreedIcon },
  { id: 'journal', label: 'Diario', Icon: JournalIcon },
];

export default function App() {
  const { game, session, prefs } = useStore();
  const [tab, setTab] = useState('home');
  const [breedView, setBreedView] = useState('courtship');
  const [creatureId, setCreatureId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [code, setCode] = useState(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [labEggId, setLabEggId] = useState(null);
  const [hatchEggId, setHatchEggId] = useState(null);
  const [report, setReport] = useState(null);
  const [moment, setMoment] = useState(null);
  const [reactions, setReactions] = useState({});
  const [steps, setSteps] = useState({ status: 'off', source: 'motion' });
  const stepService = useRef(null);

  const react = useCallback((id, type) => {
    setReactions((r) => ({ ...r, [id]: { type, key: Date.now() + Math.random() } }));
  }, []);

  useEffect(() => { boot(); }, []);
  useEffect(() => { setSoundEnabled(prefs.sound !== false); }, [prefs.sound]);

  // Pasos: el servicio se crea una vez y envía lotes a la partida.
  useEffect(() => {
    const svc = createStepService((n) => dispatch('addSteps', { steps: n }));
    stepService.current = svc;
    const off = svc.subscribe(setSteps);
    return () => { off(); svc.stop(); };
  }, []);

  const ready = session.status === 'ready' && game;
  useEffect(() => {
    if (!ready || !stepService.current) return;
    if (stepService.current.wantsAutoStart() && stepService.current.state.status === 'off') stepService.current.start(false);
  }, [ready]);

  // Cierre del día (05:00) y recogida de pasos al volver a la app.
  useEffect(() => {
    if (!ready) return undefined;
    const tick = () => dispatch('settle');
    const onVisible = () => {
      if (document.hidden) return;
      stepService.current?.resume();
      tick();
    };
    const timer = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [ready]);

  // Traducir eventos del juego a avisos, reacciones y momentos.
  useEffect(() => onGameEvent((e) => {
    switch (e.type) {
      case 'error': sfx.error(); toast(e.text, { kind: 'error' }); break;
      case 'crystals': sfx.coin(); toast(`+${e.amount} ${e.amount === 1 ? 'cristal' : 'cristales'}`, { icon: <CrystalIcon />, ms: 1800 }); break;
      case 'fed': sfx.eat(); react(e.id, 'eat'); break;
      case 'played': sfx.play(); react(e.id, 'play'); break;
      case 'cured': sfx.pet(); react(e.id, 'pet'); toast(`${e.name} ya se encuentra mejor.`); break;
      case 'bought': sfx.coin(); toast(`${e.name}: ¡ya es tuyo!`, { icon: <HangerIcon /> }); break;
      case 'wore': react(e.id, 'pet'); sfx.tap(); break;
      case 'died': sfx.sad(); break;
      case 'levelUp':
        sfx.level();
        react(e.id, 'level');
        toast(`${e.name} sube a nivel ${e.level} (+${e.crystals} cristales)`, { icon: <CrystalIcon /> });
        break;
      case 'grownUp': setMoment({ kind: 'grownUp', id: e.id, title: `¡${e.name} ya es adulto!`, text: 'Ahora puede buscar pareja en Cría y cuidar huevos.' }); break;
      case 'newFriend':
        setMoment(e.first
          ? { kind: 'friend', id: e.id, title: '¡Ha llegado Woki Bebé!', text: 'Tus primeros pasos lo han atraído. Cada paso que das es energía para darle de comer.' }
          : { kind: 'friend', id: e.id, title: `${e.name} te ha seguido`, text: 'Un Wokamon perdido te ha visto caminar y se ha quedado contigo.' });
        break;
      case 'eggLaid': sfx.egg(); setMoment({ kind: 'egg', eggId: e.eggId, title: '¡Un huevo!', text: `${e.parentA} y ${e.parentB} han terminado su paseo. Camina para incubarlo.` }); break;
      case 'eggReady': toast('Un huevo está a punto de abrirse.', { icon: <EggIcon /> }); break;
      case 'code': setCode(e); break;
      case 'partnerReady': toast(`${e.name} está listo para cruzar.`); setTab('breed'); setBreedView('courtship'); break;
      case 'received': toast(e.what === 'egg' ? 'Has recibido un huevo.' : `${e.name} ha llegado a tu criadero.`, { icon: <EggIcon /> }); break;
      case 'settled': setReport(e.report); break;
      default: break;
    }
  }), [react]);

  const goBreed = (view) => { setTab('breed'); setBreedView(view); };

  if (session.status === 'booting' || session.status === 'loading') {
    return (
      <main className="app">
        <div className="center-screen">
          <div>
            <div className="loader"><Creature genotype={LOADER_GENO} seed="loader" sleeping /></div>
            <p className="muted">Despertando a tus Wokamon…</p>
          </div>
        </div>
      </main>
    );
  }

  if (session.status === 'welcome' || session.status === 'error' || !game) {
    return (
      <main className="app" style={{ paddingBottom: 24 }}>
        <Toasts />
        <Welcome error={session.status === 'error' ? session.error : null} />
      </main>
    );
  }

  const openCreature = (id) => setCreatureId(id);

  return (
    <>
      <Toasts />
      <main className="app">
        {tab === 'home' && (
          <Home
            game={game}
            session={session}
            prefs={prefs}
            steps={steps}
            reactions={reactions}
            onPet={(id) => { dispatch('pet', { id }); sfx.pet(); react(id, 'pet'); }}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenCreature={openCreature}
            onStartSteps={() => stepService.current?.start(true)}
            onGoBreed={goBreed}
          />
        )}
        {tab === 'stable' && <Stable game={game} onOpen={openCreature} onRedeem={() => setRedeemOpen(true)} />}
        {tab === 'breed' && (
          <Breed game={game} view={breedView} setView={setBreedView} onLab={setLabEggId} onHatch={setHatchEggId} onOpenCreature={openCreature} />
        )}
        {tab === 'journal' && <Journal game={game} onOpenCreature={openCreature} />}
      </main>

      <nav className="tabbar" aria-label="Secciones">
        {TABS.map(({ id, label, Icon }) => {
          const badge = id === 'breed' ? game.eggs.filter((e) => e.points >= e.target).length : 0;
          return (
            <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => { setTab(id); window.scrollTo({ top: 0 }); }} aria-current={tab === id ? 'page' : undefined}>
              <Icon on={tab === id} />
              <span>{label}</span>
              {badge > 0 && <span className="badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <CreatureSheet
        game={game}
        id={creatureId}
        reaction={creatureId ? reactions[creatureId] : null}
        onClose={() => setCreatureId(null)}
        onPet={(id) => { dispatch('pet', { id }); sfx.pet(); react(id, 'pet'); }}
        onOpenCreature={openCreature}
      />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} session={session} prefs={prefs} steps={steps} stepService={stepService} onRedeem={() => { setSettingsOpen(false); setRedeemOpen(true); }} />
      <CodeSheet code={code} onClose={() => setCode(null)} />
      <RedeemSheet open={redeemOpen} onClose={() => setRedeemOpen(false)} />
      <LabSheet game={game} eggId={labEggId} onClose={() => setLabEggId(null)} />
      {hatchEggId && <Hatch game={game} eggId={hatchEggId} onDone={(id) => { setHatchEggId(null); if (id) { setTab('home'); dispatch('setFavorite', { id }); } }} />}
      {report && !moment && <DayReport game={game} report={report} onClose={() => setReport(null)} />}
      {moment && (
        <Moment
          game={game}
          moment={moment}
          onClose={() => setMoment(null)}
          onAction={moment.kind === 'egg' ? () => { setMoment(null); goBreed('incubator'); } : moment.kind === 'grownUp' ? () => { setMoment(null); goBreed('courtship'); } : null}
        />
      )}
    </>
  );
}

const LOADER_GENO = {
  bodyBase: ['R', 'R'], bodyProportion: ['B', 'B'], limbType: ['S', 'S'], headMerge: ['I', 'I'], topAppendage: ['e', 'e'],
  tailType: ['p', 'p'], bellyShape: ['O', 'O'], eyeShape: ['R', 'R'], pupilStyle: ['D', 'D'], mouthStyle: ['S', 'S'],
  surfaceType: ['S', 'S'], metabolism: ['n', 'n'], longevity: ['n', 'n'], diseaseResilience: ['n', 'n'], vitalityStorage: ['n', 'n'],
  colorGenes: { huePrimary: [222, 222], satPrimary: [80, 80], lightPrimary: [70, 70], hueSecondary: [45, 45], satSecondary: [90, 90], lightSecondary: [85, 85], hueAccent: [340, 340], patternContrast: [0.1, 0.1] },
};

