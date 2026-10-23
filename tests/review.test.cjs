const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');

const skill = path.resolve(__dirname, '../skills/arquinovatos-rendering-img-2-pbr');
const mathFile = path.join(skill, 'assets/review/pbr-math.js');
const math = fs.existsSync(mathFile) ? require(mathFile) : {};
const builder = path.join(skill, 'scripts/build-review.mjs');
const names = ['Material_BaseColor.png','Material_Normal_DX.png','Material_Normal_GL.png','Material_Roughness.png','Material_AO.png','Material_Specular_UE.png','Material_Height.png'];
const codec = import(pathToFileURL(path.join(skill,'scripts/normal-opengl.mjs')));

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

test('UV tiling is bounded and the rounded cube carries finite orthogonal surface frames',()=>{
  assert.equal(math.uniforms({tiling:5}).tiling,5);
  const mesh=math.previewGeometry('rounded-cube');
  assert.ok(mesh.vertices.length>0);
  for(let i=0;i<mesh.vertices.length;i+=11){
    const v=mesh.vertices.slice(i,i+11);assert.ok([...v].every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...v.slice(3,6))-1)<1e-5);
    assert.ok(Math.abs(v[3]*v[6]+v[4]*v[7]+v[5]*v[8])<1e-5);
  }
  assert.ok(Math.max(...mesh.indices)<mesh.vertices.length/11);
});

async function fixture(t) {
  const {encodePNG} = await codec;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arquinovatos-review-'));
  t.after(() => fs.rmSync(root, {recursive:true,force:true}));
  const maps = path.join(root,'maps'); fs.mkdirSync(maps);
  const scalar=Buffer.from(Array.from({length:16},(_,i)=>100+i*6));
  const rgb=Buffer.from(Array.from(scalar).flatMap(v=>[v,v+5,v+10]));
  const images={};
  for (const name of names) {
    const channels=/BaseColor|Normal/.test(name)?3:1;
    images[name]=encodePNG({width:4,height:4,channels,data:channels===3?rgb:scalar});
    fs.writeFileSync(path.join(maps,name),images[name]);
  }
  const photoBytes=encodePNG({width:4,height:4,channels:3,data:rgb});
  const photo = path.join(root,'photo.png'); fs.writeFileSync(photo,photoBytes);
  return {root,maps,photo,images,photoBytes,output:path.join(root,'Material_PBR.html')};
}

test('the delivered HTML preserves seven originals and includes six contrast variants and exact prompts', async t => {
  assert.ok(fs.existsSync(builder), 'Self-contained review builder is not implemented');
  const f=await fixture(t);
  const label='Piedra </script><script>window.unwanted=1</script>';
  const prompts=path.join(f.root,'prompts.json'),literal="Material prompt </script> with literal $& and $` and $' instructions";
  fs.writeFileSync(prompts,JSON.stringify({'Material_BaseColor.png':{text:literal,exact:true,reference_roles:['Foto original']}}));
  const run=spawnSync(process.execPath,[builder,'--maps',f.maps,'--photo',f.photo,'--name',label,'--prompts',prompts,'--output',f.output,'--library',path.join(f.root,'.library')],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const html=fs.readFileSync(f.output,'utf8');
  const match=html.match(/window\.PBR_CASES = (.*);\n/);
  assert.ok(match,'A usable data payload must be present');
  const data=JSON.parse(match[1]);
  assert.equal(data.length,1); assert.equal(data[0].maps.length,13);
  assert.equal(data[0].name,label);
  assert.equal(data[0].maps[0].prompt.text,literal);
  assert.equal(data[0].maps[0].prompt.exact,true);
  assert.deepEqual(data[0].maps[0].prompt.reference_roles,['Foto original']);
  assert.equal(data[0].maps[1].prompt,null,'A missing prompt must not be invented');
  for(const item of [{src:data[0].photo},...data[0].maps]) {
    assert.match(item.src,/^data:image\/png;base64,/);
    assert.deepEqual(Buffer.from(item.src.split(',')[1],'base64'),item.filename?fs.readFileSync(path.join(f.maps,item.filename)):f.photoBytes);
  }
  assert.ok(!html.includes(label),'Raw closing script tags must not enter the HTML');
  assert.ok(!html.includes(f.root),'Local author paths must not leak into the portable file');
  assert.ok(!/<script[^>]+src=|<link[^>]+stylesheet/i.test(html),'The file must not require local JS/CSS siblings');
  assert.equal(fs.readdirSync(f.maps).length,13,'Originals and six variants belong in the real maps folder');
  for(const name of names)assert.deepEqual(fs.readFileSync(path.join(f.maps,name)),f.images[name]);
});
test('an incomplete map set stops before writing a misleading complete viewer', async t => {
  assert.ok(fs.existsSync(builder), 'Self-contained review builder is not implemented');
  const f=await fixture(t); fs.unlinkSync(path.join(f.maps,'Material_AO.png'));
  const run=spawnSync(process.execPath,[builder,'--maps',f.maps,'--photo',f.photo,'--output',f.output,'--library',path.join(f.root,'.library')],{encoding:'utf8'});
  assert.notEqual(run.status,0); assert.ok(!fs.existsSync(f.output));
});

test('moving the complete result keeps local reveal attached to the moved files', async t => {
  const f=await fixture(t);
  const run=spawnSync(process.execPath,[builder,'--maps',f.maps,'--photo',f.photo,'--output',f.output,'--library',path.join(f.root,'.library')],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const manifest=JSON.parse(fs.readFileSync(path.join(f.root,'review-files.json'),'utf8'));
  for(const file of Object.values(manifest.files))assert.equal(path.isAbsolute(file),false,'Generated manifests should follow the result folder');
  const container=fs.mkdtempSync(path.join(os.tmpdir(),'pbr-move-'));
  t.after(()=>fs.rmSync(container,{recursive:true,force:true}));
  const before=path.join(container,'before'),after=path.join(container,'after');
  assert.equal(path.dirname(before),container);assert.equal(path.dirname(after),container);
  fs.cpSync(f.root,before,{recursive:true});fs.renameSync(before,after);
  const {createReviewServer}=await import(pathToFileURL(path.join(skill,'scripts/serve-review.mjs')));
  const revealed=[];
  const local=await createReviewServer({htmlPath:path.join(after,'Material_PBR.html'),manifestPath:path.join(after,'review-files.json'),revealer:async file=>revealed.push(file)});
  t.after(()=>new Promise(resolve=>local.server.close(resolve)));
  for(const key of ['Material_BaseColor.png','__source']){
    const response=await fetch(local.origin+'/api/reveal',{method:'POST',headers:{Origin:local.origin,'X-PBR-Token':local.token,'Content-Type':'application/json'},body:JSON.stringify({key})});
    assert.equal(response.status,200);
  }
  assert.equal(revealed[0],path.join(after,'maps','Material_BaseColor.png'));
  assert.equal(path.dirname(revealed[1]),after);
  assert.deepEqual(fs.readFileSync(revealed[1]),f.photoBytes,'The portable photo must preserve the original bytes');
});
