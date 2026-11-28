"""Performs public-domain classical pieces from their notes (synthesized piano + strings) and
writes, for each: the full mix, a backing stem, a lead (tune) stem, and an exact score.

    python3 tiles/tools/make_classics.py && node tiles/tools/classics-charts.mjs

All five compositions are centuries old and in the public domain; these performances are
generated here, so there's no recording copyright either. Melodies are the well-known themes;
short bridges/endings are simplified arrangements for a kids' game.
"""
import json, os, subprocess, tempfile, wave
import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

def midi(n):
    acc = 1 if '#' in n else -1 if (len(n) > 2 and n[1] == 'b') else 0
    return 12 * (int(n[-1]) + 1) + NAMES[n[0]] + acc
def hz(m): return 440 * 2 ** ((m - 69) / 12)

CHORDS = {  # root, intervals
    'C': ('C3', [0, 4, 7]), 'F': ('F2', [0, 4, 7]), 'G': ('G2', [0, 4, 7]), 'G7': ('G2', [0, 4, 7, 10]),
    'Am': ('A2', [0, 3, 7]), 'E': ('E2', [0, 4, 7]), 'E7': ('E2', [0, 4, 7, 10]), 'D': ('D3', [0, 4, 7]),
    'D7': ('D3', [0, 4, 7, 10]), 'Dm': ('D3', [0, 3, 7]),
}

def parse(seq):
    out, b = [], 0.0
    for tok in seq.split():
        p, l = tok.split(':') if ':' in tok else (tok, '1')
        l = float(l)
        if p != 'r': out.append((b, l, midi(p)))
        b += l
    return out, b

