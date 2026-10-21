#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Read-only map analysis. Raster outputs are QA previews, never replacement maps.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodePNG,encodePNG} from './normal-opengl.mjs';

function validate(image){
  const {width,height,channels,data}=image;
  if(!Number.isInteger(width)||width<2||width!==height||![1,3,4].includes(channels)||data.length!==width*height*channels)throw Error('Revisa un mapa PNG cuadrado, de al menos 2 × 2 píxeles.');
}
const percentile95=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.floor((sorted.length-1)*.95)];
};

export function analyzeSeams(image){
  validate(image);
  const {width:w,height:h,channels:ch,data}=image,n=ch===1?1:3;
  const columns=new Float64Array(w-1),rows=new Float64Array(h-1);
  const difference=(a,b)=>{let total=0;for(let c=0;c<n;c++)total+=Math.abs(data[a+c]-data[b+c]);return total/n;};
  let u=0,v=0,opaque=true;
  for(let y=0;y<h;y++){
    u+=difference((y*w+w-1)*ch,y*w*ch);
    for(let x=0;x<w;x++){
      const at=(y*w+x)*ch;
      if(ch===4&&data[at+3]!==255)opaque=false;
      if(x<w-1)columns[x]+=difference(at,at+ch);
      if(y<h-1)rows[y]+=difference(at,at+w*ch);
    }
  }
  for(let x=0;x<w;x++)v+=difference(((h-1)*w+x)*ch,x*ch);
  const axis=(jump,internal)=>{
    const interiorP95=percentile95(internal),ratio=jump/Math.max(1,interiorP95);
    return {meanJump:jump,interiorP95,ratio,suspicious:jump>6&&ratio>2.5};
  };
  const axes={U:axis(u/h,columns.map(value=>value/h)),V:axis(v/w,rows.map(value=>value/w))};
  return {width:w,height:h,channels:ch,bits:8,opaque,axes,
    status:Object.values(axes).some(a=>a.suspicious)?'seam_jump_detected':'needs_visual_review',
    requiresVisualReview:true,certifiesSeamless:false};
}

export function createDiagnostics(image,{previewSize=512}={}){
  validate(image);
  if(!Number.isInteger(previewSize)||previewSize<1||previewSize>1024)throw Error('Tamaño de diagnóstico no válido.');
  const {width:w,height:h,channels:ch,data}=image,side=Math.min(w,previewSize);
  const render=(copies,offset)=>{
    const width=side*copies,height=side*copies,pixels=Buffer.alloc(width*height*3);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const sx=(Math.floor((x%side)*w/side)+(offset?Math.floor(w/2):0))%w;
      const sy=(Math.floor((y%side)*h/side)+(offset?Math.floor(h/2):0))%h;
      const from=(sy*w+sx)*ch,to=(y*width+x)*3;
      for(let c=0;c<3;c++)pixels[to+c]=data[from+(ch===1?0:c)];
    }
    return encodePNG({width,height,channels:3,data:pixels});
  };
  return {repeat:render(3,false),offset:render(1,true),previewTileSize:side};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const options={};
    for(let i=2;i<process.argv.length;i+=2){
      if(!['--input','--output'].includes(process.argv[i])||!process.argv[i+1])throw Error('Usa --input MAPA.png --output CARPETA_QA');
      options[process.argv[i].slice(2)]=process.argv[i+1];
    }
    if(!options.input||!options.output)throw Error('Usa --input MAPA.png --output CARPETA_QA');
    const input=fs.realpathSync(options.input),output=path.resolve(options.output);
    const normalize=p=>process.platform==='win32'?p.toLowerCase():p;
    if(normalize(path.dirname(input))===normalize(output))throw Error('Guarda los diagnósticos fuera de la carpeta de mapas.');
    const bytes=fs.readFileSync(input),image=decodePNG(bytes),report=analyzeSeams(image);
    const diagnostics=createDiagnostics(image);
    fs.mkdirSync(output,{recursive:true});
    if(normalize(path.dirname(input))===normalize(fs.realpathSync(output)))throw Error('Guarda los diagnósticos fuera de la carpeta de mapas.');
    fs.writeFileSync(path.join(output,'repeat-3x3.png'),diagnostics.repeat);
    fs.writeFileSync(path.join(output,'offset-half.png'),diagnostics.offset);
    const result={source:path.basename(input),sha256:createHash('sha256').update(bytes).digest('hex'),...report,
      previewTileSize:diagnostics.previewTileSize,diagnostics:{repeat:'repeat-3x3.png',offset:'offset-half.png'},
      note:'Métricas de alerta, no aprobación automática. Inspecciona ambas imágenes; las previsualizaciones no modifican el mapa.'};
    fs.writeFileSync(path.join(output,'seams.json'),JSON.stringify(result,null,2)+'\n','utf8');
    console.log(JSON.stringify(result));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
