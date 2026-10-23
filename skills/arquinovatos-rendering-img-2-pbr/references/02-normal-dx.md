# Tangent-space Normal — either Y convention

Generate ONE usable tangent-space normal data map for the material, not a render or a purple illustration. The historical filename of this prompt does not require DirectX output.

## Actual attachments

1. Image 1: approved master albedo; authority for positions, joints, scale, orientation and UV layout.
2. Image 2: common photograph/crop; authority for material morphology, never photographic feature positions or lighting.

Preserve Image 1's actual dimensions and framing. Do not crop, rotate, rearrange or invent a different grid. Interpret color independently of geometry: a mineral inclusion is not automatically a cavity.

## Geometry and data

Infer restrained relief appropriate to the reference. Honed floor slabs remain nearly planar, joints shallow and pores subtle. Do not emboss every pigment edge, add rounded pillow-like tiles, generic noise or broad directional shading.

A flat area is approximately RGB(128,128,255). Encode coherent tangent directions; exact byte values and perfect vector length at every pixel are not acceptance targets for this generated artistic map. Grossly unrelated direction patterns or a rendered/colorized image are defects; small encoding deviations are review information.

## DX and OpenGL are both acceptable

Choose and record a requested source convention, DirectX/Y− or OpenGL/Y+. If none is preferred, use one consistently in the request. If inspection identifies the opposite convention, relabel the source and invert G to obtain the other file; **do not regenerate to force Y**. Record whether the convention was only requested or actually verified. Both versions will be delivered, and the viewer can flip Y.

Run the bundled QA helper with the source convention. It derives the second Normal through G = 255 − G, keeping R/B, dimensions and bit depth unchanged. No extra image call, gamma, contrast or artistic amplification is needed.

## Practical review and output

- One RGB PNG, 8 bits, same native dimensions as master, no transparency/text/border/collage.
- Check native appearance, repeat, offset and recognizable joint registration.
- Reject a clearly visible extra seam, broken joint or obviously false geometry; do not reject solely for a numerical edge-jump flag, imperfect vector lengths, a pixel-scale profile difference or Y convention.
- If there is a real blocking defect, use the one directed correction already included in the job. Otherwise accept with declared warnings, preserving the effective prompt, actual attachments and source bytes.

The two final files are Material_Normal_DX.png and Material_Normal_GL.png; their relationship is exact inversion of G, not two independent generations. Follow quality.md for records and acceptance.