# Each song: tempo (bpm, or [start, end] to speed up), beats per bar, melody, chords as
# "Name:beats" (r = rest), accompaniment style, lane-friendly settings.
SONGS = {
    'twinkle': dict(title='Twinkle Twinkle Little Star', artist='Traditional (Mozart variations, 1781)', bpm=96, meter=4, style='block',
        melody=('r:4 ' + 'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 '
                + 'C5 C5 G5 G5 A5 A5 G5:2 F5 F5 E5 E5 D5 D5 C5:2 G5 G5 F5 F5 E5 E5 D5:2 G5 G5 F5 F5 E5 E5 D5:2 C5 C5 G5 G5 A5 A5 G5:2 F5 F5 E5 E5 D5 D5 C5:2'),
        chords=('C:4 ' + ('C:4 F:2 C:2 F:2 C:2 G:2 C:2 C:2 F:2 C:2 G:2 C:2 F:2 C:2 G:2 C:4 F:2 C:2 F:2 C:2 G:2 C:2 ') * 2)),
    'ode-to-joy': dict(title='Ode to Joy', artist='Ludwig van Beethoven, 1824', bpm=108, meter=4, style='alberti',
        melody=('r:4 ' + ('E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:.5 D4:2 '
                + 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:.5 C4:2 '
                + 'D4 D4 E4 C4 D4 E4:.5 F4:.5 E4 C4 D4 E4:.5 F4:.5 E4 D4 C4 D4 G3:2 '
                + 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:.5 C4:2 ') + 'E5 E5 F5 G5 G5 F5 E5 D5 C5 C5 D5 E5 D5:1.5 C5:.5 C5:2'),
        chords=('C:4 ' + 'C:4 G:4 C:4 G:4 C:4 G:4 C:4 G:2 C:2 G:4 C:4 G:4 C:2 G:2 C:4 G:4 C:4 G:2 C:2 C:4 G:4 C:4 G:2 C:2')),
    'fur-elise': dict(title='Für Elise', artist='Ludwig van Beethoven, 1810', bpm=150, meter=3, style='arp16', beat_note='eighth',
        melody=('r:2 E5:.5 D#5:.5 '
                + 'E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 r:.5 C4:.5 E4:.5 A4:.5 B4:1 r:.5 E4:.5 G#4:.5 B4:.5 C5:1 r:.5 E4:.5 E5:.5 D#5:.5 '
                + 'E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 r:.5 C4:.5 E4:.5 A4:.5 B4:1 r:.5 E4:.5 C5:.5 B4:.5 A4:1 r:1 E5:.5 D#5:.5 '
                + 'E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 r:.5 C4:.5 E4:.5 A4:.5 B4:1 r:.5 E4:.5 G#4:.5 B4:.5 C5:1 r:.5 E4:.5 E5:.5 D#5:.5 '
                + 'E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 r:.5 C4:.5 E4:.5 A4:.5 B4:1 r:.5 E4:.5 C5:.5 B4:.5 A4:1 r:.5 B4:.5 C5:.5 D5:.5 '
                + 'E5:1.5 G4:.5 F5:.5 E5:.5 D5:1.5 F4:.5 E5:.5 D5:.5 C5:1.5 E4:.5 D5:.5 C5:.5 B4:1 r:.5 E4:.5 E5:.5 D#5:.5 '
                + 'E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 r:.5 C4:.5 E4:.5 A4:.5 B4:1 r:.5 E4:.5 G#4:.5 B4:.5 C5:1 r:.5 E4:.5 E5:.5 D#5:.5 '
                + 'E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 r:.5 C4:.5 E4:.5 A4:.5 B4:1 r:.5 E4:.5 C5:.5 B4:.5 A4:3'),
        chords=('Am:3 ' + ('r:3 Am:3 E:3 Am:3 r:3 Am:3 E:3 Am:3 ') * 2 + 'C:3 G:3 Am:3 E:3 ' + 'r:3 Am:3 E:3 Am:3 r:3 Am:3 E:3 Am:3')),
    'mountain-king': dict(title='In the Hall of the Mountain King', artist='Edvard Grieg, 1875', bpm=[92, 176], meter=4, style='pizz',
        melody=('r:4 ' + (lambda p1, p2: p1 + p1 + p2 + p1 + p1 + p1 + p2 + p1)(
                'A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4:1 D#4:.5 B3:.5 D#4:1 D4:.5 Bb3:.5 D4:1 A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4:.5 A4:.5 G4:.5 E4:.5 C4:.5 E4:.5 G4:2 ',
                'E4:.5 F#4:.5 G#4:.5 A4:.5 B4:.5 G#4:.5 B4:1 C5:.5 G#4:.5 C5:1 B4:.5 G#4:.5 B4:1 E4:.5 F#4:.5 G#4:.5 A4:.5 B4:.5 G#4:.5 B4:.5 E5:.5 D5:.5 B4:.5 G#4:.5 B4:.5 D5:2 ')
                + 'A4:4'),
        chords=('Am:4 ' + (lambda p1, p2: p1 + p1 + p2 + p1 + p1 + p1 + p2 + p1)('Am:4 E:4 Am:4 C:4 ', 'E:4 E:4 E:4 E7:4 ') + 'Am:4')),
    'nachtmusik': dict(title='Eine kleine Nachtmusik', artist='Wolfgang Amadeus Mozart, 1787', bpm=126, meter=4, style='alberti',
        melody=('r:4 ' + ('G4:1 r:.5 D4:.5 G4:1 r:.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:1 r:1 C5:1 r:.5 A4:.5 C5:1 r:.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 D4:1 r:1 ') * 2
                + 'G5:1 r:.5 D5:.5 G5:1 r:.5 D5:.5 G5:.5 D5:.5 G5:.5 B5:.5 D6:1 r:1 C6:1 r:.5 A5:.5 C6:1 r:.5 A5:.5 C6:.5 A5:.5 F#5:.5 A5:.5 D5:1 r:1 '
                + 'G4:.5 A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 F#5:.5 G5:.5 D5:1 B4:1 G4:2 '),
        chords='G:4 ' + 'G:4 G:4 D7:4 D7:4 ' * 3 + 'G:2 D:2 G:4'),
}

def tempo_map(spec, total_beats):
    if isinstance(spec, (int, float)):
        return lambda b: b * 60 / spec, float(spec)
    a, z = spec
    step = 1 / 64
    grid = np.arange(0, total_beats + 8, step)
    bpm = a + (z - a) * np.clip(grid / total_beats, 0, 1) ** 1.3
    t = np.concatenate([[0], np.cumsum(60 / bpm[:-1] * step)])
    return (lambda b: float(np.interp(b, grid, t))), None

def piano(f, dur, vel=1.0):
    T = dur + 0.35
    t = np.arange(int(T * SR)) / SR
    sig = np.zeros_like(t)
    B = 0.0004
    for k in range(1, 11):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > 9000: break
        amp = (1 / k ** 1.15) * (1 if k == 1 else 0.75)
        dec = np.exp(-t * (0.8 + 0.55 * k) * (f / 330) ** 0.35)
        sig += amp * np.sin(2 * np.pi * fk * t + k) * dec
    env = np.minimum(1, t / 0.003)
    rel = np.where(t > dur, np.exp(-(t - dur) * 22), 1.0)
    noise = np.random.default_rng(int(f)).standard_normal(len(t)) * np.exp(-t * 260) * 0.08
    return vel * (sig * env * rel + noise) * 0.32

def strings(f, dur, vel=1.0):
    T = dur + 0.4
    t = np.arange(int(T * SR)) / SR
    vib = 1 + 0.003 * np.sin(2 * np.pi * 5 * t)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    sig = sum(np.sin(k * ph) / k ** 1.4 for k in range(1, 7))
    env = np.minimum(1, t / 0.12) * np.where(t > dur, np.exp(-(t - dur) * 9), 1.0)
    return vel * sig * env * 0.16

def pizz(f, dur, vel=1.0):
    t = np.arange(int((min(dur, 0.4) + 0.1) * SR)) / SR
    sig = sum(np.sin(2 * np.pi * k * f * t) / k ** 1.6 for k in range(1, 6))
    return vel * sig * np.exp(-t * 11) * np.minimum(1, t / 0.002) * 0.4

def timp(f):
    t = np.arange(int(0.8 * SR)) / SR
    return (np.sin(2 * np.pi * f * (1 + 0.15 * np.exp(-t * 20)) * t) * np.exp(-t * 4.5) + np.random.default_rng(3).standard_normal(len(t)) * np.exp(-t * 40) * 0.2) * 0.35

def add(buf, start, sig):
    i = int(round(start * SR)); j = min(len(buf), i + len(sig))
    if j > i: buf[i:j] += sig[:j - i]

def render(sid, s):
    mel, mbeats = parse(s['melody'])
    chords, cbeats = [], 0.0
    for tok in s['chords'].split():
        n, l = tok.split(':'); chords.append((cbeats, float(l), n)); cbeats += float(l)
    total = max(mbeats, cbeats)
    T, const_bpm = tempo_map(s['bpm'], total)
    end_t = T(total) + 2.5
    lead = np.zeros(int(end_t * SR)); back = np.zeros_like(lead)
    rng = np.random.default_rng(11)
    for (b, l, m) in mel:
        st, du = T(b), T(b + l) - T(b)
        add(lead, st, piano(hz(m), du * 0.95, 0.9 + 0.1 * rng.random()))
    meter, style = s['meter'], s['style']
    for (b, l, n) in chords:
        if n == 'r': continue
        root, iv = CHORDS[n]; r = midi(root); notes = [r + i for i in iv]
        st = T(b)
        if style == 'block':
            for k in range(int(l)):
                for m in notes: add(back, T(b + k), piano(hz(m + 12), (T(b + k + 1) - T(b + k)) * 0.9, 0.35))
            add(back, st, piano(hz(r - 12 if r >= 48 else r), T(b + l) - st, 0.5))
        elif style == 'alberti':
            pat = [notes[0], notes[2], notes[1], notes[2]]
            k = 0.0
            while k < l - 1e-9:
                add(back, T(b + k), piano(hz(pat[int(k * 2) % 4]), (T(b + k + .5) - T(b + k)) * 1.6, 0.42)); k += 0.5
            for m in notes[:3]: add(back, st, strings(hz(m + 12), T(b + l) - st, 0.6))
        elif style == 'arp16':  # Für Elise left hand: root, fifth, octave in the first half of the bar
            for k, m in enumerate([r, r + 7, r + 12]): add(back, T(b + k * .5), piano(hz(m), T(b + 3) - T(b + k * .5), 0.5))
        elif style == 'pizz':
            k = 0
            while k < l:
                m = r if k % 2 == 0 else r + 7
                add(back, T(b + k), pizz(hz(m - 12 if m >= 45 else m), T(b + k + 1) - T(b + k), 0.9))
                k += 1
            frac = b / total
            if frac > 0.5: add(back, st, timp(hz(r - 12 if r > 40 else r)) * (0.5 + frac))
            for m in notes[:3]: add(back, st, strings(hz(m + 12), T(b + l) - st, 0.25 + 0.6 * frac))
    # outro: let the last chord ring
    fade = np.ones(len(lead)); n = int(1.2 * SR); fade[-n:] = np.linspace(1, 0, n)
    lead *= fade; back *= fade
    lead *= 0.95; back *= 0.6
    peak = np.max(np.abs(lead + back)); g = 0.88 / peak
    files = {f'{sid}.mp3': lead + back, f'{sid}.backing.mp3': back, f'{sid}.lead.mp3': lead}
    with tempfile.TemporaryDirectory() as tmp:
        for name, mono in files.items():
            st = np.stack([mono, mono], 1) * g
            wav = os.path.join(tmp, 'x.wav')
            with wave.open(wav, 'wb') as w:
                w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1' if name.count('.') > 1 else '2', '-codec:a', 'libmp3lame', '-b:a', '96k' if name.count('.') > 1 else '128k', os.path.join(ROOT, 'songs', name)], check=True)
    mix = (lead + back) * g
    first = int(np.argmax(np.abs(mix) > 0.01)) / SR
    beat_unit = 0.5 if s.get('beat_note') == 'eighth' else 1  # chart beat grid is in quarter notes
    score = dict(id=sid, title=s['title'], artist=s['artist'], meter=s['meter'], duration=round(len(mix) / SR, 3), firstSound=round(first, 4),
                 bpm=(const_bpm * beat_unit if const_bpm else None),
                 notes=[dict(t=round(T(b), 4), d=round(T(b + l) - T(b), 4), midi=m, beat=b, len=l) for (b, l, m) in mel])
    os.makedirs(os.path.join(HERE, 'scores'), exist_ok=True)
    json.dump(score, open(os.path.join(HERE, 'scores', sid + '.json'), 'w'), indent=1)
    print(f'{sid}: {len(mel)} notes, {score["duration"]}s')

if __name__ == '__main__':
    import sys
    for sid, s in SONGS.items():
        if len(sys.argv) > 1 and sid not in sys.argv[1:]: continue
        render(sid, s)
