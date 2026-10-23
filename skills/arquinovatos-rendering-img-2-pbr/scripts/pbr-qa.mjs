#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Storage conversion and read-only diagnostics; never paints or repairs a material.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodePNG, encodePNG, invertNormalPNG} from './normal-opengl.mjs';
import {analyzeSeams, createDiagnostics} from './check-seams.mjs';

const scalarMaps = new Set(['roughness', 'ao', 'specular', 'height']);
const mapTypes = new Set(['albedo', 'normal', ...scalarMaps]);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const writeJSON = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const stableWrite = (file, bytes) => {
  if (fs.existsSync(file)) {
    if (!fs.readFileSync(file).equals(bytes)) throw Error('No sobrescribas un intento distinto: ' + file);
  } else fs.writeFileSync(file, bytes);
};

export function preparePixels(image, type) {
  if (!mapTypes.has(type)) throw Error('Mapa desconocido: ' + type);
  const {width, height, channels, data} = image;
  if (width !== height) throw Error('Se requiere un mapa cuadrado.');
  if (channels === 4) for (let at = 3; at < data.length; at += 4) {
    if (data[at] !== 255) throw Error('Transparencia incompatible con este material opaco.');
  }
  const targetChannels = scalarMaps.has(type) ? 1 : 3;
  if (channels === 1 && targetChannels === 3) throw Error('Albedo y Normal requieren RGB.');
  const pixels = width * height, output = Buffer.alloc(pixels * targetChannels);
  let maxRGBSpread = 0, spreadSum = 0;
  for (let p = 0; p < pixels; p++) {
    const at = p * channels;
    if (channels >= 3) {
      const r = data[at], g = data[at + 1], b = data[at + 2];
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      maxRGBSpread = Math.max(maxRGBSpread, spread); spreadSum += spread;
      if (targetChannels === 1) output[p] = Math.round((r + g + b) / 3);
      else { output[p * 3] = r; output[p * 3 + 1] = g; output[p * 3 + 2] = b; }
    } else output[p] = data[at];
  }
  return {image: {width, height, channels: targetChannels, data: output},
    conversion: {sourceChannels: channels, outputChannels: targetChannels,
      scalarFormula: targetChannels === 1 && channels >= 3 ? 'round((R+G+B)/3)' : null,
      alphaRemoved: channels === 4, maxRGBSpread, meanRGBSpread: spreadSum / pixels,
      gammaApplied: false, contrastApplied: false, resampled: false,
      chromaLossless: targetChannels !== 1 || maxRGBSpread === 0}};
}

export function pixelStats(image, type) {
  const {channels, data, width, height} = image, count = width * height;
  const buckets = Array.from({length: channels}, () => new Float64Array(256));
  for (let at = 0; at < data.length; at++) buckets[at % channels][data[at]]++;
  const result = {channels: buckets.map(hist => {
    let sum = 0, min = 255, max = 0;
    for (let v = 0; v < 256; v++) if (hist[v]) { min = Math.min(min, v); max = v; sum += v * hist[v]; }
    const percentile = fraction => { let total = 0; for (let v = 0; v < 256; v++) { total += hist[v]; if (total > (count - 1) * fraction) return v; } return max; };
    return {min, max, mean: sum / count, p05: percentile(.05), median: percentile(.5), p95: percentile(.95)};
  })};
  if (type === 'specular') result.specular = {SMean: result.channels[0].mean / 255,
    F0Mean: .08 * result.channels[0].mean / 255, measured: false, gray128IsHardTarget: false};
  if (type === 'normal') {
    let min = Infinity, max = 0, sum = 0, nonUnit = 0, negativeZ = 0;
    for (let at = 0; at < data.length; at += 3) {
      const x = data[at] / 127.5 - 1, y = data[at + 1] / 127.5 - 1, z = data[at + 2] / 127.5 - 1;
      const length = Math.hypot(x, y, z); min = Math.min(min, length); max = Math.max(max, length); sum += length;
      if (Math.abs(length - 1) > .05) nonUnit++;
      if (z < 0) negativeZ++;
    }
    result.normal = {lengthMin: min, lengthMax: max, lengthMean: sum / count,
      fractionLengthErrorAbove005: nonUnit / count, negativeZPixels: negativeZ,
      diagnosticOnly: true, automaticRejection: false};
  }
  return result;
}

