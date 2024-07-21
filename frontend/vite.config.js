import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  preview: {
   port: 5174,
   strictPort: true,
  },
  server: {
   port: 5174,
   strictPort: true,
   host: true,
   origin: "http://0.0.0.0:5174",
  },
 });
