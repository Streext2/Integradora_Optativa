import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// build/ para que coincida con `aws s3 sync build/ s3://<BUCKET>`
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'build' },
  server: { port: 5173, open: true },
});
