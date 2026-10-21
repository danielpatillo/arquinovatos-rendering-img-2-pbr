# Generate a Seamless PBR Roughness Map Through Surface-Finish Interpretation

## 1. Objective

Generate a useful, material-specific Roughness Map that describes spatial differences in surface finish.

The result must be constructed from an interpretation of the material, not by desaturating, inverting, equalizing, or increasing the contrast of the albedo.

Reference-guided artistic estimation is explicitly authorized. Produce the map without requesting further permission to estimate uncertain properties.

The goal is a coherent rendering input—not a grayscale image that merely resembles the source photograph.

## 2. Reference Hierarchy

### Image 1 — Master Albedo and UV Layout

Use Image 1 for exact feature positions, boundaries, proportions, orientation, and scale.

Preserve its dimensions, framing, and nominal 2 × 2 meter coverage.

Its colors may help identify material regions, but their brightness must not directly determine roughness values.

### Image 2 — Material and Surface-Finish Reference

Use Image 2 to interpret the material's finish: polished, satin, matte, granular, porous, coated, exposed, or otherwise relevant.

Do not transfer photographic highlights, shadows, perspective, or illumination gradients.

Image 1 controls spatial registration. Image 2 guides the interpretation of surface finish.

## 3. Required Construction Workflow

### A. Identify Actual Surface Categories

Identify the meaningful constituents and finish regions present in the references.

Examples may include a material's main surface, binder, mineral inclusions, joints, coating, or exposed substrate—but only use categories that make sense for the supplied material.

Do not classify every color change as a different finish.

### B. Assign a Baseline Roughness to Each Category

Assign plausible roughness values according to the inferred finish, not the category's brightness.

As optional artistic starting ranges:
- Polished or smooth: approximately 0.10–0.30.
- Satin or moderately smooth: approximately 0.30–0.55.
- Matte: approximately 0.55–0.80.
- Very rough or porous: approximately 0.75–0.95.

These are authoring guides, not measured values or universal material constants. Select only the ranges relevant to the references; do not force the material to contain every category.

### C. Add Restrained Within-Region Variation

Add coherent local variation associated with the material's surface structure.

Keep fine variation weaker than meaningful differences between finish categories. As an initial artistic guide, variations of approximately ±0.02 to ±0.05 around a region's baseline may be sufficient.

Adapt the variation scale and direction to the material. Do not overlay generic noise, random clouds, artificial scratches, or photographic grain.

### D. Preserve Natural Transitions

Keep changes sharp where a real material or coating boundary exists.

Use gradual transitions where the finish changes gradually.

Avoid posterized segmentation, arbitrary gray patches, excessive blur, and edge halos.

## 4. Essential Interpretation Rules

Two regions with different colors but the same finish may require similar roughness.

Two regions with similar colors but different finishes may require different roughness.

A dark joint is not automatically smooth. A bright grain is not automatically rough.

A raised feature is not automatically polished, and a depression is not automatically matte.

Do not copy height, AO, or curvature into roughness. Those properties may inform interpretation only when there is a plausible relationship to surface finish.

Do not reintroduce dirt or stains removed from Image 1.

Shared boundaries with the albedo are legitimate. The problem is direct brightness copying, not all structural resemblance.

## 5. Values and Artistic Control

Use the standard convention:
- Black, 0: minimum roughness.
- White, 1: maximum roughness.
- Intermediate gray: intermediate roughness.

Store the roughness parameter itself. Do not invert it into glossiness or pre-apply an undocumented shader-specific transformation.

Use enough contrast to distinguish genuinely different finishes, while preserving continuous intermediate values.

Do not stretch the histogram to pure black and white simply to make the image look dramatic.

Choose a useful, non-flat estimate when the material supports variation. Do not substitute either a uniform placeholder or unrelated noise for uncertain information.

Final adjustments to average roughness and variation strength will be made in the renderer.

## 6. Seamless Continuity and UV Registration

Keep every region aligned with Image 1.

Use periodic processing so values and texture structure remain continuous across both axes and all corners.

Do not crop, rotate, mirror, offset, or reshape features.

## 7. Quality Checks

Reject and revise the result if it is primarily:
- A desaturated, inverted, or contrast-adjusted albedo.
- A height or AO map disguised as roughness.
- An unrelated noise field.
- A patchwork of arbitrary grayscale regions.

Where rendering tools are available, evaluate the roughness using a neutral base color and controlled lighting so albedo variation cannot disguise an incorrect result.

Do not claim to have performed a render test unless it was actually executed.

## 8. Output and Delivery

- Map: Roughness only.
- Format: lossless single-channel grayscale PNG.
- Precision: 8 bits per channel.
- Dimensions and orientation: identical to Image 1.
- Interpretation: non-color scalar data; no sRGB decoding or presentation gamma.
- Filename: Material_Roughness.png.

Return one completed map, not alternatives, a collage, or a request to approve estimation.

Briefly disclose any technical limitation outside the image.