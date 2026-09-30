"""Shared helpers for the engine-sound tools: fetching the Commons recordings,
decoding them, and estimating firing frequency / engine speed.

Engine-speed convention: a four-stroke V8 fires 4 times per crank revolution,
so the firing frequency is rpm / 15 Hz. Each bank alone fires twice per
revolution (rpm / 30 Hz).
"""
from __future__ import annotations

import subprocess
import urllib.request
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"  # gitignored download cache


@dataclass(frozen=True)
class Recording:
    key: str
    title: str
    url: str
    author: str
    licence: str


RECORDINGS = {
    "f458": Recording(
        "f458",
        "Ferrari 458 Italia",
        "https://upload.wikimedia.org/wikipedia/commons/5/5a/Ferrari_458_Italia.ogg",
        "Edvvc",
        "CC BY-SA 3.0",
    ),
    "f430": Recording(
        "f430",
        "Ferrari F430 (2010)",
        "https://upload.wikimedia.org/wikipedia/commons/1/11/Ferrari_F430_%282010%29.ogg",
        "Edvvc",
        "CC BY-SA 3.0",
    ),
}
SR = 44100


def fetch(rec: Recording) -> Path:
    """Download the .ogg once and decode it to 44.1 kHz stereo WAV with ffmpeg."""
    DATA.mkdir(exist_ok=True)
    ogg, wav = DATA / f"{rec.key}.ogg", DATA / f"{rec.key}.wav"
    if not ogg.exists():
        req = urllib.request.Request(rec.url, headers={"User-Agent": "v8-engine-explorer/1.0"})
        ogg.write_bytes(urllib.request.urlopen(req).read())
    if not wav.exists():
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(ogg), "-ar", str(SR), "-ac", "2", str(wav)], check=True)
    return wav


def load(rec: Recording) -> np.ndarray:
    """Stereo float array, shape (n, 2), range -1..1."""
    with wave.open(str(fetch(rec))) as w:
        assert w.getframerate() == SR
        return np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").reshape(-1, 2).astype(float) / 32767


def peak_frequency(x: np.ndarray, lo: float, hi: float) -> float:
    """Strongest spectral peak between lo and hi Hz, with parabolic interpolation."""
    mono = x.mean(1) if x.ndim == 2 else x
    n = 1 << (int(np.ceil(np.log2(len(mono)))) + 1)
    spec = np.abs(np.fft.rfft(mono * np.hanning(len(mono)), n))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    band = np.where((freqs > lo) & (freqs < hi))[0]
    i = band[np.argmax(spec[band])]
    y0, y1, y2 = np.log(spec[i - 1 : i + 2])
    return (i + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)) * SR / n


def follow_line(x: np.ndarray, t0: float, t1: float, f_start: float, hop: float = 0.02, n: int = 4096) -> np.ndarray:
    """Track one harmonic line through a sweep: in each frame take the peak
    within -6 %/+7 % of the previous estimate. Returns rows (t, Hz, dB)."""
    mono = x.mean(1)
    f, rows = f_start, []
    for t in np.arange(t0, t1, hop):
        s = int(t * SR)
        seg = mono[s : s + n] * np.hanning(n)
        p = np.abs(np.fft.rfft(seg, 4 * n)) ** 2
        freqs = np.fft.rfftfreq(4 * n, 1 / SR)
        band = np.where((freqs > f * 0.94) & (freqs < f * 1.07))[0]
        i = band[np.argmax(p[band])]
        y0, y1, y2 = np.log(p[i - 1 : i + 2] + 1e-20)
        f = (i + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)) * SR / (4 * n)
        rms_db = 20 * np.log10(np.sqrt((mono[s : s + n] ** 2).mean()) + 1e-9)
        rows.append((t + n / 2 / SR, f, rms_db))
    return np.array(rows)


def harmonic_levels(x: np.ndarray, t: float, f: float, n: int = 16384) -> dict[str, float]:
    """Level (dB, relative to the strongest of 1-4 x f) at 0.5, 1, 1.5, 2, 3, 4 x f."""
    mono = x.mean(1)
    s = int(t * SR)
    p = np.abs(np.fft.rfft(mono[s : s + n] * np.hanning(n))) ** 2
    freqs = np.fft.rfftfreq(n, 1 / SR)

    def at(fr: float) -> float:
        i = int(np.argmin(abs(freqs - fr)))
        return float(10 * np.log10(p[i - 3 : i + 4].max() + 1e-12))

    ref = max(at(k * f) for k in (1, 2, 3, 4))
    return {f"{m}x": round(at(m * f) - ref, 1) for m in (0.5, 1, 1.5, 2, 3, 4)}
