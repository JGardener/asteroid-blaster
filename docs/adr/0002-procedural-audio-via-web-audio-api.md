# Procedural audio via Web Audio API, no bundled assets

All game audio — sound effects and background music — is generated at runtime using the browser's Web Audio API (oscillators, noise buffers, gain envelopes). No `.mp3`, `.ogg`, or `.wav` files are bundled.

The game is published as an npm package with a wireframe visual aesthetic. Bundling audio assets would add meaningful package weight, require an asset pipeline, and introduce format/codec concerns for the consuming portfolio. The Web Audio API is universally supported and produces synthesized bleeps and tones that are tonally correct for the retro wireframe aesthetic — indistinguishable from "intentional" rather than "couldn't afford assets."

Background music is a procedurally generated arpeggio whose tempo and harmonic density increase with level, reinforcing the escalating difficulty without requiring multiple music tracks.

## Considered options

- **Bundled `.mp3` files** — rejected because of package weight, asset pipeline overhead, and codec compatibility concerns across consumers.
- **External CDN audio** — rejected because it introduces a network dependency and latency in a self-contained package.
- **No audio** — rejected because audio is responsible for a significant share of perceived game quality; a silent wireframe game reads as a tech demo, not a finished product.
