# Wokamon 2

Juego de móvil en el que tus pasos de verdad alimentan, hacen crecer y cruzan a unas criaturas con genética mendeliana.

## Cómo se juega

- Cada paso es **energía**; cada 1000 pasos, un **cristal**.
- Cada Wokamon necesita su **ración diaria** de pasos (2500 de niño, 4000 de adulto, ajustada por sus genes). Le das de comer tú o, a las 05:00, se reparte sola la energía que te sobre.
- Sin ración varios días enferma, pierde salud y puede acabar como **fantasma**.
- Comer le hace crecer: a nivel 3 (o a los 7 días) es **adulto** y puede criar.
- **Cortejo**: elige una pareja salvaje (cambia cada mañana) o la de un amigo mediante código, y caminad 5000 pasos. Sale un huevo.
- Los **huevos** se incuban caminando (7500 pasos, la mitad con un adulto de cuidador). Se abren con tres toques.
- **Laboratorio**: edita alelos del huevo con cristales, solo con rasgos que ya hayas descubierto en la **Wokadex**.
- Códigos `WOKA-…` para regalar Wokamon/huevos o compartir uno para cruzar. Se aceptan también los códigos de la versión 1.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173 (galería de criaturas en /dev/gallery.html)
npm test             # lógica del juego, migración y podómetro
npm run build        # dist/ para Firebase Hosting (lo despliega GitHub Actions al hacer merge en main)
npm run build:demo   # dist-demo/index.html: un solo archivo, modo invitado y herramientas de prueba
npm run android      # build + cap sync + abre Android Studio
```

## Estructura

```
src/
  game/       reglas puras: genética, criaturas, motor de acciones, migración v1 → v2 (con tests)
  art/        Wokamon, huevos y escenarios en SVG procedural + animaciones CSS
  data/       estado global, guardado (local o Firestore con debounce) y sesión
  steps/      contador de pasos: sensor nativo de Android o acelerómetro del navegador
  screens/    Inicio, Criadero, Cría, Diario y hojas (ficha, laboratorio, eclosión, ajustes…)
  ui/         iconos y componentes base
android/app/src/main/java/app/wokamon/web/StepCounterPlugin.java   contador de pasos nativo
```

## Datos y compatibilidad

- La partida se guarda en `users/{uid}` dentro del campo `game` (un único documento, escritura agrupada cada pocos segundos, caché offline de Firestore).
- Al entrar con una cuenta de la versión 1, la partida antigua (`user`, `wokamons`, `eggs`, `history`) se convierte automáticamente. No se borra nada de lo antiguo.
- Las cuentas de usuario sin email siguen funcionando (`usuario@wokamon.com`, igual que antes).
- Modo invitado: partida en `localStorage`; si luego creas cuenta, se sube a ella.

## Pasos

- **Android**: plugin propio que lee el contador de pasos por hardware (`TYPE_STEP_COUNTER`). Cuenta aunque la app esté cerrada; al volver se suma la diferencia. Pide el permiso de actividad física (Android 10+).
- **Web / iOS**: acelerómetro con la app abierta. El podómetro filtra la gravedad, busca picos con ritmo de paso y exige 4 pasos seguidos para no contar sacudidas.

## Notas

- Se ha quitado el inicio de sesión con Google Play Games: el SDK web de Firebase no acepta su credencial y en la versión anterior no llegaba a funcionar.
- Fuente: Baloo 2 (SIL Open Font License 1.1).
