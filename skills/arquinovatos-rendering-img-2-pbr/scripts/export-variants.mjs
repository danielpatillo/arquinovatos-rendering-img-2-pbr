#!/usr/bin/env node
// PBR Studio scalar contrast recipes. No image generation or source mutation.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {decodePNG,encodePNG} from './normal-opengl.mjs';
const require=createRequire(import.meta.url),M=require('../assets/review/pbr-math.js');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function exportVariants({maps}){
  if(!maps)throw Error('Falta la carpeta maps.');
  const root=fs.realpathSync(path.resolve(maps)),baseNames=['Material_BaseColor.png','Material_Normal_DX.png','Material_Normal_GL.png','Material_Roughness.png','Material_AO.png','Material_Specular_UE.png','Material_Height.png'];
  const originals=baseNames.map(name=>({name,sha256:sha(fs.readFileSync(path.join(root,name)))}));
  const outputs=[],exceptions=[],plans=[];
  for(const channel of [{key:'roughness',name:'Material_Roughness.png',prefix:'Material_Roughness',variants:M.roughnessVariants,lut:M.roughnessLUT,profile:'approved'},{key:'specular',name:'Material_Specular_UE.png',prefix:'Material_Specular_UE',variants:M.specularVariants,lut:M.specularLUT,profile:'separated-v1'}]){
    const bytes=fs.readFileSync(path.join(root,channel.name)),image=decodePNG(bytes);
    if(image.channels!==1)throw Error(channel.name+' debe ser PNG monocanal de 8 bits ya aprobado.');
    const hist=new Array(256).fill(0);for(const value of image.data)hist[value]++;
    for(const [index,variant] of channel.variants.slice(1).entries()){
      const lut=channel.lut(hist,variant.id);
      if(!lut){exceptions.push({channel:channel.key,source:channel.name,variant:variant.id,reason:'Rango ocupado de dos niveles o menos: original conservado, sin fabricar contraste.'});continue;}
      const data=Buffer.alloc(image.data.length);for(let i=0;i<data.length;i++)data[i]=lut[image.data[i]];
      const output=encodePNG({...image,data}),name=channel.prefix+'_Contraste_'+(index+1)+'.png',target=path.join(root,name);
      if(fs.existsSync(target)&&!fs.readFileSync(target).equals(output))throw Error('Existe un archivo diferente; se conservó sin sobrescribir: '+name);
      plans.push({target,bytes:output});outputs.push({name,sha256:sha(output),source:channel.name,source_sha256:sha(bytes),variant:variant.id,recipe:'reflection-contrast-v2-protected',profile:channel.profile,width:image.width,height:image.height,bits:8,channels:1});
    }
  }
  for(const plan of plans)if(!fs.existsSync(plan.target))fs.writeFileSync(plan.target,plan.bytes,{flag:'wx'});
  for(const original of originals)if(sha(fs.readFileSync(path.join(root,original.name)))!==original.sha256)throw Error('El original cambió durante la exportación: '+original.name);
  return {maps:root,recipe:'reflection-contrast-v2-protected',originalsPreserved:true,originals,files:outputs,exceptions,imageGenerationCalls:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{if(process.argv.length!==4||process.argv[2]!=='--maps')throw Error('Usa --maps CARPETA/maps');console.log(JSON.stringify(exportVariants({maps:process.argv[3]})));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
