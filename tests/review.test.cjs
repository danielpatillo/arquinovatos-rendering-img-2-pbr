const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');

const skill = path.resolve(__dirname, '../skills/arquinovatos-rendering-img-2-pbr');
const mathFile = path.join(skill, 'assets/review/pbr-math.js');
const math = fs.existsSync(mathFile) ? require(mathFile) : {};
const builder = path.join(skill, 'scripts/build-review.mjs');
const names = ['Material_BaseColor.png','Material_Normal_DX.png','Material_Roughness.png','Material_AO.png','Material_Specular_UE.png','Material_Height.png'];
// Hand-checked, public-domain 1x1 PNG fixture; no user photograph is distributed.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0aUAAAAASUVORK5CYII=', 'base64');

test('specular follows UE dielectric F0 rather than treating the map as reflectance', () => {
  assert.equal(typeof math.uniforms, 'function', 'PBR controls are not implemented');
  const u=math.uniforms({specular:1,specularContrast:1});
  assert.equal(.5*u.specular[0]+u.specular[1],.04);
  assert.equal(u.specular[0]+u.specular[1],.08);
  assert.deepEqual(math.uniforms({specular:0,specularContrast:3}).specular,[0,0]);
});
test('roughness preserves linear midpoint and clamps a polished surface', () => {
  assert.equal(typeof math.uniforms, 'function', 'PBR controls are not implemented');
  const u=math.uniforms({roughness:1,roughnessContrast:2});
  assert.equal(.5*u.roughness[0]+u.roughness[1],.5);
  assert.ok(Math.abs(.2*u.roughness[0]+u.roughness[1]+.1)<1e-12);
});
test('the sphere geometry has unit radius and a continuous UV seam', () => {
  assert.equal(typeof math.sphereGeometry,'function','Sphere geometry is not implemented');
  const mesh=math.sphereGeometry(32,16);
  for(let i=0;i<mesh.vertices.length;i+=5) assert.ok(Math.abs(Math.hypot(...mesh.vertices.slice(i,i+3))-1)<1e-6);
  const row=8*33*5;
  assert.ok(Math.abs(mesh.vertices[row]-mesh.vertices[row+32*5])<1e-6);
  assert.equal(mesh.vertices[row+3],0);
  assert.equal(mesh.vertices[row+32*5+3],1);
  assert.ok(Math.max(...mesh.indices)<mesh.vertices.length/5);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arquinovatos-review-'));
  t.after(() => fs.rmSync(root, {recursive:true,force:true}));
  const maps = path.join(root,'maps'); fs.mkdirSync(maps);
  for (const name of names) fs.writeFileSync(path.join(maps,name),png);
  const photo = path.join(root,'photo.png'); fs.writeFileSync(photo,png);
  return {root,maps,photo,output:path.join(root,'Material_PBR.html')};
}
test('the delivered HTML carries all seven original image byte streams and safe user labels', t => {
  assert.ok(fs.existsSync(builder), 'Self-contained review builder is not implemented');
  const f=fixture(t);
  const label='Piedra </script><script>window.unwanted=1</script>';
  const prompts=path.join(f.root,'prompts.json'),literal="Material prompt </script> with literal $& and $` and $' instructions";
  fs.writeFileSync(prompts,JSON.stringify({'Material_BaseColor.png':{text:literal,exact:true,reference_roles:['Foto original']}}));
  const run=spawnSync(process.execPath,[builder,'--maps',f.maps,'--photo',f.photo,'--name',label,'--prompts',prompts,'--output',f.output],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const html=fs.readFileSync(f.output,'utf8');
  const match=html.match(/window\.PBR_CASES = (.*);\n/);
  assert.ok(match,'A usable data payload must be present');
  const data=JSON.parse(match[1]);
  assert.equal(data.length,1); assert.equal(data[0].maps.length,6);
  assert.equal(data[0].name,label);
  assert.equal(data[0].maps[0].prompt.text,literal);
  assert.equal(data[0].maps[0].prompt.exact,true);
  assert.deepEqual(data[0].maps[0].prompt.reference_roles,['Foto original']);
  assert.equal(data[0].maps[1].prompt,null,'A missing prompt must not be invented');
  for(const item of [{src:data[0].photo},...data[0].maps]) {
    assert.match(item.src,/^data:image\/png;base64,/);
    assert.deepEqual(Buffer.from(item.src.split(',')[1],'base64'),png);
  }
  assert.ok(!html.includes(label),'Raw closing script tags must not enter the HTML');
  assert.ok(!html.includes(f.root),'Local author paths must not leak into the portable file');
  assert.ok(!/<script[^>]+src=|<link[^>]+stylesheet/i.test(html),'The file must not require local JS/CSS siblings');
  assert.equal(fs.readdirSync(f.maps).length,6,'Review generation must not add files to maps');
});
test('an incomplete map set stops before writing a misleading complete viewer', t => {
  assert.ok(fs.existsSync(builder), 'Self-contained review builder is not implemented');
  const f=fixture(t); fs.unlinkSync(path.join(f.maps,'Material_AO.png'));
  const run=spawnSync(process.execPath,[builder,'--maps',f.maps,'--photo',f.photo,'--output',f.output],{encoding:'utf8'});
  assert.notEqual(run.status,0); assert.ok(!fs.existsSync(f.output));
});
