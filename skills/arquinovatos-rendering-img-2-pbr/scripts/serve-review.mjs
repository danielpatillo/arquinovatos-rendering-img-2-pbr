#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Loopback-only companion: reveal only the files listed by this review build.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function revealCommand(file,platform=process.platform){
  if(platform==='win32')return {command:'explorer.exe',args:['/select,'+file]};
  if(platform==='darwin')return {command:'open',args:['-R',file]};
  return {command:'xdg-open',args:[path.dirname(file)]};
}
function revealFile(file){return new Promise((resolve,reject)=>{const {command,args}=revealCommand(file);const child=spawn(command,args,{stdio:'ignore',windowsHide:true,detached:true,shell:false});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});}

export async function createReviewServer({htmlPath,manifestPath,port=0,revealer=revealFile}){
  const html=fs.readFileSync(htmlPath,'utf8'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(!manifest.files||typeof manifest.files!=='object')throw Error('El manifiesto de archivos no es válido.');
  const files=Object.create(null);for(const [key,value] of Object.entries(manifest.files)){if(typeof value!=='string'||!value)throw Error('El manifiesto necesita rutas de archivos.');files[key]=fs.realpathSync(path.resolve(path.dirname(manifestPath),value));}
  const token=crypto.randomBytes(32).toString('hex');let origin;
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    const send=(status,text,type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type});res.end(text);};
    if(req.headers.host!==new URL(origin).host){send(403,'Host no permitido');return;}
    if(req.method==='GET'&&(req.url==='/'||req.url==='/Material_PBR.html')){
      const bridge='<script>window.PBR_LOCAL_BRIDGE='+JSON.stringify({origin,token})+';</script>';
      send(200,html.replace('</head>',bridge+'</head>'),'text/html; charset=utf-8');return;
    }
    if(req.method!=='POST'||req.url!=='/api/reveal'){send(404,'No encontrado');return;}
    if(req.headers.origin!==origin||req.headers['x-pbr-token']!==token){send(403,'Solicitud no autorizada');return;}
    try{
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096){send(413,'Solicitud demasiado grande');return;}}
      const {key}=JSON.parse(raw);if(typeof key!=='string'||!Object.hasOwn(files,key)){send(404,'Archivo no incluido en esta revisión');return;}
      await revealer(files[key]);send(200,'Ubicación abierta');
    }catch{send(500,'No se pudo abrir la ubicación. Revisa que el explorador de archivos esté disponible.');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{origin='http://127.0.0.1:'+server.address().port;resolve();});});
  return {server,origin,token};
}

const isCLI=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCLI){
  try{
    const options={};for(let i=2;i<process.argv.length;i+=2)options[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
    const folder=path.dirname(fileURLToPath(import.meta.url)),manifestPath=path.resolve(options.manifest||path.join(folder,'review-files.json'));
    const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    const htmlPath=path.resolve(options.html||path.join(path.dirname(manifestPath),manifest.html||'Material_PBR.html'));
    const local=await createReviewServer({htmlPath,manifestPath,port:Number(options.port||0)});
    console.log(JSON.stringify({url:local.origin,mode:'local-only',message:'Abre esta URL en la misma computadora. Ctrl+C cierra el visor local.'}));
    for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>local.server.close(()=>process.exit(0)));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
