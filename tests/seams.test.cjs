const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const scripts=path.resolve(__dirname,'../skills/arquinovatos-rendering-img-2-pbr/scripts');
const checker=path.join(scripts,'check-seams.mjs');
const gray=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAAAAABX3VL4AAAADklEQVR4nGPk4mIR4QIAAKQAOP8W/ggAAAAASUVORK5CYII=','base64');
const load=()=>import(pathToFileURL(checker));
function texture(pixel){
  const width=64,height=64,channels=3,data=Buffer.alloc(width*height*channels);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const value=pixel(x,y);for(let c=0;c<channels;c++)data[(y*width+x)*channels+c]=value;
  }
  return {width,height,channels,data};
}

test('seam diagnostics distinguish an ordinary periodic transition from a nonperiodic ramp',async()=>{
  const {analyzeSeams}=await load();
  const periodic=texture((x,y)=>Math.round(128+35*Math.sin(x*Math.PI/32)+25*Math.sin(y*Math.PI/32)));
  const clean=analyzeSeams(periodic);
  assert.equal(clean.axes.U.suspicious,false);
  assert.equal(clean.axes.V.suspicious,false);
  const broken=analyzeSeams(texture(x=>x*4));
  assert.equal(broken.axes.U.suspicious,true);
  assert.equal(broken.axes.V.suspicious,false);
  assert.ok(broken.axes.U.meanJump>200);
});

test('matching border values cannot certify that a texture is visually seamless',async()=>{
  const {analyzeSeams}=await load();
  const report=analyzeSeams(texture(()=>128));
  assert.equal(report.requiresVisualReview,true);
  assert.equal(report.certifiesSeamless,false);
  assert.equal(report.status,'needs_visual_review');
});

test('misaligned joints on opposite edges are flagged even when most pixels are identical',async()=>{
  const {analyzeSeams}=await load();
  const image=texture((x,y)=>y>=(x<32?20:40)&&y<(x<32?23:43)?30:230);
  assert.equal(analyzeSeams(image).axes.U.suspicious,true);
});

test('grayscale PNG data is readable for QA and cannot be converted as a normal map',async()=>{
  const codec=await import(pathToFileURL(path.join(scripts,'normal-opengl.mjs')));
  const image=codec.decodePNG(gray);
  assert.equal(image.channels,1);
  assert.deepEqual([...image.data],[10,20,30,40]);
  assert.throws(()=>codec.invertNormalPNG(gray),/RGB/);
});

test('diagnostic repetitions and half-offset preserve the source pixels without editing the final map',async()=>{
  const {createDiagnostics}=await load();
  const codec=await import(pathToFileURL(path.join(scripts,'normal-opengl.mjs')));
  const image=codec.decodePNG(gray),before=Buffer.from(image.data);
  const diagnostics=createDiagnostics(image,{previewSize:2});
  const repeated=codec.decodePNG(diagnostics.repeat),offset=codec.decodePNG(diagnostics.offset);
  assert.equal(repeated.width,6);assert.equal(repeated.height,6);
  for(let y=0;y<6;y++)for(let x=0;x<6;x++){
    assert.equal(repeated.data[(y*6+x)*3],image.data[(y%2)*2+x%2]);
  }
  assert.deepEqual([...offset.data],[40,40,40,30,30,30,20,20,20,10,10,10]);
  assert.deepEqual(image.data,before);
});

test('the QA command writes only raster diagnostics and a hash-bound report outside maps',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'pbr-seams-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const maps=path.join(root,'maps'),qa=path.join(root,'work','qa');fs.mkdirSync(maps);
  const input=path.join(maps,'Material_Roughness.png');fs.writeFileSync(input,gray);
  const run=spawnSync(process.execPath,[checker,'--input',input,'--output',qa],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.deepEqual(fs.readFileSync(input),gray);
  assert.deepEqual(fs.readdirSync(maps),['Material_Roughness.png']);
  assert.deepEqual(fs.readdirSync(qa).sort(),['offset-half.png','repeat-3x3.png','seams.json']);
  const report=JSON.parse(fs.readFileSync(path.join(qa,'seams.json'),'utf8'));
  assert.match(report.sha256,/^[a-f0-9]{64}$/);
  assert.equal(report.requiresVisualReview,true);
  assert.equal(report.certifiesSeamless,false);
  const unsafe=spawnSync(process.execPath,[checker,'--input',input,'--output',maps],{encoding:'utf8'});
  assert.notEqual(unsafe.status,0);
  assert.deepEqual(fs.readdirSync(maps),['Material_Roughness.png']);
});
