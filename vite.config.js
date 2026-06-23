import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Portal is served from crea8ivmedia.com/clinic/ — assets must resolve there.
  // Custom-domain (root) builds override this with `vite build --base=/`.
  base: '/clinic/',
  plugins: [react()],
})
