# Swapping in new 3D models for ¡Defensa!

Drop a `.glb` file here and list it in `models.json` by the name of the tower or critter it replaces:

```json
{ "gato": "gato.glb", "hormiga": "my-ant.glb" }
```

Names: towers `gato`, `abeja`, `pulpo`, `dragon`, `huerto`; critters `hormiga`, `raton`, `murcielago`, `caracol`, `mapache`, `cocodrilo`, `oso`.

The model is scaled to about one tower wide and stood on the ground, facing +z. Anything not listed keeps its built-in model.
Pictures (land textures, skies, logo, HUD icons) are swapped by replacing the file with the same name in `art/defensa/` or `art/defensa/ui/`.
