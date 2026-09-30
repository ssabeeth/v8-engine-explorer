#!/bin/sh
# Assemble the single-file app (index.html) from src/. No dependencies.
set -e
cd "$(dirname "$0")"
cat src/00_head.html src/05_kinematics.js src/10_core.js src/20_build.js src/30_sim.js src/40_ui.js \
    src/42_samples.js src/45_audio.js src/50_tour.js src/99_tail.html > index.html
echo "built index.html ($(wc -c < index.html | tr -d ' ') bytes)"
