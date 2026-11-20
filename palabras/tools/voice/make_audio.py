#!/usr/bin/env python3
"""Make Dora's voice packs for ¡Hola, Palabras!

  python3 palabras/tools/voice/make_audio.py

1. Reuses every clip that's already recorded (pulled out of the packs in palabras/audio/).
2. Records only new or changed lines with the Kokoro voice 'ef_dora' (Spanish).
3. Re-packs palabras/audio/<group>.mp3 + <group>.json.

To add a line: append ["group", "key", "Spanish text"] to clips.json, then run this.
Keys: c| common phrases, w| word, a| riddle, etc. (see keyText() in js/core.js).
"""
import json, os, sys, hashlib, subprocess, collections

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.normpath(os.path.join(HERE, '..', '..', 'audio'))
CACHE = os.path.join(HERE, 'cache')            # one mp3 per line of text (not committed)
MODELS = os.environ.get('KOKORO_DIR', os.path.join(HERE, 'models'))
md5 = lambda t: hashlib.md5(t.encode()).hexdigest()
os.makedirs(CACHE, exist_ok=True)

clips = json.load(open(os.path.join(HERE, 'clips.json')))
hashes_path = os.path.join(HERE, 'recorded.json')   # "group|key" -> md5 of the text that's in the pack
recorded = json.load(open(hashes_path)) if os.path.exists(hashes_path) else {}

# 1) seed the cache from the packs we already ship
seeded = 0
for g in {c[0] for c in clips}:
    jp, mp = os.path.join(AUDIO, g + '.json'), os.path.join(AUDIO, g + '.mp3')
    if not os.path.exists(jp): continue
    idx, data = json.load(open(jp)), open(mp, 'rb').read()
    for grp, key, text in clips:
        if grp != g or key not in idx: continue
        h = md5(text); f = os.path.join(CACHE, h + '.mp3')
        if os.path.exists(f) or recorded.get(f'{g}|{key}') != h: continue
        off, n = idx[key]; open(f, 'wb').write(data[off:off + n]); seeded += 1

# 2) record whatever is still missing
todo = [c for c in clips if not os.path.exists(os.path.join(CACHE, md5(c[2]) + '.mp3'))]
todo = list({md5(c[2]): c for c in todo}.values())
print(f'reused {seeded} recorded clips, {len(todo)} new lines to record', flush=True)
if todo:
    onnx, voices = os.path.join(MODELS, 'kokoro-v1.0.onnx'), os.path.join(MODELS, 'voices-v1.0.bin')
    if not (os.path.exists(onnx) and os.path.exists(voices)):
        sys.exit(f'Need the Kokoro voice model in {MODELS} (see README.md), or set KOKORO_DIR.')
    import numpy as np
    from kokoro_onnx import Kokoro
    k = Kokoro(onnx, voices)
    for i, (g, key, text) in enumerate(todo):
        out = os.path.join(CACHE, md5(text) + '.mp3')
        s, sr = k.create(text, voice='ef_dora', speed=0.88, lang='es')
        s = np.asarray(s, dtype=np.float32); keep = np.where(np.abs(s) > 0.012)[0]   # trim silence
        if len(keep): s = s[max(0, keep[0] - int(.04 * sr)):min(len(s), keep[-1] + int(.08 * sr))]
        pcm = (np.clip(s, -1, 1) * 32767).astype('<i2').tobytes()
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', '-',
                        '-b:a', '32k', '-ar', '24000', '-write_xing', '0', '-map_metadata', '-1', '-id3v2_version', '0', out + '.tmp.mp3'],
                       input=pcm, check=True)
        os.rename(out + '.tmp.mp3', out)
        if i % 50 == 0: print(f'  {i}/{len(todo)}', flush=True)

# 3) pack: one mp3 per group (clips back to back) + an index of [offset, length]
G = collections.defaultdict(list)
for g, key, text in clips: G[g].append((key, text))
extra = set(json.load(open(os.path.join(HERE, 'silly_extra.json'))))   # everyday words ¿Cuál no va? needs in the silly pack
in_silly = {k for k, _ in G['silly']}
for g, key, text in clips:
    if key in extra and g != 'silly' and key not in in_silly: G['silly'].append((key, text)); in_silly.add(key)
for f in os.listdir(AUDIO): os.remove(os.path.join(AUDIO, f))
recorded, total = {}, 0
for g, items in G.items():
    idx, data = {}, bytearray()
    for key, text in items:
        b = open(os.path.join(CACHE, md5(text) + '.mp3'), 'rb').read()
        idx[key] = [len(data), len(b)]; data += b; recorded[f'{g}|{key}'] = md5(text)
    open(os.path.join(AUDIO, g + '.mp3'), 'wb').write(data)
    json.dump(idx, open(os.path.join(AUDIO, g + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    total += len(data)
json.dump(recorded, open(hashes_path, 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'packed {len(G)} groups, {round(total / 1e6, 1)} MB. Remember to bump VERSION in palabras/sw.js.')
