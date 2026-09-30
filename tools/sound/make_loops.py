"""Build src/42_samples.js: four seamless engine loops cut from the Commons
recordings, each tagged with the engine speed it was recorded at.

    python tools/sound/make_loops.py

The 458 loops are steady sections used as-is. The F430 GT sweep rises
~5,000 -> 7,500 rpm, so two slices are resampled with a time-varying rate
(target pitch / measured pitch) to hold a constant pitch before looping.
"""
from __future__ import annotations

import base64
import io
import wave

import numpy as np

from common import RECORDINGS, ROOT, SR, follow_line, load, peak_frequency

XFADE_S = 0.05     # loop-seam crossfade
TARGET_RMS = 0.2


def seamless(s: np.ndarray, xf: float = XFADE_S) -> np.ndarray:
    """Equal-power crossfade of the tail into the head so the loop has no seam."""
    x = int(xf * SR)
    ramp = np.linspace(0, np.pi / 2, x)[:, None]
    return np.concatenate([s[:x] * np.sin(ramp) + s[-x:] * np.cos(ramp), s[x:-x]])


def flatten(y: np.ndarray, track: np.ndarray, t0: float, t1: float, target_rpm: float) -> np.ndarray:
    """Resample [t0, t1] so the tracked firing line sits at target_rpm / 15 Hz throughout."""
    target_hz, pos, out = target_rpm / 15.0, t0 * SR, []
    while pos < t1 * SR:
        measured = np.interp(pos / SR, track[:, 0], track[:, 1])
        i, k = int(pos), pos - int(pos)
        out.append(y[i] * (1 - k) + y[i + 1] * k)
        pos += target_hz / measured
    return np.array(out)


def wav_b64(s: np.ndarray) -> str:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(s, -1, 1) * 32767).astype("<i2").tobytes())
    return base64.b64encode(buf.getvalue()).decode()


def main() -> None:
    f458, f430 = load(RECORDINGS["f458"]), load(RECORDINGS["f430"])
    loops = []
    for t0, t1 in ((0.50, 1.80), (4.02, 4.62)):
        seg = f458[int(t0 * SR) : int(t1 * SR)]
        loops.append(("458", round(peak_frequency(seg, 150, 350) * 15), seamless(seg)))
    track = follow_line(f430, 5.90, 7.45, f_start=356.0)
    for t0, t1, rpm in ((6.30, 6.80, 6050), (6.95, 7.45, 7250)):
        seg = flatten(f430, track, t0, t1, rpm)
        loops.append(("430", round(peak_frequency(seg, 300, 560) * 15), seamless(seg)))

    rows = []
    for tag, rpm, s in loops:
        s = s * (TARGET_RMS / np.sqrt((s**2).mean()))
        s *= min(1.0, 0.98 / np.abs(s).max())
        rows.append(f"  {{ src: '{tag}', rpm: {rpm}, url: 'data:audio/wav;base64,{wav_b64(s)}' }}")
        print(f"{tag}: {rpm} rpm, {len(s) / SR:.2f} s")

    js = (
        "/* Engine-sound loops (all CC licensed, via Wikimedia Commons):\n"
        " *  - \"Ferrari 458 Italia\" by Edvvc, CC BY-SA 3.0 — https://commons.wikimedia.org/wiki/File:Ferrari_458_Italia.ogg\n"
        " *  - \"Ferrari F430 (2010)\" (F430 GT) by Edvvc, CC BY-SA 3.0 — https://commons.wikimedia.org/wiki/File:Ferrari_F430_(2010).ogg\n"
        " * Trimmed, pitch-flattened (F430), seamlessly looped and level-matched; these modified loops are shared under CC BY-SA 3.0. */\n"
        "const REC = { loops: [\n" + ",\n".join(rows) + "\n] };\n"
    )
    (ROOT / "src" / "42_samples.js").write_text(js)


if __name__ == "__main__":
    main()
