"""Measure the engine speed in each recording and write results/sound_analysis.json
plus spectrogram images for the README.

    python tools/sound/analyse.py
"""
from __future__ import annotations

import json
import subprocess

from common import DATA, RECORDINGS, ROOT, SR, fetch, follow_line, harmonic_levels, load, peak_frequency

# Sections identified from the spectrograms (seconds into each clip).
F458_LAUNCH = (0.50, 1.80)   # holding revs on the start line
F458_PULL = (2.95, 4.65)     # full-throttle pull in 1st gear
F430_SWEEP = (5.90, 7.45)    # F430 GT accelerating past the microphone


def main() -> None:
    f458, f430 = load(RECORDINGS["f458"]), load(RECORDINGS["f430"])

    launch_hz = peak_frequency(f458[int(F458_LAUNCH[0] * SR) : int(F458_LAUNCH[1] * SR)], 150, 350)
    pull = follow_line(f458, *F458_PULL, f_start=190.0)
    sweep = follow_line(f430, *F430_SWEEP, f_start=356.0)

    results = {
        "convention": "rpm = 15 x firing frequency (4 firings per crank revolution)",
        "f458": {
            "launch_hold": {"seconds": F458_LAUNCH, "firing_hz": round(launch_hz, 1), "rpm": round(launch_hz * 15)},
            "first_gear_pull": {
                "seconds": F458_PULL,
                "rpm_start": round(pull[0, 1] * 15),
                "rpm_end": round(pull[:, 1].max() * 15),
            },
            "harmonics_at_4.15s_relative_to_294Hz": harmonic_levels(f458, 4.15, 294.0),
        },
        "f430_gt": {
            "sweep": {
                "seconds": F430_SWEEP,
                "rpm_start": round(sweep[0, 1] * 15),
                "rpm_end": round(sweep[:, 1].max() * 15),
                "level_db_range": [round(sweep[:, 2].min(), 1), round(sweep[:, 2].max(), 1)],
            },
            "harmonics_at_8.85s_relative_to_240Hz": harmonic_levels(f430, 8.85, 240.0),
        },
    }
    out = ROOT / "results" / "sound_analysis.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(results, indent=2) + "\n")
    print(json.dumps(results, indent=2))

    img = ROOT / "docs" / "img"
    img.mkdir(parents=True, exist_ok=True)
    for key in ("f458", "f430"):
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", str(DATA / f"{key}.ogg"), "-lavfi",
             "showspectrumpic=s=1200x420:legend=1:scale=log:fscale=log:start=60:stop=6000:color=intensity",
             str(img / f"spectrogram_{key}.png")],
            check=True,
        )
        fetch(RECORDINGS[key])


if __name__ == "__main__":
    main()
