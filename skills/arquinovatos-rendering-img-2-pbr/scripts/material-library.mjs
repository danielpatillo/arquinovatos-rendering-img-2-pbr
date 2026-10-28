#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ownFolder=path.dirname(fileURLToPath(import.meta.url));
const baseNames=['Material_BaseColor.png','Material_Normal_DX.png','Material_Normal_GL.png','Material_Roughness.png','Material_AO.png','Material_Specular_UE.png','Material_Height.png'];
const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const inline=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const inside=(root,file)=>{const relative=path.relative(root,file);return !path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep);};
const same=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
const isFile=file=>{try{return same(fs.realpathSync(file),file)&&fs.statSync(file).isFile();}catch{return false;}};
const isDirectory=file=>{try{return same(fs.realpathSync(file),file)&&fs.statSync(file).isDirectory();}catch{return false;}};
export const defaultLibraryRoot=(home=os.homedir())=>path.join(home,'Arquinovatos','Materiales_PBR');

function atomicWrite(file,data){
  const temporary=path.join(path.dirname(file),'.'+path.basename(file)+'.'+randomUUID()+'.tmp');
  try{
    const fd=fs.openSync(temporary,'wx');try{fs.writeFileSync(fd,data);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    fs.renameSync(temporary,file);
  }finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
function withLock(root,action){
  const lock=path.join(root,'.historial.lock'),deadline=Date.now()+5000;let fd;
  while(fd===undefined){
    try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid}));}
    catch(error){
      if(error.code!=='EEXIST')throw error;
      let dead=false;
      try{const owner=readJSON(lock);if(Number.isInteger(owner.pid)&&owner.pid>0)try{process.kill(owner.pid,0);}catch(error){dead=error.code==='ESRCH';}}catch{}
      if(dead){try{fs.unlinkSync(lock);}catch{}continue;}
      if(Date.now()>=deadline)throw Error('La biblioteca está ocupada. Conserva el material y vuelve a registrar cuando termine la otra escritura.');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,40);
    }
  }
  try{return action();}finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