function contactSheet(image, diagnostics) {
  const repeat = decodePNG(diagnostics.repeat), offset = decodePNG(diagnostics.offset);
  const side = diagnostics.previewTileSize, width = side * 4, height = side * 3;
  const data = Buffer.alloc(width * height * 3, 218);
  const paste = (src, left, top) => { for (let y = 0; y < src.height; y++) {
    src.data.copy(data, ((top + y) * width + left) * 3, y * src.width * 3, (y + 1) * src.width * 3);
  }};
  paste(repeat, 0, 0); paste(offset, side * 3, side);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const at = (Math.floor(y * image.height / side) * image.width + Math.floor(x * image.width / side)) * image.channels;
    for (let c = 0; c < 3; c++) data[(y * width + side * 3 + x) * 3 + c] = image.data[at + (image.channels === 1 ? 0 : c)];
  }
  return encodePNG({width, height, channels: 3, data});
}

export function prepareMap({input, map, output, normalSource}) {
  if (map === 'normal' && !['directx', 'opengl'].includes(normalSource)) throw Error('Indica --normal-source directx u opengl según el origen.');
  const started = new Date().toISOString(), original = fs.readFileSync(input), decoded = decodePNG(original);
  const prepared = preparePixels(decoded, map), image = prepared.image;
  const bytes = image.channels === decoded.channels ? original : encodePNG(image);
  const directory = path.resolve(output), qa = path.join(directory, 'qa');
  fs.mkdirSync(qa, {recursive: true});
  stableWrite(path.join(directory, 'original.png'), original);
  stableWrite(path.join(directory, 'candidate.png'), bytes);
  const hash = sha(bytes), metrics = analyzeSeams(image), diagnostics = createDiagnostics(image, {previewSize: 256});
  fs.writeFileSync(path.join(qa, 'repeat-3x3.png'), diagnostics.repeat);
  fs.writeFileSync(path.join(qa, 'offset-half.png'), diagnostics.offset);
  fs.writeFileSync(path.join(qa, 'contact-sheet.png'), contactSheet(image, diagnostics));
  writeJSON(path.join(qa, 'seams.json'), {sha256: hash, source: 'candidate.png', ...metrics,
    requiresVisualReview: true, certifiesSeamless: false});
  const report = {map, sha256: hash, originalSha256: sha(original), width: image.width, height: image.height,
    channels: image.channels, bits: 8, conversion: prepared.conversion, stats: pixelStats(image, map),
    contactLayout: 'left: repeat3x3; right top: native preview; right middle: offset-half',
    nativeFile: 'candidate.png', qaStartedAt: started, qaFinishedAt: new Date().toISOString()};
  if (map === 'normal') {
    const other = invertNormalPNG(bytes); stableWrite(path.join(directory, 'opposite.png'), other);
    const sourceName = normalSource === 'directx' ? 'Material_Normal_DX.png' : 'Material_Normal_GL.png';
    const oppositeName = normalSource === 'directx' ? 'Material_Normal_GL.png' : 'Material_Normal_DX.png';
    report.normalPair = {sourceConvention: normalSource, conventionVerified: false,
      source: {file: 'candidate.png', finalName: sourceName, sha256: hash},
      opposite: {file: 'opposite.png', finalName: oppositeName, sha256: sha(other), derived_from: sourceName},
      operation: 'G = 255 - G; R/B unchanged', exact: true};
  }
  writeJSON(path.join(directory, 'qa.json'), report);
  const reviewFile = path.join(directory, 'review.json');
  if (fs.existsSync(reviewFile)) {
    if (readJSON(reviewFile).sha256 !== hash) throw Error('La revisión existente corresponde a otro candidato.');
  } else writeJSON(reviewFile, {sha256: hash, approved: false, status: 'pending_visual_review',
    repeatReviewed: false, offsetReviewed: false, registrationReviewed: false, issues: [], warnings: [], qa: 'qa.json'});
  return report;
}

const filenames = ['Material_BaseColor.png', 'Material_Normal_DX.png', 'Material_Normal_GL.png',
  'Material_Roughness.png', 'Material_AO.png', 'Material_Specular_UE.png', 'Material_Height.png'];
