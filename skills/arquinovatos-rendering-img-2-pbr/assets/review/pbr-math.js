(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PBRMath=api;})(typeof window==='object'?window:this,function(){
  'use strict';
  const controls=[
    {key:'albedo',label:'Albedo',min:0,max:2,step:.05,value:1},
    {key:'normal',label:'Normal',min:0,max:3,step:.05,value:1},
    {key:'roughness',label:'Rugosidad',min:0,max:2,step:.05,value:1},
    {key:'roughnessContrast',label:'Contraste de rugosidad',min:0,max:3,step:.05,value:1,ratio:true},
    {key:'specular',label:'Specular',min:0,max:3,step:.05,value:1},
    {key:'specularContrast',label:'Contraste de specular',min:0,max:3,step:.05,value:1,ratio:true},
    {key:'ao',label:'Oclusión ambiental',min:0,max:2,step:.05,value:1},
    {key:'height',label:'Altura',min:0,max:.12,step:.002,value:.02,height:true},
    {key:'tiling',label:'Repetición UV',min:.25,max:12,step:.25,value:1,ratio:true}
  ];
  const defaults=()=>Object.fromEntries(controls.map(c=>[c.key,c.value]));
  // PBR Studio: reflection-contrast-v2-protected, perfil roughness «approved».
  const roughnessVariants=[{id:'original',label:'Original'},{id:'r01',label:'Contraste 1',strength:1.05,target:.80},{id:'r02',label:'Contraste 2',strength:2.2,target:.50},{id:'r03',label:'Contraste 3',strength:12,target:.20}];
  // Specular vigente: perfil separated-v1, independiente del ancla roughness.
  const specularVariants=[{id:'original',label:'Original'},{id:'s01',label:'Contraste 1',strength:1.05,gamma:.60,floor:.03,peak:.10},{id:'s02',label:'Contraste 2',strength:2.2,gamma:.90,floor:.23,peak:.46},{id:'s03',label:'Contraste 3',strength:12,gamma:1.35,floor:.66,peak:.97}];
  const roundEven=x=>{const lo=Math.floor(x),fraction=x-lo;return fraction===.5?(lo%2?lo+1:lo):Math.round(x);};
  function roughnessLUT(hist,id){
    const variant=roughnessVariants.find(v=>v.id===id);if(!variant)throw Error('Contraste roughness desconocido');
    if(id==='original')return Uint8Array.from({length:256},(_,i)=>i);
    if(hist.length!==256||hist.some(n=>!Number.isFinite(n)||n<0))throw Error('Histograma roughness inválido');
    const total=hist.reduce((sum,n)=>sum+n,0),occupied=Array.from(hist.keys()).filter(i=>hist[i]>0);
    if(!total||occupied.at(-1)-occupied[0]<=2)return null;
    const low=occupied[0],high=occupied.at(-1);let count=0,mid=0;
    for(;mid<256;mid++){count+=hist[mid];if(count>=Math.max(1,total*.5))break;}
    const median=(mid-low)/(high-low),{strength,target}=variant;
    return Uint8Array.from({length:256},(_,x)=>{
      const u=Math.max(0,Math.min(1,(x-low)/(high-low)));let curved;
      if(u<=median&&median>0)curved=target*Math.pow(u/median,strength);
      else if(median<1)curved=1-(1-target)*Math.pow((1-u)/(1-median),strength);
      else curved=target*Math.pow(u,strength);
      return roundEven(255*(.03+.94*(.10*u+.90*curved)));
    });
  }
  function specularLUT(hist,id){
    const variant=specularVariants.find(v=>v.id===id);if(!variant)throw Error('Contraste Specular desconocido');
    if(id==='original')return Uint8Array.from({length:256},(_,i)=>i);
    if(hist.length!==256||hist.some(n=>!Number.isFinite(n)||n<0))throw Error('Histograma Specular inválido');
    const occupied=Array.from(hist.keys()).filter(i=>hist[i]>0);if(!occupied.length||occupied.at(-1)-occupied[0]<=2)return null;
    const low=occupied[0],high=occupied.at(-1),{strength,gamma,floor,peak}=variant;
    return Uint8Array.from({length:256},(_,x)=>{
      const u=Math.pow(Math.max(0,Math.min(1,(x-low)/(high-low))),gamma);
      const curved=u<=.5?.5*Math.pow(2*u,strength):1-.5*Math.pow(2*(1-u),strength);
      const protectedValue=roundEven(255*(.03+.94*(.10*u+.90*curved)));
      return roundEven(255*(floor+(protectedValue/255-.03)*(peak-floor)/.94));
    });
  }
  function uniforms(input={}){
    const p={};for(const c of controls){const v=Number(input[c.key]??c.value);p[c.key]=Number.isFinite(v)?Math.max(c.min,Math.min(c.max,v)):c.value;}
    const curve=(gain,contrast,scale=1)=>[gain*contrast*scale,(gain*.5*(1-contrast)*scale)||0];
    return {albedo:p.albedo,normal:p.normal,roughness:curve(p.roughness,p.roughnessContrast),specular:curve(p.specular,p.specularContrast,.08),ao:p.ao,height:p.height,tiling:p.tiling};
  }
  function sphereGeometry(columns=128,rows=64){
    if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<3||rows<2||(columns+1)*(rows+1)>65535)throw Error('Resolución de esfera no compatible');
    const vertices=new Float32Array((columns+1)*(rows+1)*5),indices=[];
    for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
      const theta=y/rows*Math.PI,phi=x/columns*Math.PI*2,i=(y*(columns+1)+x)*5;
      vertices.set([Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi),x/columns,1-y/rows],i);
      if(x<columns&&y<rows){const a=y*(columns+1)+x,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
    return {vertices,indices:new Uint16Array(indices)};
  }
  function previewGeometry(shape){
    if(shape==='sphere'){
      const mesh=sphereGeometry(),vertices=new Float32Array(mesh.vertices.length/5*11);
      for(let i=0,j=0;i<mesh.vertices.length;i+=5,j+=11){const p=mesh.vertices.slice(i,i+3),u=mesh.vertices[i+3],v=mesh.vertices[i+4],phi=u*Math.PI*2;vertices.set([...p,...p,-Math.sin(phi),0,Math.cos(phi),u,v],j);}
      return {vertices,indices:mesh.indices};
    }
    if(shape==='plane')return {vertices:new Float32Array([-1,-1,0,0,1,0,1,0,0,0,0, 1,-1,0,0,1,0,1,0,0,1,0, -1,1,0,0,1,0,1,0,0,0,1, 1,1,0,0,1,0,1,0,0,1,1]),indices:new Uint16Array([0,1,2,1,3,2])};
    if(shape!=='rounded-cube')throw Error('Forma no compatible');
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=v=>{const d=Math.hypot(...v);return v.map(x=>x/d);};
    const faces=[[[1,0,0],[0,0,-1]],[[-1,0,0],[0,0,1]],[[0,1,0],[1,0,0]],[[0,-1,0],[1,0,0]],[[0,0,1],[1,0,0]],[[0,0,-1],[-1,0,0]]];
    const vertices=[],indices=[],steps=48,half=.85,radius=.18,core=half-radius;
    for(const [n,u] of faces){const v=cross(u,n),base=vertices.length/11;
      for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++){
        const a=(x/steps*2-1)*half,b=(y/steps*2-1)*half,p=n.map((q,i)=>q*half+u[i]*a+v[i]*b),c=p.map(q=>Math.max(-core,Math.min(core,q))),normal=unit(p.map((q,i)=>q-c[i])),point=c.map((q,i)=>q+normal[i]*radius),dot=u.reduce((s,q,i)=>s+q*normal[i],0),t=unit(u.map((q,i)=>q-dot*normal[i]));
        vertices.push(...point,...normal,...t,x/steps,y/steps);
        if(x<steps&&y<steps){const at=base+y*(steps+1)+x,next=at+steps+1;indices.push(at,next,at+1,at+1,next,next+1);}
      }
    }
    return {vertices:new Float32Array(vertices),indices:new Uint16Array(indices)};
  }
  return {controls,defaults,uniforms,sphereGeometry,previewGeometry,roughnessVariants,roughnessLUT,specularVariants,specularLUT};
});
