"""Synthesizes the original demo song "Starlight Skip" and writes its exact note score.

    python3 tiles/tools/make_demo.py      (needs numpy + ffmpeg)

Outputs:
    tiles/songs/starlight-skip.mp3      the audio
    tiles/tools/demo-score.json         every melody note (beat, length, pitch) for demo-chart.mjs

Because the song is generated from this score, the chart built from it is exact, not guessed.
"""
import json, os, subprocess, tempfile, wave
import numpy as np

SR = 44100
BPM = 104
BEAT = 60 / BPM
LEAD_BARS = 2          # drums-only count-in
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def midi(n):
    return 12 * (int(n[-1]) + 1) + NAMES[n[0]] + (1 if '#' in n else 0)
def hz(m):
    return 440 * 2 ** ((m - 69) / 12)

# Each bar: "pitch:beats ..." (r = rest). Each section: (chords, bars, holds?, chord-accents?)
A = ["E4:1 G4:1 C5:2", "B4:1 A4:1 G4:2", "A4:1 C5:1 E5:1 D5:1", "C5:1 A4:1 F4:2",
     "E4:1 G4:1 C5:1 E5:1", "D5:1 B4:1 G4:2", "A4:.5 B4:.5 C5:1 A4:1 F4:1", "G4:2 C5:2"]
B = ["A4:.5 C5:.5 A4:.5 F4:.5 A4:1 r:1", "B4:.5 D5:.5 B4:.5 G4:.5 B4:1 r:1",
     "G4:.5 B4:.5 E5:1 D5:.5 B4:.5 G4:1", "A4:.5 C5:.5 E5:1 C5:1 A4:1",
     "F4:.5 A4:.5 C5:.5 A4:.5 F5:1 E5:1", "D5:.5 C5:.5 B4:.5 A4:.5 G4:1 D5:1",
     "E5:1 C5:1 G4:1 E4:1", "C5:3 r:1"]
A2 = ["E4:1 G4:1 C5:2", "B4:1 A4:1 G4:2", "A4:1 C5:1 E5:2", "D5:1 C5:1 A4:2",
      "G4:1 C5:1 E5:2", "D5:1 B4:1 G4:2", "F4:1 A4:1 C5:1 D5:1", "C5:4"]
OUT = ["A4:2 C5:2", "B4:2 D5:2", "E5:4", "r:4"]
SECTIONS = [
    ("A",  ["C", "G", "Am", "F", "C", "G", "F", "C"], A,  False, False),
    ("B",  ["F", "G", "Em", "Am", "F", "G", "C", "C"], B,  True,  True),
    ("A2", ["C", "G", "Am", "F", "C", "G", "F", "C"], A2, True,  False),
    ("OUT", ["F", "G", "C", "C"], OUT, True, True),
]
CHORDS = {'C': ['C3', 'E3', 'G3'], 'G': ['G2', 'B2', 'D3'], 'Am': ['A2', 'C3', 'E3'], 'F': ['F2', 'A2', 'C3'], 'Em': ['E2', 'G2', 'B2']}

def build_score():
    notes, chords = [], []
    bar = LEAD_BARS
    for name, prog, bars, holds, accents in SECTIONS:
        for i, b in enumerate(bars):
            chords.append((bar * 4, prog[i]))
            beat = 0.0
            for tok in b.split():
                p, l = tok.split(':'); l = float(l)
                if p != 'r':
                    notes.append({'beat': bar * 4 + beat, 'len': l, 'midi': midi(p), 'section': name,
                                  'hold': holds and l >= 2, 'accent': accents and beat == 0})
                beat += l
            assert abs(beat - 4) < 1e-9, (name, i, b)
            bar += 1
    return notes, chords, bar

def env_adsr(n, a, d, s, r_len):
    e = np.ones(n)
    ai = max(1, int(a * SR)); di = max(1, int(d * SR)); ri = max(1, int(r_len * SR))
    e[:ai] = np.linspace(0, 1, ai)
    e[ai:ai + di] = np.linspace(1, s, len(e[ai:ai + di]))
    e[ai + di:] = s
    e[-ri:] *= np.linspace(1, 0, ri)
    return e

