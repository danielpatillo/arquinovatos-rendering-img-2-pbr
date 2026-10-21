# Generate a Seamless PBR Height / Displacement Map

## 1. Objective

Generate a scalar Height / Displacement Map representing the material's relative surface elevations.

Preserve the master texture's layout while reconstructing a coherent, plausible surface.

The map must contain height information—not photographic shading, grayscale albedo, or a rendered impression of depth.

Reference-guided geometric estimation is authorized. Do not request additional permission solely because the original 3D geometry is unavailable.

## 2. Reference Hierarchy

### Image 1 — Master Albedo and UV Layout

Image 1 determines the exact location, outline, proportions, orientation, and scale of each feature.

Preserve its pixel dimensions, framing, and nominal coverage of 2 × 2 meters.

### Image 2 — Surface Geometry Reference

Use Image 2 to interpret the shape and relative relief of the material: elevations, depressions, joints, pores, rounded profiles, sharp transitions, and surface irregularities.

Do not transfer its perspective, illumination, shadows, or feature positions.

Image 1 determines WHERE features belong. Image 2 guides their inferred THREE-DIMENSIONAL FORM.

## 3. Separate Geometry From Photographic Appearance

Do not map pixel brightness directly to height.

Dark pigmentation, cast shadows, ambient occlusion, and dark reflections must not automatically become depressions.

Bright pigmentation and highlights must not automatically become raised features.

Use morphology, boundaries, spatial relationships, and material context to distinguish relief from appearance.

Removing lighting influence must not flatten genuine surface structure.

Do not reintroduce dirt or damage removed from the master albedo.

## 4. Build a Coherent Height Field

Represent one relative height per UV position.

Preserve meaningful broad relief, intermediate structure, and fine detail at appropriate scales.

Maintain smooth transitions where the surface is smooth and defined transitions where actual edges occur.

Do not emboss every color boundary, introduce sharpening halos, or convert photographic noise into microgeometry.

Maintain consistent relative elevations between different features. Do not normalize each individual piece independently.

Where references are ambiguous, prefer the simpler coherent geometric interpretation rather than unsupported elaborate detail.

Treat the result as an inferred height field, not an exact recovery of an unseen mesh or a complete representation of overhangs.

## 5. Height Encoding and Contrast

Use normalized values:
- Black, 0: lowest relative elevation.
- White, 1: highest relative elevation.
- Intermediate gray: proportional intermediate heights.

For meaningful relief, use a broad range through a single global linear mapping that preserves relative height relationships.

Do not use local contrast enhancement, histogram equalization, gamma curves, or clipped black-and-white plateaus.

Do not amplify residual noise to make an almost-flat surface occupy the entire range.

Strong height separation must come from coherent geometry, not arbitrary tonal contrast.

## 6. Physical Displacement Remains Adjustable

Do not impose a displacement amplitude in millimeters or centimeters.

The user will choose the physical scale and reference level in the renderer, conceptually:

physical displacement = amplitude × (height − reference level)

The nominal 2 × 2 meter texture coverage defines the intended horizontal scale, not the vertical displacement amplitude.

Do not assume that middle gray necessarily corresponds to the original surface plane.

## 7. Seamless Continuity

Preserve exact registration with Image 1.

Maintain periodic continuity of heights and, where appropriate, slopes across both axes and all corners.

Use wraparound boundary handling for filtering and geometric processing.

Do not introduce seam-specific ridges, depressions, or flattened strips, and do not move features to hide discontinuities.

If an approved normal map is actually available, maintain consistency with its major geometric features.

## 8. Output and Delivery

- Map: scalar Height / Displacement.
- Format: lossless single-channel grayscale PNG.
- Precision: 8 bits per channel. Preserve useful intermediate heights within this precision; do not claim recovered higher precision.
- Dimensions and orientation: identical to Image 1.
- Interpretation: linear height data, without sRGB decoding.
- Filename: Material_Height.png.

Do not present an 8-bit source merely placed in a 16-bit container as recovered height precision.

Return only the completed map, without a render, Normal Map, AO, labels, or comparison views.

Verify UV alignment, periodic continuity, and preservation of intermediate heights where tools permit. Disclose any technical limitation or unperformed verification briefly outside the image.