function prepareRoot(value){
  const requested=path.resolve(value||defaultLibraryRoot());fs.mkdirSync(requested,{recursive:true});const root=fs.realpathSync(requested);
  const records=path.join(root,'.historial');fs.mkdirSync(records,{recursive:true});if(!isDirectory(records))throw Error('El historial no puede ser un enlace a otra carpeta.');return root;
}
export function allocateMaterial({library,name='Material PBR'}={}){
  const root=path.resolve(library||defaultLibraryRoot());fs.mkdirSync(root,{recursive:true});
  const slug=String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'material';
  const material=path.join(fs.realpathSync(root),new Date().toISOString().slice(0,10)+'-'+slug+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(material);for(const folder of ['maps','work'])fs.mkdirSync(path.join(material,folder));
  return {library:fs.realpathSync(root),root:material,maps:path.join(material,'maps')};
}
function resolveRecord(root,record){
  if(!record||record.version!==1||!/^[a-f0-9]{24}$/.test(record.id)||typeof record.name!=='string'||typeof record.casePath!=='string'||!['ready','png-only','viewer-pending','viewer-error'].includes(record.status)||!Number.isFinite(Date.parse(record.createdAt)))throw Error('Registro de material no válido.');
  const material=path.resolve(root,record.casePath),maps=path.resolve(material,record.mapsPath||'maps');
  if(!inside(material,maps)||maps===material)throw Error('La carpeta de mapas debe pertenecer a este material.');
  let html=null;if(record.html){html=path.resolve(material,record.html);if(!inside(material,html)||path.extname(html).toLowerCase()!=='.html')throw Error('Visor fuera de la carpeta del material.');}
  const available=isDirectory(material)&&isDirectory(maps)&&baseNames.every(name=>isFile(path.join(maps,name)));
  return {...record,root:material,maps,htmlPath:html,available,hasViewer:available&&record.status==='ready'&&!!html&&isFile(html),thumbnailPath:available?path.join(maps,baseNames[0]):null};
}
export function readLibrary(library=defaultLibraryRoot()){
  const root=path.resolve(library),records=path.join(root,'.historial'),materials=[],warnings=[];
  if(!fs.existsSync(records))return {materials,warnings};
  if(!isDirectory(records))throw Error('El historial no puede ser un enlace a otra carpeta.');
  for(const item of fs.readdirSync(records,{withFileTypes:true})){
    if(!item.isFile()||!item.name.endsWith('.json'))continue;
    try{const record=readJSON(path.join(records,item.name));if(item.name!==record.id+'.json')throw Error('Identificador de registro incorrecto.');materials.push(resolveRecord(root,record));}
    catch{warnings.push({file:item.name,message:'No se pudo leer este registro. El archivo se conserva para recuperarlo.'});}
  }
  materials.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));return {materials,warnings};
}
export function libraryEntries(library,{baseUrl}={}){
  const {materials,warnings}=readLibrary(library);
  return {materials:materials.map(item=>({id:item.id,name:item.name,createdAt:item.createdAt,updatedAt:item.updatedAt,status:item.status,available:item.available,hasViewer:item.hasViewer,mapCount:item.available?fs.readdirSync(item.maps).filter(n=>/^Material_[A-Za-z0-9_]+\.png$/.test(n)).length:0,
    href:item.hasViewer?(baseUrl?baseUrl+'/materials/'+item.id:pathToFileURL(item.htmlPath).href):'',thumbnail:item.thumbnailPath?(baseUrl?baseUrl+'/library/thumbnail/'+item.id:pathToFileURL(item.thumbnailPath).href):''})),warnings:warnings.length};
}
function fillLibraryHTML(html,library,options){
  const data=libraryEntries(library,options);
  return html.replace(/window\.PBR_LIBRARY = .*;\r?\n/,()=> 'window.PBR_LIBRARY = '+inline(data.materials)+';\n').replace(/window\.PBR_LIBRARY_WARNINGS = .*;\r?\n/,()=> 'window.PBR_LIBRARY_WARNINGS = '+data.warnings+';\n');
}
function buildLibraryHTML(library){
  const assets=path.resolve(ownFolder,'../assets/review');let html=fs.readFileSync(path.join(assets,'library.html'),'utf8');
  for(const name of ['logo-dark.png','logo-light.png'])html=html.replace('src="'+name+'"',()=> 'src="data:image/png;base64,'+fs.readFileSync(path.join(assets,name)).toString('base64')+'"');
  html=html.replace('<link rel="stylesheet" href="styles.css">',()=>'<style>\n'+fs.readFileSync(path.join(assets,'styles.css'),'utf8')+'\n</style>');
  html=html.replace('<script src="library.js" defer></script>',()=>'<script>\n'+fs.readFileSync(path.join(assets,'library.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>');
  return fillLibraryHTML(html,library);
}
export function libraryPage(library,options){return fillLibraryHTML(fs.readFileSync(path.join(library,'Biblioteca_PBR.html'),'utf8'),library,options);}

function writeCatalogue(library){
  atomicWrite(path.join(library,'Biblioteca_PBR.html'),buildLibraryHTML(library));
  for(const [source,destination] of [['serve-review.mjs','Iniciar_biblioteca.mjs'],['material-library.mjs','material-library.mjs']]){
    const from=path.join(ownFolder,source),to=path.join(library,destination);if(!same(from,to))atomicWrite(to,fs.readFileSync(from));
  }
  return {library,index:path.join(library,'Biblioteca_PBR.html'),launcher:path.join(library,'Iniciar_biblioteca.mjs')};
}
export function refreshLibrary({library}={}){
  const root=prepareRoot(library);
  return withLock(root,()=>{const result=writeCatalogue(root),history=readLibrary(root);return {...result,materials:history.materials.length,warnings:history.warnings.length};});
}

export function registerMaterial({library,root,name='Material PBR',html,status='ready'}={}){
  if(!root)throw Error('Falta la carpeta del material.');
  const material=fs.realpathSync(path.resolve(root));if(!fs.statSync(material).isDirectory())throw Error('El material debe ser una carpeta.');
  const manifestPath=path.join(material,'review-files.json'),manifest=fs.existsSync(manifestPath)?readJSON(manifestPath):null;
  const maps=path.resolve(material,manifest?.mapsDirectory?.path||'maps');
  if(!isDirectory(maps)||!inside(material,maps)||!baseNames.every(n=>isFile(path.join(maps,n))))throw Error('El material necesita los siete PNG finales dentro de su carpeta maps.');
  const htmlPath=html?path.resolve(html):manifest?.html?path.resolve(material,manifest.html):path.join(material,'Material_PBR.html');
  if(status==='ready'&&(!isFile(htmlPath)||!manifest||!inside(material,htmlPath)))throw Error('Falta el visor o su manifiesto para registrar un material listo.');
  const libraryRoot=prepareRoot(library),relative=path.relative(libraryRoot,material),casePath=inside(libraryRoot,material)?relative.split(path.sep).join('/'):material;
  const identity=process.platform==='win32'?casePath.toLowerCase():casePath,id=createHash('sha256').update(identity).digest('hex').slice(0,24);
  return withLock(libraryRoot,()=>{
    const file=path.join(libraryRoot,'.historial',id+'.json'),previous=fs.existsSync(file)?readJSON(file):null;
    const dateSource=fs.statSync(status==='ready'?htmlPath:maps),createdAt=previous?.createdAt||(dateSource.birthtimeMs>0?dateSource.birthtime:dateSource.mtime).toISOString();
    const record={version:1,id,name:String(name),casePath,mapsPath:path.relative(material,maps).split(path.sep).join('/'),html:status==='ready'?path.relative(material,htmlPath).split(path.sep).join('/'):null,status,createdAt,updatedAt:new Date().toISOString()};
    resolveRecord(libraryRoot,record);
    // One atomic record per material prevents concurrent jobs from losing history.
    atomicWrite(file,JSON.stringify(record,null,2)+'\n');
    return {...record,...writeCatalogue(libraryRoot),registered:true};
  });
}

export function importMaterials({library,from}={}){
  if(!from)throw Error('Indica únicamente la carpeta de resultados que quieres importar.');
  const source=fs.realpathSync(path.resolve(from)),queue=[{folder:source,depth:0}],result={imported:0,skipped:[],from:source};let visited=0;
  const excluded=new Set(['work','maps','node_modules','.git','.historial','tests']);
  while(queue.length){
    const {folder,depth}=queue.shift();if(++visited>10000)throw Error('La carpeta indicada es demasiado amplia. Importa una carpeta de resultados más concreta.');
    if(fs.existsSync(path.join(folder,'review-files.json'))){
      try{const manifest=readJSON(path.join(folder,'review-files.json'));registerMaterial({library,root:folder,name:manifest.name||path.basename(folder),status:'ready'});result.imported++;}
      catch(error){result.skipped.push({folder,message:error.message});}
      continue;
    }
    if(depth>=8)continue;
    for(const item of fs.readdirSync(folder,{withFileTypes:true}))if(item.isDirectory()&&!item.isSymbolicLink()&&!excluded.has(item.name))queue.push({folder:path.join(folder,item.name),depth:depth+1});
  }
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const command=process.argv[2],options={};for(let i=3;i<process.argv.length;i+=2){if(!process.argv[i].startsWith('--')||process.argv[i+1]===undefined)throw Error('Usa opciones --nombre valor.');options[process.argv[i].slice(2)]=process.argv[i+1];}
    let result;
    if(command==='new')result=allocateMaterial(options);
    else if(command==='register')result=registerMaterial({...options,root:options.material});
    else if(command==='import')result=importMaterials(options);
    else if(command==='refresh')result=refreshLibrary(options);
    else if(command==='list')result={library:path.resolve(options.library||defaultLibraryRoot()),...readLibrary(options.library)};
    else throw Error('Usa new, register, import, refresh o list. --library es opcional.');
    console.log(JSON.stringify(result));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
