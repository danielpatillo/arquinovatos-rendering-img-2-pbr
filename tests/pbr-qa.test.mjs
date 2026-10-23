import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
import {preparePixels, prepareMap, pixelStats, verifySet} from '../skills/arquinovatos-rendering-img-2-pbr/scripts/pbr-qa.mjs';
import {encodePNG, decodePNG, invertNormalPNG} from '../skills/arquinovatos-rendering-img-2-pbr/scripts/normal-opengl.mjs';

// Synthetic fixtures test storage/data invariants, never material appearance.
const base = path.join(path.dirname(fileURLToPath(import.meta.url)), 'runtime');
const scratch = () => { const folder = path.join(base, randomUUID()); fs.mkdirSync(folder, {recursive: true}); return folder; };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const image = (channels, values) => ({width: 4, height: 4, channels,
  data: Buffer.from(Array.from({length: 16}, (_, i) => typeof values === 'function' ? values(i) : values).flat())});

test('near-neutral RGB becomes rounded scalar without gamma or source mutation', () => {
  const src = image(3, [120, 121, 124]), copy = Buffer.from(src.data);
  const result = preparePixels(src, 'roughness');
  assert.equal(result.image.channels, 1);
  assert.ok(result.image.data.every(value => value === 122));
  assert.equal(result.conversion.gammaApplied, false);
  assert.equal(result.conversion.maxRGBSpread, 4);
  assert.equal(result.conversion.chromaLossless, false);
  assert.deepEqual(src.data, copy);
});

test('opaque alpha is storage-only; actual transparency is rejected', () => {
  assert.equal(preparePixels(image(4, [128, 128, 255, 255]), 'normal').image.channels, 3);
  assert.throws(() => preparePixels(image(4, [128, 128, 255, 1]), 'normal'), /Transparencia/);
});

for (const source of ['directx', 'opengl']) test('normal pair is exact from ' + source, () => {
  const folder = scratch(), input = path.join(folder, 'source.png');
  const src = encodePNG(image(3, i => [120 + i, 100 + i, 250]));
  fs.writeFileSync(input, src);
  const report = prepareMap({input, map: 'normal', output: path.join(folder, 'attempt'), normalSource: source});
  const retained = fs.readFileSync(path.join(folder, 'attempt/candidate.png'));
  const opposite = fs.readFileSync(path.join(folder, 'attempt/opposite.png'));
  assert.deepEqual(retained, src);
  const a = decodePNG(retained), b = decodePNG(opposite);
  for (let at = 0; at < a.data.length; at += 3) {
    assert.equal(a.data[at], b.data[at]); assert.equal(a.data[at + 2], b.data[at + 2]);
    assert.equal(a.data[at + 1], 255 - b.data[at + 1]);
  }
  assert.deepEqual(decodePNG(invertNormalPNG(opposite)).data, a.data);
  assert.equal(report.normalPair.source.finalName, source === 'directx' ? 'Material_Normal_DX.png' : 'Material_Normal_GL.png');
  const review = JSON.parse(fs.readFileSync(path.join(folder, 'attempt/review.json')));
  assert.equal(review.approved, false); // File metrics never invent visual approval.
});

test('gray154 Specular and nonunit normals are reported without automatic rejection', () => {
  const spec = pixelStats(image(1, [154]), 'specular');
  assert.equal(spec.channels[0].median, 154);
  assert.equal(spec.specular.gray128IsHardTarget, false);
  assert.ok(Math.abs(spec.specular.F0Mean - .08 * 154 / 255) < 1e-12);
  const normal = pixelStats(image(3, [255, 255, 255]), 'normal');
  assert.ok(normal.normal.lengthMax > 1.7);
  assert.equal(normal.normal.automaticRejection, false);
});

test('attempt history is not overwritten', () => {
  const folder = scratch(), input = path.join(folder, 'input.png'), output = path.join(folder, 'attempt');
  fs.writeFileSync(input, encodePNG(image(1, [154])));
  prepareMap({input, output, map: 'specular'});
  const first = fs.readFileSync(path.join(output, 'original.png'));
  fs.writeFileSync(input, encodePNG(image(1, [155])));
  assert.throws(() => prepareMap({input, output, map: 'specular'}), /sobrescribas/);
  assert.deepEqual(fs.readFileSync(path.join(output, 'original.png')), first);
});

function setFixture() {
  const root = scratch(); fs.mkdirSync(path.join(root, 'maps')); fs.mkdirSync(path.join(root, 'work'));
  const names = ['Material_BaseColor.png', 'Material_Normal_DX.png', 'Material_Normal_GL.png',
    'Material_Roughness.png', 'Material_AO.png', 'Material_Specular_UE.png', 'Material_Height.png'];
  const gl = encodePNG(image(3, i => [120 + i, 100 + i, 250])), dx = invertNormalPNG(gl);
  const manifest = {};
  for (const name of names) {
    const bytes = name.includes('_GL') ? gl : name.includes('_DX') ? dx : encodePNG(image(name.includes('BaseColor') ? 3 : 1, name.includes('BaseColor') ? [200, 195, 180] : [154]));
    fs.writeFileSync(path.join(root, 'maps', name), bytes);
    const reviewPath = 'work/' + name + '.review.json';
    fs.writeFileSync(path.join(root, reviewPath), JSON.stringify({sha256: sha(bytes), approved: true,
      repeatReviewed: true, offsetReviewed: true, registrationReviewed: true, issues: [],
      status: 'approved_with_warnings', warnings: ['Synthetic fixture; numerical guide is not a measurement.']}));
    manifest[name] = {review: reviewPath};
  }
  manifest['Material_Normal_DX.png'] = {review: manifest['Material_Normal_GL.png'].review, derived_from: 'Material_Normal_GL.png'};
  fs.writeFileSync(path.join(root, 'work/reviews.json'), JSON.stringify(manifest));
  return {root, manifest};
}

test('seven reviewed files pass with declared warnings and GL as native source', () => {
  const {root} = setFixture(), result = verifySet({root});
  assert.equal(result.approved, true); assert.equal(result.status, 'approved_with_warnings');
  assert.equal(result.files.length, 7); assert.equal(result.normalPair.greenInverseExact, true);
});

test('pair corruption is caught even when individual hashes and reviews match', () => {
  const {root, manifest} = setFixture(), target = path.join(root, 'maps/Material_Normal_DX.png');
  const changed = decodePNG(fs.readFileSync(target)); changed.data[1] ^= 1;
  const bytes = encodePNG(changed); fs.writeFileSync(target, bytes);
  const reviewPath = 'work/independent-DX-review.json';
  fs.writeFileSync(path.join(root, reviewPath), JSON.stringify({sha256: sha(bytes), approved: true,
    repeatReviewed: true, offsetReviewed: true, registrationReviewed: true, issues: []}));
  manifest['Material_Normal_DX.png'] = {review: reviewPath};
  fs.writeFileSync(path.join(root, 'work/reviews.json'), JSON.stringify(manifest));
  const result = verifySet({root});
  assert.equal(result.approved, false); assert.equal(result.normalPair.greenInverseExact, false);
});

test('a visible defect recorded as blocking still prevents approval', () => {
  const {root, manifest} = setFixture(), reviewPath = path.join(root, manifest['Material_Height.png'].review);
  const review = JSON.parse(fs.readFileSync(reviewPath)); review.issues = ['Visible broken joint'];
  fs.writeFileSync(reviewPath, JSON.stringify(review));
  assert.equal(verifySet({root}).approved, false);
});
