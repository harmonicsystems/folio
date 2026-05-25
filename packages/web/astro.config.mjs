import { defineConfig } from 'astro/config';

// Custom-domain deploy via GitHub Pages. CNAME lives in `public/CNAME`.
// DNS: CNAME `folio.harmonic-systems.org` → `harmonicsystems.github.io`.
export default defineConfig({
  site: 'https://folio.harmonic-systems.org',
});
