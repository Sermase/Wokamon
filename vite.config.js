import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:demo` genera un único index.html autocontenido (modo invitado,
// herramientas de prueba activas) para enseñar el juego sin Firebase.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'demo' ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === 'demo' ? 'dist-demo' : 'dist',
    assetsInlineLimit: mode === 'demo' ? 100000000 : 4096,
  },
  test: {
    environment: 'node',
  },
}));
