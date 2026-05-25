# Web Alpha

The Astro-based web alpha for the early-literacy engine. Not yet scaffolded — see `../../ARCHITECTURE.md` Milestone 3.

## Planned

A single-page paste-and-analyze interface:

- Paste a manuscript
- Select target age band
- See a developmental readability report
- Surfaced as a ZPD filter for LLM-generated content

Deployed under an `slpio.org` subdomain. No auth, no persistence in v1.

## Stack (planned)

- Astro
- @harmonic-systems/early-literacy as a workspace dependency
- Tailwind for styling (matching slpio.org)
