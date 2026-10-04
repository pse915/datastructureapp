import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 중요: base './' (상대경로) + outDir 'build'.
// Streamlit은 build/ 폴더를 그대로 서빙하므로 절대경로('/assets/...')면
// iframe 안에서 깨진다. 반드시 './' 유지. app.py의 BUILD_DIR과 일치시킬 것.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'build', emptyOutDir: true },
  server: { port: 3001 },
});