export function verifySet({root}) {
  root = path.resolve(root);
  const manifest = readJSON(path.join(root, 'work/reviews.json'));
  const result = {checkedAt: new Date().toISOString(), approved: false, files: [], failures: [], warnings: []};
  const cache = new Map();
  for (const name of filenames) try {
    const bytes = fs.readFileSync(path.join(root, 'maps', name)), image = decodePNG(bytes);
    cache.set(name, {bytes, image});
    const channels = /BaseColor|Normal/.test(name) ? 3 : 1;
    if (image.width !== image.height || image.channels !== channels) throw Error('Dimensiones o canales incorrectos.');
    const master = cache.get('Material_BaseColor.png')?.image;
    if (master && (image.width !== master.width || image.height !== master.height)) throw Error('Tamaño distinto del maestro.');
    const raw = manifest[name], record = typeof raw === 'string' ? {review: raw} : raw;
    if (!record?.review) throw Error('Falta la ruta a la revisión.');
    const review = readJSON(path.resolve(root, record.review));
    if (!['approved', 'repeatReviewed', 'offsetReviewed', 'registrationReviewed'].every(key => review[key] === true)) throw Error('Revisión visual sin aprobar.');
    let expectedHash = sha(bytes);
    if (record.derived_from) {
      const counterpart = name === 'Material_Normal_DX.png' ? 'Material_Normal_GL.png' : name === 'Material_Normal_GL.png' ? 'Material_Normal_DX.png' : null;
      if (!counterpart || record.derived_from !== counterpart) throw Error('Derivación no admitida.');
      const sourceRecord = manifest[record.derived_from];
      if (sourceRecord?.derived_from) throw Error('No puede haber un ciclo de derivación.');
      const source = fs.readFileSync(path.join(root, 'maps', record.derived_from));
      const expected = decodePNG(invertNormalPNG(source));
      if (!image.data.equals(expected.data) || image.width !== expected.width || image.channels !== expected.channels) throw Error('La pareja Normal no es inversión exacta de G.');
      expectedHash = sha(source);
    }
    if (review.sha256?.toLowerCase() !== expectedHash) throw Error('Hash de revisión distinto del archivo retenido/origen.');
    if ((review.issues || []).length) throw Error('La revisión declara impedimentos sin resolver.');
    const warnings = review.warnings || review.limitations || [];
    if (warnings.length) result.warnings.push({file: name, warnings});
    result.files.push({file: name, sha256: sha(bytes), width: image.width, height: image.height,
      channels: image.channels, bits: 8, review: record.review, derived_from: record.derived_from || null});
  } catch (error) { result.failures.push({file: name, error: error.message}); }
  const dx = cache.get('Material_Normal_DX.png')?.image, gl = cache.get('Material_Normal_GL.png')?.image;
  if (dx && gl && dx.width === gl.width && dx.height === gl.height && dx.channels === 3 && gl.channels === 3) {
    let mismatches = 0;
    for (let at = 0; at < dx.data.length; at += 3) {
      if (dx.data[at] !== gl.data[at] || dx.data[at + 1] !== 255 - gl.data[at + 1] || dx.data[at + 2] !== gl.data[at + 2]) mismatches++;
    }
    result.normalPair = {greenInverseExact: mismatches === 0, mismatchedPixels: mismatches};
    if (mismatches) result.failures.push({file: 'Normal pair', error: 'R/B deben coincidir y G debe estar invertida exactamente.'});
  }
  result.approved = result.failures.length === 0 && result.files.length === 7;
  result.status = result.approved ? (result.warnings.length ? 'approved_with_warnings' : 'approved') : 'pending';
  result.scope = 'Integridad y revisiones visuales registradas; no certifica bake físico, registro por píxel ni continuidad matemática.';
  writeJSON(path.join(root, 'work/set-review.json'), result);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2), options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!args[i].startsWith('--') || !args[i + 1]) throw Error('Se requieren pares --opcion VALOR.');
      options[args[i].slice(2)] = args[i + 1];
    }
    let result;
    if (command === 'prepare') {
      if (!options.input || !options.map || !options.output) throw Error('Usa prepare --input PNG --map TIPO --output CARPETA [--normal-source directx|opengl].');
      result = prepareMap({...options, normalSource: options['normal-source']});
    } else if (command === 'verify-set' && options.root) result = verifySet(options);
    else throw Error('Usa prepare o verify-set --root CARPETA.');
    console.log(JSON.stringify(result));
    if (command === 'verify-set' && !result.approved) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
