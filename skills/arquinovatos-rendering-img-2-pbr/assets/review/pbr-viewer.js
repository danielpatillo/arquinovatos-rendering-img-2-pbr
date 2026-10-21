/* Standalone material preview. Six original maps remain untouched. MIT. */
(() => {
  'use strict';
  const M=window.PBRMath;
  class MaterialSphere {
    constructor(canvas,status){
      this.canvas=canvas;this.status=status;this.settings=M.defaults();this.pitch=.12;this.yaw=.6;this.epoch=0;this.ready=false;this.auto=false;this.textures=[];
      const gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true});
      if(!gl)throw Error('Este navegador no permite WebGL. La galería y los prompts siguen disponibles.');
      this.gl=gl;this.vertexHeight=gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)>0;
      const vertex=`precision highp float;
        attribute vec3 aPosition;attribute vec2 aUV;
        uniform mat4 uProjection;uniform mat3 uRotation;
        uniform float uHeight;uniform sampler2D uHeightMap;
        varying vec2 vUV;varying vec3 vPosition,vNormal,vTangent;
        void main(){
          float h=0.0;
          ${this.vertexHeight?'h=(texture2D(uHeightMap,aUV).r-0.5)*uHeight;':''}
          vPosition=uRotation*(aPosition*(1.0+h));vNormal=uRotation*aPosition;
          float phi=aUV.x*6.28318530718;
          vTangent=uRotation*vec3(-sin(phi),0.0,cos(phi));vUV=aUV;
          gl_Position=uProjection*vec4(vPosition-vec3(0.0,0.0,3.6),1.0);
        }`;
      const fragment=`precision highp float;
        varying vec2 vUV;varying vec3 vPosition,vNormal,vTangent;
        uniform sampler2D uAlbedoMap,uNormalMap,uRoughMap,uAOMap,uSpecMap,uHeightMap;
        uniform vec2 uRoughCurve,uSpecCurve;uniform float uAlbedo,uNormal,uAO,uHeight;
        const float PI=3.14159265359;
        vec3 toLinear(vec3 c){return mix(c/12.92,pow((c+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),c));}
        vec3 toDisplay(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),c));}
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
          vec3 geometric=normalize(vNormal),t=normalize(vTangent-geometric*dot(vTangent,geometric));
          vec3 b=normalize(cross(t,geometric));
          vec3 local=texture2D(uNormalMap,vUV).xyz*2.0-1.0;
          local=normalize(vec3(local.x*uNormal,-local.y*uNormal,max(local.z,0.001)));
          ${this.vertexHeight?'':`float e=0.001;float dx=texture2D(uHeightMap,vUV+vec2(e,0.0)).r-texture2D(uHeightMap,vUV-vec2(e,0.0)).r;float dy=texture2D(uHeightMap,vUV+vec2(0.0,e)).r-texture2D(uHeightMap,vUV-vec2(0.0,e)).r;local=normalize(local+vec3(-dx,-dy,0.0)*uHeight*80.0);`}
          vec3 n=normalize(t*local.x+b*local.y+geometric*local.z),v=normalize(vec3(0.0,0.0,3.6)-vPosition);
          vec3 color=toLinear(texture2D(uAlbedoMap,vUV).rgb)*uAlbedo;
          float rough=clamp(texture2D(uRoughMap,vUV).r*uRoughCurve.x+uRoughCurve.y,0.035,1.0);
          float f0=clamp(texture2D(uSpecMap,vUV).r*uSpecCurve.x+uSpecCurve.y,0.0,0.08);
          float ao=pow(max(texture2D(uAOMap,vUV).r,0.0001),uAO);
          vec3 radiance=lamp(n,v,vec3(-.7,1.1,1.3),vec3(4.7,4.5,4.2),color,rough,f0);
          radiance+=lamp(n,v,vec3(1.0,.2,.7),vec3(.65,.82,1.0),color,rough,f0);
          radiance+=lamp(n,v,vec3(.8,.9,-.6),vec3(1.5,1.7,2.0),color,rough,f0);
          radiance+=color*(.08+.16*max(n.y,0.0))*ao;
          vec3 mapped=clamp((radiance*(2.51*radiance+.03))/(radiance*(2.43*radiance+.59)+.14),0.0,1.0);
          gl_FragColor=vec4(toDisplay(mapped),1.0);
        }`;
      const compile=(kind,source)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const reason=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error('No se pudo compilar el probador: '+reason);}return shader;};
      this.program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('No se pudo iniciar el probador.');
      gl.useProgram(this.program);
      const mesh=M.sphereGeometry();this.count=mesh.indices.length;
      this.vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
      const p=gl.getAttribLocation(this.program,'aPosition'),uv=gl.getAttribLocation(this.program,'aUV');
      gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
      this.indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
      this.u={};for(const name of ['uProjection','uRotation','uHeight','uAlbedo','uNormal','uAO','uRoughCurve','uSpecCurve','uAlbedoMap','uNormalMap','uRoughMap','uAOMap','uSpecMap','uHeightMap'])this.u[name]=gl.getUniformLocation(this.program,name);
      gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);
      let drag=null;
      canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
      canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;this.yaw+=(e.clientX-drag.x)*.012;this.pitch=Math.max(-1.4,Math.min(1.4,this.pitch+(e.clientY-drag.y)*.012));drag.x=e.clientX;drag.y=e.clientY;this.schedule();});
      const release=()=>{drag=null;canvas.classList.remove('dragging');};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
      canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();this.yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;this.pitch+=e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0;this.schedule();});
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;this.status.textContent='La vista 3D se interrumpió. Recarga la página; los mapas y prompts siguen disponibles.';});
      new ResizeObserver(()=>this.schedule()).observe(canvas);
      document.addEventListener('visibilitychange',()=>this.schedule());
    }
    async load(item){
      const epoch=++this.epoch;this.ready=false;this.status.textContent='Cargando los seis mapas…';
      const names=['Material_BaseColor.png','Material_Normal_DX.png','Material_Roughness.png','Material_AO.png','Material_Specular_UE.png','Material_Height.png'];
      try{
        const images=await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const entry=item.maps.find(m=>m.filename===name);if(!entry){reject(Error('Falta '+name));return;}const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('No se pudo cargar '+name));image.src=entry.src;})));
        if(epoch!==this.epoch)return;
        const gl=this.gl;for(const texture of this.textures)gl.deleteTexture(texture);this.textures=[];
        for(const image of images){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);this.textures.push(texture);}
        this.ready=true;this.status.textContent=this.vertexHeight?'Arrastra la esfera para girarla.':'Arrastra para girar. Este equipo muestra la altura como relieve de superficie.';this.schedule();
      }catch(error){if(epoch===this.epoch)this.status.textContent=error.message;}
    }
    schedule(){if(this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=null;if(document.hidden)return;this.render();if(this.auto&&this.ready){this.yaw+=.006;this.schedule();}});}
    render(){
      const gl=this.gl,c=this.canvas,rect=c.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5);
      const width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));if(c.width!==width||c.height!==height){c.width=width;c.height=height;}
      gl.viewport(0,0,width,height);gl.clearColor(.035,.05,.065,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!this.ready)return;
      gl.useProgram(this.program);const u=M.uniforms(this.settings),sx=Math.sin(this.pitch),cx=Math.cos(this.pitch),sy=Math.sin(this.yaw),cy=Math.cos(this.yaw);
      gl.uniformMatrix3fv(this.u.uRotation,false,new Float32Array([cy,0,-sy,sy*sx,cx,cy*sx,sy*cx,-sx,cy*cx]));
      const f=1/Math.tan(40*Math.PI/360),aspect=width/height,near=.1,far=20;
      gl.uniformMatrix4fv(this.u.uProjection,false,new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]));
      gl.uniform1f(this.u.uAlbedo,u.albedo);gl.uniform1f(this.u.uNormal,u.normal);gl.uniform1f(this.u.uAO,u.ao);gl.uniform1f(this.u.uHeight,u.height);gl.uniform2fv(this.u.uRoughCurve,u.roughness);gl.uniform2fv(this.u.uSpecCurve,u.specular);
      const slots=['uAlbedoMap','uNormalMap','uRoughMap','uAOMap','uSpecMap','uHeightMap'];this.textures.forEach((texture,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(this.u[slots[i]],i);});
      gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
    }
    reset(){this.settings=M.defaults();this.pitch=.12;this.yaw=.6;this.schedule();}
  }
  window.createMaterialTester=()=>{
    const canvas=document.getElementById('material-sphere'),status=document.getElementById('sphere-status'),area=document.getElementById('map-controls');
    let sphere;
    try{sphere=new MaterialSphere(canvas,status);}catch(error){status.textContent=error.message;area.hidden=true;return {load:()=>{}};}
    const inputs=[];
    for(const c of M.controls){
      const wrap=document.createElement('div');wrap.className='map-control';
      const label=document.createElement('label');label.htmlFor='map-'+c.key;label.textContent=c.label;
      const out=document.createElement('output');out.htmlFor=label.htmlFor;
      const input=document.createElement('input');input.type='range';input.id=label.htmlFor;input.min=c.min;input.max=c.max;input.step=c.step;input.value=c.value;
      const update=()=>{out.value=c.ratio?Number(input.value).toFixed(2)+'×':Math.round(Number(input.value)*100)+'%';};update();
      input.addEventListener('input',()=>{sphere.settings[c.key]=Number(input.value);update();sphere.schedule();});label.append(out);wrap.append(label,input);area.append(wrap);inputs.push({input,c,update});
    }
    document.getElementById('reset-material').addEventListener('click',()=>{sphere.reset();for(const row of inputs){row.input.value=row.c.value;row.update();}});
    document.getElementById('rotate-material').addEventListener('change',event=>{sphere.auto=event.target.checked;sphere.schedule();});
    return {load:item=>sphere.load(item)};
  };
})();