def add(buf, start, sig):
    i = int(round(start * SR))
    j = min(len(buf), i + len(sig))
    if j > i: buf[i:j] += sig[:j - i]

def tone(f, dur, kind):
    t = np.arange(int(dur * SR)) / SR
    if kind == 'pluck':
        sig = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
        return sig * np.exp(-t * 4.5) * env_adsr(len(t), 0.004, 0.01, 1, 0.03)
    if kind == 'lead':  # sustained (hold notes)
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 2, 0, 1)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        sig = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
        return sig * env_adsr(len(t), 0.01, 0.15, 0.7, 0.08)
    if kind == 'pad':
        sig = sum(np.sin(2 * np.pi * f * dt * t) for dt in (0.997, 1.0, 1.003)) / 3
        return sig * env_adsr(len(t), 0.25, 0.3, 0.8, 0.4)
    if kind == 'bass':
        sig = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
        return sig * env_adsr(len(t), 0.005, 0.1, 0.6, 0.05)
    raise ValueError(kind)

def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 50 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

rng = np.random.default_rng(7)
def snare():
    t = np.arange(int(0.22 * SR)) / SR
    noise = rng.standard_normal(len(t))
    noise = np.convolve(noise, [1, -0.9], 'same')
    return (0.7 * noise * np.exp(-t * 22) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30))

def hat():
    t = np.arange(int(0.06 * SR)) / SR
    n = rng.standard_normal(len(t))
    n = n - np.convolve(n, np.ones(4) / 4, 'same')
    return n * np.exp(-t * 70)

def main():
    notes, chords, bars = build_score()
    total = bars * 4 * BEAT + 2.5
    mel = np.zeros(int(total * SR)); acc = np.zeros_like(mel); drums = np.zeros_like(mel)
    for n in notes:
        st = n['beat'] * BEAT
        dur = n['len'] * BEAT
        if n['hold']:
            add(mel, st, 0.5 * tone(hz(n['midi']), dur * 0.95, 'lead'))
        else:
            add(mel, st, 0.55 * tone(hz(n['midi']), min(dur, 0.9) + 0.25, 'pluck'))
    for beat, ch in chords:
        st = beat * BEAT
        for p in CHORDS[ch]:
            add(acc, st, 0.12 * tone(hz(midi(p) + 12), 4 * BEAT + 0.3, 'pad'))
        root = midi(CHORDS[ch][0]) - 12 if midi(CHORDS[ch][0]) >= 45 else midi(CHORDS[ch][0])
        for b in (0, 1.5, 2, 3):
            add(acc, st + b * BEAT, 0.28 * tone(hz(root), 0.45 * BEAT, 'bass'))
    last_drum_beat = (bars - 1) * 4
    for b in range(0, last_drum_beat + 1):
        st = b * BEAT
        if b % 2 == 0: add(drums, st, 0.55 * kick())
        if b % 4 in (1, 3) and b >= LEAD_BARS * 4: add(drums, st, 0.32 * snare())
        add(drums, st, 0.10 * hat()); add(drums, st + BEAT / 2, 0.07 * hat())
    mix = mel + acc + drums
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix *= 0.89 / np.max(np.abs(mix))
    fade = int(1.5 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
    # stereo: slight width on pads
    left = mix + 0.15 * acc; right = mix - 0.15 * acc
    st = np.stack([left, right], 1)
    st *= 0.89 / np.max(np.abs(st))
    pcm = (st * 32767).astype(np.int16)
    os.makedirs(os.path.join(ROOT, 'songs'), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'demo.wav')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        out = os.path.join(ROOT, 'songs', 'starlight-skip.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '160k', out], check=True)
    first = next(i for i, v in enumerate(np.max(np.abs(st), 1)) if v > 0.01) / SR
    score = {'bpm': BPM, 'beat': BEAT, 'leadBars': LEAD_BARS, 'duration': round(len(mix) / SR, 3),
             'firstSound': round(first, 4), 'notes': notes}
    with open(os.path.join(HERE, 'demo-score.json'), 'w') as f:
        json.dump(score, f, indent=1)
    print(f"wrote songs/starlight-skip.mp3 ({total:.1f}s), {len(notes)} melody notes")

if __name__ == '__main__':
    main()
