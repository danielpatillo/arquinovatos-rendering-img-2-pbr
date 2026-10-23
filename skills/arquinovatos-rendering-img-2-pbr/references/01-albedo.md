# Generate a Seamless PBR Albedo / Base Color Texture

## 1. Objective

Generate a clean, seamless Albedo / Base Color texture from the supplied photograph.

The output must be a square image with a 1:1 aspect ratio, representing a nominal surface area of 2 × 2 meters.

The 1:1 specification describes the image proportions, not a physical area of 1 × 1 meter.

This output will become the master texture for generating the remaining PBR maps.

## 2. Reference Image

For the initial generation, only one reference image is supplied: the photograph of the original material. A correction also supplies the previous albedo candidate; explicitly identify each attachment and preserve the photograph as the authority for material identity.

In the subsequent map-generation steps, this photograph will be called Image 2. The albedo generated here will become Image 1, the authoritative reference for texture layout and UV alignment.

Use the photograph to identify the material, its characteristic colors, component proportions, surface organization, and representative detail.

Do not assume that another albedo or an existing UV layout has already been supplied.

## 3. Perspective, Coverage, and Scale

Produce a front-facing, orthographic-style texture of the surface plane.

Remove perspective distortion, lens distortion, depth-of-field effects, and unrelated background objects. The material must fill the entire image.

Preserve plausible proportions between visible components such as grains, joints, stones, tiles, fibers, or veins, where applicable.

Use any reliable dimensional information visible in the photograph to establish scale. Otherwise, treat 2 × 2 meters as an intended mapping scale, not a precisely recovered photographic measurement.

Reconstruct or extend the visible material as needed to create a complete square sample. Reference-guided reconstruction is authorized; do not ask for additional permission solely because some areas must be inferred.

## 4. Remove Baked Lighting Without Removing Material Identity

Estimate the material's intrinsic color independently of the photograph's illumination.

Remove cast shadows, contact darkening, ambient occlusion, specular highlights, exposure gradients, vignetting, and illumination-related color casts.

Preserve genuine pigmentation and color differences between material components.

A naturally dark joint or mineral inclusion must remain dark when its color belongs to the material. A bright pigment must not be removed merely because it resembles a highlight.

Where lighting obscures the underlying color, reconstruct a plausible continuation from comparable nearby material.

Do not add shading to suggest depth. Surface relief will be represented by separate maps.

## 5. Cleaning and Detail Preservation

Remove isolated stains, accidental dirt, fingerprints, and distinctive marks that would make repetition conspicuous.

Preserve characteristic grain, natural color variation, and representative surface detail.

Do not replace the material with generic noise, erase its identity through excessive smoothing, or introduce unrelated cracks, damage, or decorative features.

The result should represent a clean, consistent version of the photographed material—not a featureless or artificially uniform surface.

## 6. Mandatory Seamless Tiling

Create a texture that repeats continuously in both U and V.

Maintain structural and color continuity across opposite edges and all four corners. Avoid visible seams, mirrored motifs, repeated patch boundaries, and edge-specific brightness changes.

For a regular tiled floor, prefer complete slab modules with a physical grout joint crossing the texture boundary: each opposite edge carries half of that joint, so the combined joint resembles the interior joints. Do not omit the boundary joint and accidentally create double-width slabs on repetition. This is physical grout, not a decorative frame. Do not impose an exact module count, fractional joint positions or pixel widths unless the task or reference requires them; nominal coverage is not a measured tile size.

Distribute natural variation evenly enough to reduce obvious repetition.

Inspect a 3 × 3 tiled preview and a half-width/half-height offset view using the included diagnostic tool. Correct observed discontinuities with the integrated image generator, then diagnose and inspect the new candidate. Repeat this cycle until the coordinator approves the albedo; there is no fixed correction count and no user confirmation between iterations. Stop only for actual cancellation or a technical/resource condition preventing generation or inspection, and report the interruption without approving the image.

Do not include those diagnostic views in the final image or claim to have performed checks that were not actually executed.

Use the bundled pbr-qa.mjs preparation instead of writing per-project analysis scripts. Inspect a detailed joint crop only when a concrete ambiguity remains; a numerical profile difference without a visible extra seam is not a reason to seek pixel-perfect grout.

## 7. Output Specifications

- Map: Albedo / Base Color only.
- Aspect ratio: 1:1.
- Nominal coverage: 2 × 2 meters per tile.
- Resolution: request the highest genuinely supported native square resolution and disclose the actual delivered dimensions. If the tool exposes no size controls, do not claim a verified technical maximum.
- Format: lossless RGB PNG.
- Precision: 8 bits per channel. Higher precision is not required.
- Color encoding: sRGB.
- Alpha: none unless the material explicitly requires transparency.
- Filename: Material_BaseColor.png.

Do not present simple upscaling as recovered detail or an 8-to-16-bit conversion as newly recovered color information.

The delivered dimensions become the master dimensions for all subsequent maps.

## 8. Delivery

Return one completed albedo texture, not a rendered material preview, comparison sheet, collage, or collection of maps.

Do not place text, labels, borders, or watermarks inside the image.

Proceed with reasonable reference-guided estimates without requesting approval for ordinary reconstruction decisions.

Return each candidate and its review to the coordinator, retaining the effective prompt and all reference roles. A failed review calls for another targeted correction. Once the coordinator accepts the albedo, the workflow automatically starts the five derived maps without waiting for another user message.

If a technical requirement cannot be fulfilled, briefly disclose the actual limitation outside the image.
