# V8 Engine Explorer

An interactive 3D V8 that runs in the browser. Rotate it, cut it open, explode it, scrub through the 720° four‑stroke cycle one crank degree at a time, and rev it to 8,000 rpm with engine sound built from real Ferrari V8 recordings.

**[Open the live demo](https://ssabeeth.github.io/v8-engine-explorer/)** · [Watch the 70‑second tour (MP4, release asset)](https://github.com/ssabeeth/v8-engine-explorer/releases/latest)

![Transparent engine running, with intake and combustion flow](docs/img/demo.gif)

| | |
|---|---|
| ![Hero view with right-bank cutaway](docs/img/hero.jpg) | ![Front cross-section of the V](docs/img/cross_section.jpg) |
| ![Cylinder 1 on its power stroke](docs/img/four_stroke.jpg) | ![Exploded view](docs/img/exploded.jpg) |

## What it does

- **Mechanically driven.** Every moving part (crankshaft, eight pistons and rods, camshaft, 16 lifters, pushrods, rockers and valves, flywheel, pulleys, timing chain) is positioned from a single crank angle.
- **Cutaway and exploded views.** Section cuts through either bank or across the engine, adjustable shell transparency, and an exploded view that keeps running.
- **Four‑stroke learning mode.** Focuses one cylinder and steps through intake, compression, ignition/power and exhaust with live valve lift and piston position.
- **Timeline scrubber.** A 720° valve‑lift diagram for the selected cylinder that doubles as a scrubber, plus a live firing‑order readout.
- **Component inspector.** Click any part for what it does, what it connects to and what happens when it fails.
- **Engine sound.** Recorded Ferrari V8 loops matched to the crank speed, a free‑rev to the limiter (`V`), and synced combustion pulses in slow motion.
- **Cinematic tour.** A scripted one‑minute presentation mode (`P`) that can also be rendered frame by frame to video.
- **Single file.** `index.html` has no build step for viewers and no server. Three.js loads from a CDN.

## The engine

A 5.7 L small‑block layout: 101.6 mm bore, 88.4 mm stroke, 144.8 mm rods, 90° V, left bank forward, pushrod valvetrain with a 1.5:1 rocker ratio.

**Cross‑plane crankshaft.** Opposite‑bank cylinders share a crankpin, and the four crankpins sit 90° apart (45°, 135°, 225°, 315°). With the crank turning clockwise from the front, this gives the firing order **1‑8‑4‑3‑6‑5‑7‑2**, one cylinder every 90°.

**Kinematics.** Piston position comes from the slider‑crank relation in each bank's own frame:

```
s(θ) = r·cos φ + √(L² − (r·sin φ)²),   φ = pin angle − θ − bank angle
```

**Valve timing** (in cylinder‑cycle degrees): intake opens 20° BTDC and closes 60° ABDC, exhaust opens 60° BBDC and closes 20° ATDC, 11.5 mm lift, spark at 10° BTDC.

These properties are checked in [`tests/mechanism.test.mjs`](tests/mechanism.test.mjs), run on every push:

- firing order and 90° spacing
- shared crankpins and pin angles
- constant rod length across the full cycle
- top and bottom dead centre at the right crank angles
- crown flush with the deck at TDC
- valve‑to‑piston clearance above 3 mm at every crank angle (the minimum is 4.2 mm)
- valves open only on the correct strokes
- the "firing now" readout advancing in firing order

## The sound

No recording covers idle to redline, so the engine sound is assembled from four seamless loops, each tagged with the engine speed it was recorded at. The app speeds each loop up or down to match the current rpm and crossfades between neighbours. Below about 2,000 rpm, where there is no recorded material, a synthesiser takes over.

Engine speed is read from the firing frequency (four firings per revolution, so rpm = 15 × Hz). All numbers below are produced by [`tools/sound/analyse.py`](tools/sound/analyse.py) and saved in [`results/sound_analysis.json`](results/sound_analysis.json).

| Source (Wikimedia Commons) | Section | Measured | Used as |
|---|---|---|---|
| Ferrari 458 Italia, Goodwood 2010 | 0.5–1.8 s, holding revs at the start | 198.5 Hz, **2,977 rpm** | loop 1 |
| | 2.95–4.65 s, 1st‑gear pull | **2,708 → 4,489 rpm** | loop 2 at **4,438 rpm** |
| Ferrari F430 GT, Goodwood 2010 | 5.9–7.45 s, accelerating past the mic | **4,948 → 7,646 rpm** | loops 3 and 4 at **6,040** and **7,252 rpm** |

The F430 GT section is a rising sweep, which would warble if looped as recorded. [`tools/sound/make_loops.py`](tools/sound/make_loops.py) tracks the firing line through the sweep and resamples two slices at a time‑varying rate, so each holds a constant pitch before looping. Re‑measured afterwards, the loops sit at 6,040 and 7,252 rpm for targets of 6,050 and 7,250. Re‑running the script rebuilds `src/42_samples.js` byte for byte.

![Spectrogram of the 458 recording](docs/img/spectrogram_f458.png)
![Spectrogram of the F430 GT recording](docs/img/spectrogram_f430.png)

**Limitations**

- **Reading engine speed from pitch.** For the F430 GT the reading is unambiguous: its per‑bank line (rpm/30) and firing line (rpm/15) are both clearly present. For the 458 the energy sits on 294 Hz and its third harmonic, with little at half that frequency. That fits 294 Hz being the firing frequency, but a flat‑plane engine can also emphasise the per‑bank line. That line would be an octave lower, so the 458 loops could be about 2× faster than labelled. The harmonic levels behind this judgement are in `results/sound_analysis.json`.
- **Two different cars.** The two sources are different cars at different distances from the microphone, so the character changes slightly in the crossfade between about 4,400 and 6,000 rpm. Above about 5,500 rpm you hear a GT race car with a straight‑through exhaust.
- **The model is cross‑plane.** The recordings are flat‑plane Ferraris, while the modelled crank is cross‑plane. The synthesiser offers both flat‑plane and cross‑plane profiles for comparison.

## Run it

Open `index.html` in a modern browser (an internet connection is needed the first time, for Three.js and fonts), or use the [live demo](https://ssabeeth.github.io/v8-engine-explorer/).

| Key | Action | Key | Action |
|---|---|---|---|
| Space | Play / pause | `1`–`8` | Select cylinder |
| `R` | Reset camera | Esc | Clear selection |
| `E` | Exploded view | `M` | Sound on / off |
| `T` | Transparent shell | `V` | Rev to 8,000 rpm |
| `L` | Labels | `P` | Cinematic tour |

**Graphics presets.** High, Balanced (default) and Performance adjust pixel ratio, shadows, bloom and particle counts.

## Develop

```
src/            app source, concatenated in order by build.sh into index.html
  05_kinematics.js   pure engine maths (tested)
  10_core.js         renderer, lighting, materials, geometry helpers
  20_build.js        procedural engine model
  30_sim.js          animation, effects, cutaway, explode, picking, cameras
  40_ui.js           interface, HUD, timeline, learning mode, render loop
  42_samples.js      generated sound loops (tools/sound/make_loops.py)
  45_audio.js        sound engine (recorded loops + synthesiser)
  50_tour.js         cinematic tour + frame-by-frame capture API
tests/          node --test
tools/sound/    recording analysis and loop generation (Python 3, numpy, ffmpeg)
tools/video/    local server used to capture the tour to frames
```

```sh
./build.sh                          # rebuild index.html after editing src/
node --test tests/                  # mechanism tests
python tools/sound/analyse.py       # re-measure the recordings
python tools/sound/make_loops.py    # regenerate src/42_samples.js
```

**Rendering the tour video.** Serve the folder with `tools/video/capserver.py`, open `http://127.0.0.1:8765/index.html`, and drive `window.__v8.capture` (`begin`, `frame`, `audio`) to post 1080p frames and the soundtrack to the server. Then encode with ffmpeg:

```sh
ffmpeg -framerate 60 -i frames/f%05d.jpg -i tour.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k tour.mp4
```

## Credits and licences

- **Code:** MIT (see [LICENSE](LICENSE)).
- **Engine‑sound loops** in `src/42_samples.js` and `index.html` are derived (trimmed, pitch‑flattened, looped, level‑matched) from recordings by **Edvvc** on Wikimedia Commons, and are shared under **[CC BY‑SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)**:
  - [“Ferrari 458 Italia”](https://commons.wikimedia.org/wiki/File:Ferrari_458_Italia.ogg)
  - [“Ferrari F430 (2010)”](https://commons.wikimedia.org/wiki/File:Ferrari_F430_(2010).ogg)
- **3D engine:** [three.js](https://threejs.org) (MIT), loaded from jsDelivr.
- **Fonts:** Inter and JetBrains Mono (SIL Open Font License), from Google Fonts.
