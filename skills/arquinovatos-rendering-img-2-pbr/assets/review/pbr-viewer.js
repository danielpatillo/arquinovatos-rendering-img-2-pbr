/* Original dependency-free material preview. SPDX-License-Identifier: MIT */
(() => {
  'use strict';
  const M=window.PBRMath;
  const variantChannels=[{key:'roughness',label:'Roughness',slot:2,filename:'Material_Roughness.png',prefix:'Material_Roughness',variants:M.roughnessVariants,lut:M.roughnessLUT},{key:'specular',label:'Specular',slot:4,filename:'Material_Specular_UE.png',prefix:'Material_Specular_UE',variants:M.specularVariants,lut:M.specularLUT}];
  class MaterialPreview {
    constructor(canvas,status){
      Object.assign(this,{canvas,status,settings:M.defaults(),pitch:.12,yaw:.6,epoch:0,ready:false,auto:false,invertY:false,textures:[],shape:'sphere'});
      const gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true});
      if(!gl)throw Error('WebGL no está disponible. Puedes seguir viendo los mapas y copiando sus prompts.');
      this.gl=gl;this.vertexHeight=gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)>0;
      const vertex=`precision highp float;
        attribute vec3 aPosition,aNormal,aTangent;attribute vec2 aUV;
        uniform mat4 uProjection;uniform mat3 uRotation;
        uniform float uHeight,uTiling,uPlane;uniform sampler2D uHeightMap;
        varying vec2 vUV;varying vec3 vPosition,vNormal,vTangent;
        void main(){
          if(uPlane>0.5){vUV=aUV;vPosition=vec3(0.0);vNormal=vec3(0.0,1.0,0.0);vTangent=vec3(1.0,0.0,0.0);gl_Position=vec4(aPosition.xy,0.0,1.0);return;}
          float h=0.0;${this.vertexHeight?'h=(texture2D(uHeightMap,fract(aUV*uTiling)).r-0.5)*uHeight;':''}
          vPosition=uRotation*(aPosition+aNormal*h);vNormal=uRotation*aNormal;vTangent=uRotation*aTangent;vUV=aUV;
          gl_Position=uProjection*vec4(vPosition-vec3(0.0,0.0,3.6),1.0);
        }`;
      const fragment=`precision highp float;
        varying vec2 vUV;varying vec3 vPosition,vNormal,vTangent;
        uniform sampler2D uAlbedoMap,uNormalMap,uRoughMap,uAOMap,uSpecMap,uHeightMap;
        uniform vec2 uRoughCurve,uSpecCurve,uViewport;uniform vec3 uBackground,uPlaneEye;
        uniform float uAlbedo,uNormal,uAO,uHeight,uTiling,uNormalY,uPlane;
        const float PI=3.14159265359;
        vec4 tex(sampler2D map,vec2 uv){return texture2D(map,fract(uv*uTiling));}
        vec3 linearColor(vec3 c){return mix(c/12.92,pow((c+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),c));}
        vec3 displayColor(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),c));}
        vec3 lamp(vec3 n,vec3 v,vec3 direction,vec3 power,vec3 color,float rough,float f0){
          vec3 l=normalize(direction),h=normalize(l+v);
          float nl=max(dot(n,l),0.0),nv=max(dot(n,v),0.0001),nh=max(dot(n,h),0.0),vh=max(dot(v,h),0.0);
          float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.0)+1.0;
          float distribution=a2/max(PI*den*den,0.0000001);
          float visibility=0.5/max(nl*sqrt(nv*nv*(1.0-a2)+a2)+nv*sqrt(nl*nl*(1.0-a2)+a2),0.00001);
          float fresnel=f0+(1.0-f0)*pow(1.0-vh,5.0);
          return power*nl*((1.0-fresnel)*color/PI+vec3(distribution*visibility*fresnel));
        }
        void main(){
          vec2 uv=vUV;vec3 position=vPosition,geometric=normalize(vNormal),t=normalize(vTangent-geometric*dot(vTangent,geometric)),eye=vec3(0.0,0.0,3.6);float fog=0.0;
          if(uPlane>0.5){
            eye=uPlaneEye;vec3 forward=normalize(vec3(0.0,-0.85,0.0)-eye),right=normalize(cross(forward,vec3(0.0,1.0,0.0))),up=cross(right,forward);
            vec2 screen=gl_FragCoord.xy/uViewport*2.0-1.0;
            vec3 ray=normalize(forward+0.36397023*(right*screen.x*uViewport.x/uViewport.y+up*screen.y));
            if(ray.y>=-0.00001){gl_FragColor=vec4(uBackground,1.0);return;}
            float distance=(-0.85-eye.y)/ray.y;
            for(int i=0;i<4;i++){position=eye+ray*distance;float h=tex(uHeightMap,position.xz*0.5).r;distance=(-0.85+(h-0.5)*uHeight-eye.y)/ray.y;}
            if(distance<=0.0){gl_FragColor=vec4(uBackground,1.0);return;}
            position=eye+ray*distance;uv=position.xz*0.5;geometric=vec3(0.0,1.0,0.0);t=vec3(1.0,0.0,0.0);fog=1.0-exp(-distance*0.018);
          }
          vec3 b=normalize(cross(t,geometric));vec3 local=tex(uNormalMap,uv).xyz*2.0-1.0;
          local=normalize(vec3(local.x*uNormal,local.y*uNormal*uNormalY,max(local.z,0.001)));
          if(uPlane>0.5${this.vertexHeight?'':'||true'}){
            float e=0.001/max(uTiling,0.25),dx=tex(uHeightMap,uv+vec2(e,0.0)).r-tex(uHeightMap,uv-vec2(e,0.0)).r,dy=tex(uHeightMap,uv+vec2(0.0,e)).r-tex(uHeightMap,uv-vec2(0.0,e)).r;
            local=normalize(local+vec3(-dx,-dy,0.0)*uHeight*80.0);
          }
          vec3 n=normalize(t*local.x+b*local.y+geometric*local.z),v=normalize(eye-position),color=linearColor(tex(uAlbedoMap,uv).rgb)*uAlbedo;
          float rough=clamp(tex(uRoughMap,uv).r*uRoughCurve.x+uRoughCurve.y,0.035,1.0),f0=clamp(tex(uSpecMap,uv).r*uSpecCurve.x+uSpecCurve.y,0.0,0.08),ao=pow(max(tex(uAOMap,uv).r,0.0001),uAO);
          vec3 light=lamp(n,v,vec3(-.7,1.1,1.3),vec3(4.7,4.5,4.2),color,rough,f0);
          light+=lamp(n,v,vec3(1.0,.2,.7),vec3(.65,.82,1.0),color,rough,f0);
          light+=lamp(n,v,vec3(.8,.9,-.6),vec3(1.5,1.7,2.0),color,rough,f0);
          light+=color*(.08+.16*max(n.y,0.0))*ao;
          vec3 mapped=clamp((light*(2.51*light+.03))/(light*(2.43*light+.59)+.14),0.0,1.0);
          gl_FragColor=vec4(mix(displayColor(mapped),uBackground,fog),1.0);
        }`;
      const compile=(kind,source)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('El probador no pudo compilarse: '+gl.getShaderInfoLog(shader));return shader;};
      this.program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('No se pudo iniciar el probador WebGL.');
      gl.useProgram(this.program);this.u={};for(const name of ['uProjection','uRotation','uHeight','uTiling','uPlane','uNormalY','uViewport','uBackground','uPlaneEye','uAlbedo','uNormal','uAO','uRoughCurve','uSpecCurve','uAlbedoMap','uNormalMap','uRoughMap','uAOMap','uSpecMap','uHeightMap'])this.u[name]=gl.getUniformLocation(this.program,name);
      this.setShape('sphere');gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);
      let drag=null;
      canvas.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
      canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;this.yaw+=(e.clientX-drag.x)*.012;this.pitch=Math.max(-.5,Math.min(1.4,this.pitch+(e.clientY-drag.y)*.012));drag.x=e.clientX;drag.y=e.clientY;this.schedule();});
      const release=()=>{drag=null;canvas.classList.remove('dragging');};for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
      canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();this.yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;this.pitch=Math.max(-.5,Math.min(1.4,this.pitch+(e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0)));this.schedule();});
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;status.textContent='Se interrumpió la vista 3D. Recarga la página; los archivos y prompts siguen disponibles.';});
      new ResizeObserver(()=>this.schedule()).observe(canvas);document.addEventListener('visibilitychange',()=>this.schedule());document.addEventListener('pbr-theme',()=>this.schedule());
    }
    setShape(shape){
      const gl=this.gl,mesh=M.previewGeometry(shape);this.shape=shape;this.count=mesh.indices.length;
      if(this.vertexBuffer)gl.deleteBuffer(this.vertexBuffer);if(this.indexBuffer)gl.deleteBuffer(this.indexBuffer);
      this.vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
      for(const [name,count,offset] of [['aPosition',3,0],['aNormal',3,12],['aTangent',3,24],['aUV',2,36]]){const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,count,gl.FLOAT,false,44,offset);}
      this.indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);this.schedule();
    }
    async load(item){
      const epoch=++this.epoch;this.ready=false;this.status.textContent='Cargando el material…';
      for(const channel of variantChannels){this[channel.key+'Sources']=null;this[channel.key+'Original']=item.maps.find(m=>m.filename===channel.filename)?.src;}
      const names=['Material_BaseColor.png','Material_Normal_DX.png','Material_Roughness.png','Material_AO.png','Material_Specular_UE.png','Material_Height.png'];
      try{
        const images=await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const map=item.maps.find(m=>m.filename===name);if(!map){reject(Error('Falta '+name));return;}const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('No cargó '+name+'. Recarga la página.'));image.src=map.src;})));
        if(epoch!==this.epoch)return;const gl=this.gl,max=gl.getParameter(gl.MAX_TEXTURE_SIZE);if(images.some(im=>im.width>max||im.height>max))throw Error('Este equipo admite texturas de hasta '+max+' px. Puedes ver los mapas completos en la galería.');
        for(const texture of this.textures)gl.deleteTexture(texture);this.textures=[];
        for(const image of images){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);for(const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);for(const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,name,gl.LINEAR);this.textures.push(texture);}
        for(const channel of variantChannels){
          const original=images[channel.slot],scratch=document.createElement('canvas');scratch.width=original.naturalWidth;scratch.height=original.naturalHeight;
          const ctx=scratch.getContext('2d',{willReadFrequently:true});ctx.drawImage(original,0,0);const source=ctx.getImageData(0,0,scratch.width,scratch.height),hist=new Array(256).fill(0);
          for(let i=0;i<source.data.length;i+=4)hist[source.data[i]]++;
          const sources={original};this[channel.key+'Sources']=sources;
          for(const variant of channel.variants.slice(1)){
            const lut=channel.lut(hist,variant.id);if(!lut)continue;
            const canvas=document.createElement('canvas');canvas.width=scratch.width;canvas.height=scratch.height;
            const pixels=new ImageData(new Uint8ClampedArray(source.data),canvas.width,canvas.height);
            for(let i=0;i<pixels.data.length;i+=4)pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=lut[source.data[i]];
            canvas.getContext('2d').putImageData(pixels,0,0);sources[variant.id]=canvas;
          }
        }
        this.ready=true;this.status.textContent='';this.schedule();
      }catch(error){if(epoch===this.epoch)this.status.textContent=error.message;}
    }
    setVariant(key,id){
      const channel=variantChannels.find(item=>item.key===key),source=this[key+'Sources']?.[id];if(!channel||!source||!this.ready)return;
      const gl=this.gl;gl.activeTexture(gl.TEXTURE0+channel.slot);gl.bindTexture(gl.TEXTURE_2D,this.textures[channel.slot]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);this[key+'Variant']=id;this.schedule();
    }
    setRoughnessVariant(id){this.setVariant('roughness',id);}
    setSpecularVariant(id){this.setVariant('specular',id);}
    schedule(){if(this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=null;if(document.hidden)return;this.render();if(this.auto&&this.ready){this.yaw+=.006;this.schedule();}});}
    render(){
      const gl=this.gl,c=this.canvas,rect=c.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5),width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
      if(c.width!==width||c.height!==height){c.width=width;c.height=height;}
      const hex=getComputedStyle(c).getPropertyValue('--scene').trim()||'#101719',background=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
      gl.viewport(0,0,width,height);gl.clearColor(...background,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!this.ready)return;
      gl.useProgram(this.program);const u=M.uniforms(this.settings),sx=Math.sin(this.pitch),cx=Math.cos(this.pitch),sy=Math.sin(this.yaw),cy=Math.cos(this.yaw);
      gl.uniformMatrix3fv(this.u.uRotation,false,new Float32Array([cy,0,-sy,sy*sx,cx,cy*sx,sy*cx,-sx,cy*cx]));
      const f=1/Math.tan(40*Math.PI/360),near=.1,far=20;gl.uniformMatrix4fv(this.u.uProjection,false,new Float32Array([f/(width/height),0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]));
      gl.uniform1f(this.u.uPlane,this.shape==='plane'?1:0);gl.uniform2f(this.u.uViewport,width,height);gl.uniform3fv(this.u.uBackground,background);gl.uniform3f(this.u.uPlaneEye,5*sy,Math.max(.2,1+this.pitch*1.5),5*cy);
      gl.uniform1f(this.u.uNormalY,this.invertY?1:-1);gl.uniform1f(this.u.uTiling,u.tiling);gl.uniform1f(this.u.uAlbedo,u.albedo);gl.uniform1f(this.u.uNormal,u.normal);gl.uniform1f(this.u.uAO,u.ao);gl.uniform1f(this.u.uHeight,u.height);gl.uniform2fv(this.u.uRoughCurve,u.roughness);gl.uniform2fv(this.u.uSpecCurve,u.specular);
      const slots=['uAlbedoMap','uNormalMap','uRoughMap','uAOMap','uSpecMap','uHeightMap'];this.textures.forEach((texture,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(this.u[slots[i]],i);});gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
    }
    reset(){this.settings=M.defaults();this.pitch=.12;this.yaw=.6;this.auto=false;this.invertY=false;this.setShape('sphere');this.schedule();}
  }
  window.createMaterialTester=()=>{
    const canvas=document.getElementById('material-sphere'),status=document.getElementById('sphere-status'),area=document.getElementById('map-controls');let preview;
    try{preview=new MaterialPreview(canvas,status);}catch(error){status.textContent=error.message;area.hidden=true;return {load:()=>{}};}
    const inputs=[],variantUI=[];
    for(const channel of variantChannels){
      const select=document.getElementById(channel.key+'-variant'),download=document.getElementById('download-'+channel.key),note=document.getElementById(channel.key+'-variant-note');
      if(!select||!download||!note)continue;variantUI.push({channel,select,download,note});
      select.addEventListener('change',()=>preview.setVariant(channel.key,select.value));
      download.addEventListener('click',async()=>{
        const id=select.value,source=preview[channel.key+'Sources']?.[id];if(!source)return;
        download.disabled=true;download.setAttribute('aria-busy','true');
        try{
          // Preserve the embedded original bytes; encode only calculated variants.
          const blob=id==='original'?await fetch(preview[channel.key+'Original']).then(response=>{if(!response.ok)throw Error('No se pudo leer el original.');return response.blob();}):await new Promise((resolve,reject)=>source.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo preparar el PNG.')),'image/png'));
          const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=id==='original'?channel.filename:channel.prefix+'_Contraste_'+id.slice(-1)+'.png';link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
          note.textContent='PNG preparado.';
        }catch(error){note.textContent=error.message||'No se pudo preparar la descarga.';}
        finally{download.disabled=!preview.ready;download.removeAttribute('aria-busy');}
      });
    }
    for(const control of M.controls){
      const wrap=document.createElement('div');wrap.className='map-control'+(control.key==='tiling'?' uv-control':'');const label=document.createElement('label');label.htmlFor='map-'+control.key;label.textContent=control.label;
      const out=document.createElement('output');out.htmlFor=label.htmlFor;const input=document.createElement('input');Object.assign(input,{type:'range',id:label.htmlFor,min:control.min,max:control.max,step:control.step,value:control.value});
      const update=()=>{out.value=control.ratio?Number(input.value).toFixed(2)+'×':Math.round(Number(input.value)*100)+'%';};update();
      input.addEventListener('input',()=>{preview.settings[control.key]=Number(input.value);update();preview.schedule();});label.append(out);wrap.append(label,input);area.append(wrap);inputs.push({input,control,update});
    }
    const shape=document.getElementById('preview-shape'),invert=document.getElementById('invert-normal'),rotate=document.getElementById('rotate-material');
    shape.addEventListener('change',()=>preview.setShape(shape.value));invert.addEventListener('change',()=>{preview.invertY=invert.checked;preview.schedule();});rotate.addEventListener('change',()=>{preview.auto=rotate.checked;preview.schedule();});
    document.getElementById('reset-material').addEventListener('click',()=>{preview.reset();for(const row of variantUI){preview.setVariant(row.channel.key,'original');row.select.value='original';}shape.value='sphere';invert.checked=false;rotate.checked=false;for(const row of inputs){row.input.value=row.control.value;row.update();}});
    let loadEpoch=0;return {load:async item=>{
      const epoch=++loadEpoch;for(const row of variantUI){row.select.disabled=true;row.download.disabled=true;row.select.value='original';}
      await preview.load(item);if(epoch!==loadEpoch)return;
      for(const row of variantUI){const sources=preview[row.channel.key+'Sources'];for(const option of row.select.options)option.disabled=!sources?.[option.value];row.select.disabled=!preview.ready;row.download.disabled=!preview.ready;row.note.textContent=!preview.ready?'Vista no disponible.':sources?.[row.channel.variants[1].id]?'':'Mapa uniforme: solo Original.';}
    }};
  };
})();
