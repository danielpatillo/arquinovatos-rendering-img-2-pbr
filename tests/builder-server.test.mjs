import test from 'node:test';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {buildReview,validateBrand} from '../skills/arquinovatos-rendering-img-2-pbr/scripts/build-review.mjs';
import {createReviewServer,folderCommand,revealCommand} from '../skills/arquinovatos-rendering-img-2-pbr/scripts/serve-review.mjs';
import {encodePNG,decodePNG} from '../skills/arquinovatos-rendering-img-2-pbr/scripts/normal-opengl.mjs';

const workspace=path.dirname(fileURLToPath(import.meta.url));
const run=path.join(workspace,'runtime','builder-server-'+randomUUID());fs.mkdirSync(run,{recursive:true});
const names=['Material_BaseColor.png','Material_Normal_DX.png','Material_Normal_GL.png','Material_Roughness.png','Material_AO.png','Material_Specular_UE.png','Material_Height.png'];
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function fixture(label){
  const root=path.join(run,label),maps=path.join(root,'maps');fs.mkdirSync(maps,{recursive:true});
  for(const [index,name] of names.entries()){
    const channels=index<3?3:1,data=Buffer.alloc(64*channels);
    for(let i=0;i<64;i++)for(let c=0;c<channels;c++)data[i*channels+c]=index===1||index===2?(c===2?250:124+i%7):(60+(i*3)%130);
    fs.writeFileSync(path.join(maps,name),encodePNG({width:8,height:8,channels,data}));
  }
  const photo=path.join(root,'photo.png');fs.copyFileSync(path.join(maps,names[0]),photo);
  const prompts=path.join(root,'prompts.json');fs.writeFileSync(prompts,JSON.stringify(Object.fromEntries(names.filter(name=>name!=='Material_Normal_GL.png').map(name=>[name,{text:'Actual prompt '+name,exact:true,reference_roles:['approved master','real crop']}]))));
  return {root,maps,photo,prompts,library:path.join(run,'history'),output:path.join(root,'Material_PBR.html')};
}
const built=fixture('build'),originals=Object.fromEntries(names.map(name=>[name,hash(path.join(built.maps,name))]));
const brandFile=path.join(built.root,'brand.json');fs.writeFileSync(brandFile,JSON.stringify({informationUrl:'https://example.org/info',socialLinks:[{label:'<script>social</script>',url:'https://example.org/social'}],landingUrl:'https://example.org/landing',configUrl:'https://example.org/config.json',revision:'</script><script>malicious()</script>'}));
const report=buildReview({...built,brand:brandFile});
const html=fs.readFileSync(built.output,'utf8'),manifest=JSON.parse(fs.readFileSync(report.manifest,'utf8'));
test('builder automatically exports six scalar variants and preserves all seven source PNG bytes',()=>{
  assert.equal(report.exports.originalsPreserved,true);assert.equal(report.exports.imageGenerationCalls,0);
  assert.equal(report.exports.files.length,6);assert.equal(report.map_files,13);
  assert.equal(fs.readdirSync(built.maps).filter(name=>name.endsWith('.png')).length,13);
  for(const name of names)assert.equal(hash(path.join(built.maps,name)),originals[name]);
  for(const file of report.exports.files){const image=decodePNG(fs.readFileSync(path.join(built.maps,file.name)));assert.equal(image.channels,1);assert.equal(image.width,8);assert.equal(image.height,8);}
});
test('manifest exposes only a typed maps directory and registered files; derived prompts retain real provenance',()=>{
  assert.equal(manifest.mapsDirectory.type,'directory');assert.equal(manifest.mapsDirectory.path,'maps');assert.equal(manifest.mapsDirectory.caseId,'01');assert.equal(manifest.mapsDirectory.entries.length,13);
  assert.equal(Object.keys(manifest.files).length,14);
  const match=html.match(/window\.PBR_CASES = (.+);\nwindow\.PBR_BRAND =/);assert.ok(match);
  const maps=JSON.parse(match[1])[0].maps;assert.deepEqual(maps.slice(0,7).map(map=>map.filename),names);
  for(const map of maps.slice(7)){assert.match(map.prompt.derived_from,/^Material_(Roughness|Specular_UE)\.png$/);assert.equal(map.prompt.text,'Actual prompt '+map.prompt.derived_from);assert.equal(map.prompt.exact,true);assert.match(map.prompt.operation,/reflection-contrast/);assert.doesNotMatch(map.prompt.operation,/255 - G/);}
  const dx=maps.find(map=>map.filename==='Material_Normal_GL.png');assert.equal(dx.prompt.operation,'G = 255 - G');
});
test('brand accepts external HTTPS configuration and escapes script-sensitive JSON',()=>{
  assert.ok(html.includes('window.PBR_BRAND = '));assert.ok(!html.includes('</script><script>malicious()'));
  const brand=JSON.parse(html.match(/window\.PBR_BRAND = (.+);\n<\/script>/)[1]);assert.equal(brand.landingUrl,'https://example.org/landing');assert.equal(brand.revision,'</script><script>malicious()</script>');
  for(const value of [{informationUrl:'javascript:alert(1)'},{landingUrl:'http://example.org'},{whatsappUrl:'https://user:password@example.org'},{socialLinks:[{label:'X',url:'file:///disk'}]},{socialLinks:{}},{revision:{}}])assert.throws(()=>validateBrand(value));
  assert.throws(()=>buildReview({...built,brand:path.join(built.root,'missing.json')}));
});
function request(local,pathname,body={},headers={}){
  return new Promise((resolve,reject)=>{
    const raw=typeof body==='string'?body:JSON.stringify(body),url=new URL(local.origin);
    const req=http.request({hostname:'127.0.0.1',port:url.port,path:pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw),Origin:local.origin,'X-PBR-Token':local.token,...headers}},res=>{let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,text}));});req.on('error',reject);req.end(raw);
  });
}
test('open maps uses exactly the manifested real directory and preserves file reveal',async()=>{
  const opened=[],revealed=[],local=await createReviewServer({htmlPath:built.output,manifestPath:report.manifest,folderOpener:folder=>opened.push(folder),revealer:file=>revealed.push(file)});
  try{
    const page=await fetch(local.origin);assert.match(await page.text(),/"canOpenMaps":true/);
    assert.equal((await request(local,'/api/open-maps',{caseId:'01'})).status,200);
    assert.equal((await request(local,'/api/open-maps',{})).status,200);
    assert.deepEqual(opened,[fs.realpathSync(built.maps),fs.realpathSync(built.maps)]);
    assert.equal((await request(local,'/api/reveal',{key:names[0]})).status,200);
    assert.deepEqual(revealed,[fs.realpathSync(path.join(built.maps,names[0]))]);
  }finally{await new Promise(resolve=>local.server.close(resolve));}
});
test('directory and file actions reject wrong host/origin/token, foreign keys and all requested paths',async()=>{
  const actions=[],local=await createReviewServer({htmlPath:built.output,manifestPath:report.manifest,folderOpener:value=>actions.push(value),revealer:value=>actions.push(value)});
  try{
    for(const route of ['/api/open-maps','/api/reveal']){
      assert.equal((await request(local,route,{}, {'X-PBR-Token':'wrong'})).status,403);
      assert.equal((await request(local,route,{}, {Origin:'https://example.org'})).status,403);
      assert.equal((await request(local,route,{}, {Host:'evil.example'})).status,403);
    }
    for(const body of [{path:'C:/Windows'},{caseId:'01',path:'../'},{key:'Material_BaseColor.png'},[]])assert.equal((await request(local,'/api/open-maps',body)).status,400);
    assert.equal((await request(local,'/api/open-maps',{caseId:'02'})).status,404);
    assert.equal((await request(local,'/api/reveal',{key:'__proto__'})).status,404);
    assert.equal((await request(local,'/api/reveal',{key:'../../unknown'})).status,404);
    assert.equal((await request(local,'/api/reveal',{key:names[0],path:'C:/Windows'})).status,400);
    assert.equal((await request(local,'/api/open-maps','{bad json')).status,400);
    assert.equal((await request(local,'/api/open-maps','x'.repeat(4097))).status,413);
    assert.deepEqual(actions,[]);
  }finally{await new Promise(resolve=>local.server.close(resolve));}
});
test('legacy manifests keep reveal support but cannot open an undeclared directory',async()=>{
  const file=path.join(built.root,'legacy.json');fs.writeFileSync(file,JSON.stringify({html:'Material_PBR.html',files:manifest.files}));
  const opened=[],local=await createReviewServer({htmlPath:built.output,manifestPath:file,folderOpener:folder=>opened.push(folder),revealer:()=>{}});
  try{
    assert.match(await (await fetch(local.origin)).text(),/"canOpenMaps":false/);
    assert.equal((await request(local,'/api/open-maps',{})).status,404);
    assert.equal((await request(local,'/api/reveal',{key:names[0]})).status,200);assert.deepEqual(opened,[]);
  }finally{await new Promise(resolve=>local.server.close(resolve));}
});
test('server rejects invalid map directories and maps pointing outside the declared directory',async()=>{
  for(const [index,mapsDirectory] of [{type:'file',path:'maps',entries:names},{type:'directory',path:'photo.png',entries:names},{type:'directory',path:'maps',entries:['__source']}].entries()){
    const file=path.join(built.root,'invalid-'+index+'.json');fs.writeFileSync(file,JSON.stringify({...manifest,mapsDirectory}));
    await assert.rejects(createReviewServer({htmlPath:built.output,manifestPath:file,folderOpener:()=>{},revealer:()=>{}}));
  }
});
test('folder commands open a directory without selecting a file on all supported platforms',()=>{
  const folder=path.resolve(built.maps);
  assert.deepEqual(folderCommand(folder,'win32'),{command:'explorer.exe',args:[folder]});
  assert.deepEqual(folderCommand(folder,'darwin'),{command:'open',args:[folder]});
  assert.deepEqual(folderCommand(folder,'linux'),{command:'xdg-open',args:[folder]});
  assert.deepEqual(revealCommand(path.join(folder,names[0]),'win32').args,['/select,'+path.join(folder,names[0])]);
});


