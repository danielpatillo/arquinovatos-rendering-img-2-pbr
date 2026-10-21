# Generate a Seamless PBR Specular Map With Controlled, Reference-Guided Variation

## 1. Objective and Explicit Artistic Authorization

Generate a spatially varying scalar Specular Map for the non-metallic regions of the supplied material.

This is an art-directed material-authoring task, not a request for laboratory-measured reflectance.

I explicitly authorize conservative, reference-guided estimation of local specular variation where the photographs do not uniquely determine it.

Do not ask whether I accept estimated variation: that permission is already granted.

Do not resolve uncertainty by returning a constant gray image. A uniform 128/255 fill is not an acceptable final deliverable for this specific art-directed request.

The variation must remain coherent and restrained—not random, exaggerated, or falsely presented as measured data.

## 2. Reference Hierarchy

### Image 1 — Master Albedo and UV Layout

Image 1 controls the exact position, shape, proportions, orientation, and distribution of all features.

Preserve its dimensions, framing, and nominal 2 × 2 meter coverage.

Use its structure to locate material regions, not its brightness as a direct specular value.

### Image 2 — Material Composition and Appearance Reference

Use Image 2 to interpret plausible differences between constituents, binders, coatings, and exposed material.

Do not copy the positions or brightness of photographic highlights.

Image 1 controls WHERE variation occurs. Image 2 informs WHICH material differences may reasonably support it.

## 3. Meaning and Numerical Convention

Use the scalar parameter S in the interval 0–1, with:

F0 = 0.08 × S

F0 is the normal-incidence reflectance under this convention.

Examples:
- S = 0.0 corresponds to F0 = 0%.
- S = 0.5 corresponds to F0 = 4%.
- S = 1.0 corresponds to F0 = 8%.

Store S in the image, not F0 directly.

This is not a glossiness map, an RGB specular-color map, or a universal reflection-strength mask.

## 4. Required Construction Method

### A. Establish a Baseline

Choose a plausible baseline for the inferred dielectric material.

When no better material-specific information is available, use S ≈ 0.50 as a working assumption—not as the entire final image.

### B. Identify Coherent Regions

Locate relevant constituent or coating regions using the references.

Do not treat every pigment variation as a change in reflectance.

Where distinct constituents are identifiable, use modest differences in baseline values.

### C. Add Restrained Estimated Variation

Introduce subtle, spatially coherent deviations associated with the material's existing structure.

For an otherwise uncertain common dielectric, an artistic working interval around S = 0.40–0.60 may be used. This is an optional authoring range, not a measured physical range for the specific material.

Use broader variation only when the inferred material provides a reasonable basis.

When the material appears compositionally uniform, use smaller, gently varying authored deviations rather than a constant placeholder. Treat these deviations explicitly as artistic estimation.

Do not invent large patches, new surface features, or obvious speckle just to make the map nonuniform.

## 5. Keep Specular Separate From Roughness and AO

Do not make the map an inverted roughness image.

A polished region does not automatically require a higher specular value. A matte region does not automatically require a lower value.

Differences in reflection sharpness belong primarily in roughness.

Do not automatically darken joints, pores, or recesses. Their shadowing belongs in AO unless a separate material difference justifies a different specular value.

Do not copy albedo luminance, photographic highlights, height, or curvature into the map.

Do not reintroduce stains or coatings removed from Image 1.

## 6. Contrast and Rendering Control

Make the authored variation identifiable on inspection, while keeping the baseline and local deviations plausible.

Do not normalize the map to pure black and white or increase contrast merely to make it look more detailed.

Preserve intermediate values and natural transitions.

The renderer will provide final artistic adjustment. This does not require an extreme-contrast source image.

This scalar dielectric map does not fully describe exposed metals. Do not replace the metallic workflow with bright specular pixels.

## 7. Seamless Continuity and Output

Maintain exact alignment with Image 1 and periodic continuity across both axes and all corners.

- Map: scalar Specular using the convention defined above.
- Format: lossless single-channel grayscale PNG.
- Precision: 8 bits per channel.
- Dimensions and orientation: identical to Image 1.
- Interpretation: non-color scalar data; no sRGB decoding.
- Filename: Material_Specular_UE.png.

The target material must support this parameter convention; do not assume every renderer exposes identical texture inputs.

## 8. Acceptance Criteria and Delivery

The final map must contain restrained, coherent spatial variation rather than a constant fill.

It must not be grayscale albedo, inverted roughness, AO, or unrelated procedural noise.

Return one completed map without asking for confirmation of the estimation already authorized.

If technical constraints prevent a valid file, disclose them. Do not substitute a flat placeholder and describe it as the requested detailed result.