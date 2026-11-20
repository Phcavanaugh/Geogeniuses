# Dora's voice

All of ¡Hola, Palabras!'s spoken audio is made from `clips.json` with the free
[Kokoro](https://github.com/thewh1teagle/kokoro-onnx) text-to-speech model (voice `ef_dora`).

**To add or change a line:** edit `clips.json` (entries are `["group", "key", "Spanish text"]`), then run

    python3 palabras/tools/voice/make_audio.py

Lines that are already recorded are reused from the packs in `palabras/audio/`, so only new or
changed text gets recorded. Then bump `VERSION` in `palabras/sw.js`.

**One-time setup** (only needed when there are new lines to record):

    pip install kokoro-onnx numpy        # plus ffmpeg
    mkdir -p palabras/tools/voice/models && cd palabras/tools/voice/models
    curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
    curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

`models/` and `cache/` are not committed.
