# Generate a Seamless Tangent-Space Normal Map — DirectX

## 1. Objective

Generate a detailed, geometrically coherent tangent-space Normal Map using the DirectX / Y− convention.

Produce actual normal-vector data, not a blue-purple illustration or a colorized grayscale image.

The map is intended for a PBR workflow involving D5 Render, Twinmotion, or Unreal Engine, with the appropriate import settings.

## 2. Reference Hierarchy

### Image 1 — Master Albedo and UV Layout

Image 1 is authoritative for the exact position, shape, scale, orientation, and distribution of every feature.

Preserve its pixel dimensions, framing, and nominal coverage of 2 × 2 meters.

Do not crop, rotate, mirror, offset, rearrange, or regenerate its layout.

### Image 2 — Surface Morphology Reference

Use Image 2 to interpret the material's actual surface character: rounded or sharp edges, pores, grooves, joints, grain, undulations, and other relevant relief.

Do not transfer its perspective, feature positions, cast shadows, or lighting pattern.

Image 1 determines WHERE features belong. Image 2 guides HOW their surface geometry should be interpreted.

## 3. Authorized Geometric Estimation

Reference-guided geometric estimation is explicitly authorized.

When the exact relief cannot be recovered, choose a conservative, coherent interpretation consistent with the material. Do not ask for additional permission merely because some geometry must be inferred.

Separate pigmentation, reflections, and lighting from surface form.

Dark pixels are not automatically depressions. Bright pixels are not automatically raised areas.

Lighting may provide contextual clues about shape, but it must not be copied into the output as geometry.

Retain genuine relief while removing illumination-related artifacts. Do not reintroduce stains or damage removed from the master albedo.

## 4. Construction Method

Build a coherent interpretation of the surface before encoding its normals.

Where computational tools are available, derive normals from an inferred, periodic height field or another consistent geometric representation. Do not use raw albedo luminance as that height field.

Represent broad form, intermediate relief, and fine surface detail at appropriate scales.

Preserve actual transitions and edges without tracing every color boundary as a ridge.

Do not add generic speckle, embossed pigmentation, sharpening halos, or exaggerated grooves.

If an approved height map is actually accessible in the conversation, use it to maintain geometric consistency. Do not claim access to a map that has not been provided.

## 5. Encoding and Strength

Use tangent-space DirectX / Y− encoding with normalized vectors.

A flat surface corresponds to:
- Normal vector: (0, 0, 1).
- Normalized RGB: approximately (0.5, 0.5, 1.0).
- 8-bit equivalent: approximately (128, 128, 255).

If converting an otherwise equivalent OpenGL normal map, invert the green channel once. Do not mirror the image or invert all channels.

Use a clearly defined but moderate baseline strength.

Interpret "pronounced detail" as well-resolved surface structure, not excessive slopes or extreme RGB contrast.

A normal map necessarily contains an initial perturbation strength. Leave further artistic amplification or reduction to the renderer.

Adjust strength through appropriate vector operations and renormalization, not ordinary image contrast or gamma.

## 6. Seamless Continuity and Alignment

Maintain exact registration with Image 1.

Use periodic boundary handling for slope calculations, filtering, and any other neighborhood-based processing.

Normals must transition consistently across both tile boundaries and the corners, without artificial bands or changes of surface orientation.

Do not distort the layout to conceal seams.

## 7. Output Specifications

- Map: tangent-space Normal Map.
- Convention: DirectX / Y−.
- Channels: RGB.
- Format: lossless PNG.
- Precision: 8 bits per channel.
- Dimensions and orientation: identical to Image 1.
- Interpretation: non-color vector data; no sRGB decoding or artistic color correction.
- Filename: Material_Normal_DX.png.

Do not claim higher precision than the actual generation and export pipeline provides.

## 8. Validation and Delivery

Check that convex and concave features have the intended orientation, the map aligns with the albedo, and periodic boundaries remain continuous.

Where tools permit, inspect the result under changing light directions. Do not confuse a visually attractive RGB image with valid normal data.

Return only the completed Normal Map, without a render, labels, or other maps.

Proceed without asking for approval of already-authorized estimation. Briefly disclose any technical limitation or unverified property outside the image.