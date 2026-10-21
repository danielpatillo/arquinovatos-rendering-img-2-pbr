(() => {
  'use strict';
  const cases=window.PBR_CASES,$=id=>document.getElementById(id),picker=$('material'),viewer=$('viewer'),promptViewer=$('prompt-viewer'),menu=$('file-menu');
  let current=0,imageIndex=0,imageList=[],menuIndex=0,promptText='';
  if(!Array.isArray(cases)||!cases.length){$('case-name').textContent='No se pudo cargar la galería. Recarga esta página.';return;}
  const tester=window.createMaterialTester();
  const themeButton=$('theme-toggle');
  function reflectTheme(){const dark=document.documentElement.dataset.theme==='dark';themeButton.textContent=dark?'Tema claro':'Tema oscuro';themeButton.setAttribute('aria-label',dark?'Cambiar a tema claro':'Cambiar a tema oscuro');}
  reflectTheme();themeButton.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('arquinovatos-pbr-theme',next);}catch{}reflectTheme();document.dispatchEvent(new Event('pbr-theme'));});
  for(const item of cases){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;picker.append(option);}
  if(cases.length===1){picker.closest('nav').hidden=true;$('counter').hidden=true;}
  function watchError(img){img.addEventListener('error',()=>{img.alt='No se pudo cargar esta imagen. Abre el archivo o recarga la página.';img.classList.add('load-error');},{once:true});}
  function render(index){
    current=Math.max(0,Math.min(cases.length-1,index));const item=cases[current];menu.hidden=true;
    picker.value=item.id;$('case-name').textContent=item.name;$('counter').textContent=`${current+1} de ${cases.length}`;
    $('previous').disabled=current===0;$('next').disabled=current===cases.length-1;
    $('original').src=item.photo;$('original').alt=`Foto original: ${item.name}`;$('zone').textContent=item.zone||'';
    $('pin').hidden=!item.pin;if(item.pin)$('pin').href=item.pin;
    $('case-note').textContent=item.note||'Estimación artística; revisa continuidad, alineación y respuesta física antes de usarla en producción.';
    $('map-dimensions').textContent=item.width?`${item.width} × ${item.height} px`:'PNG de 8 bits';
    imageList=[{label:'Foto original',filename:'Foto original',key:'__source',src:item.photo},...item.maps];$('maps').replaceChildren();
    item.maps.forEach((map,index)=>{
      const article=document.createElement('article');article.className='map';
      const button=document.createElement('button');button.type='button';button.className='image-button';button.setAttribute('aria-label',`Ampliar ${map.label} de ${item.name}`);
      const img=document.createElement('img');img.src=map.src;img.alt=`${map.label}: ${item.name}`;img.loading='lazy';img.decoding='async';img.width=item.width||1254;img.height=item.height||1254;watchError(img);button.append(img);
      button.addEventListener('click',()=>openImage(index+1));button.addEventListener('contextmenu',event=>openMenu(event,index+1));
      const title=document.createElement('h4');title.textContent=map.label;const description=document.createElement('p');description.textContent=(map.description||'')+(map.format?' '+map.format:'');
      const actions=document.createElement('div');actions.className='map-actions';
      const prompt=document.createElement('button');prompt.type='button';prompt.textContent='Ver prompt';prompt.setAttribute('aria-label',`Ver prompt de ${map.label}`);prompt.addEventListener('click',()=>showPrompt(index+1));
      const more=document.createElement('button');more.type='button';more.textContent='Archivo';more.setAttribute('aria-label',`Acciones del archivo ${map.label}`);more.addEventListener('click',event=>openMenu(event,index+1));actions.append(prompt,more);
      article.append(button,title,description,actions);$('maps').append(article);
    });
    try{history.replaceState(null,'',`#material-${item.id}`);}catch{}tester.load(item);
  }
  function showImage(index){imageIndex=Math.max(0,Math.min(imageList.length-1,index));const image=imageList[imageIndex];$('viewer-title').textContent=image.label;$('large-image').src=image.src;$('large-image').alt=`${image.label}: ${cases[current].name}`;$('full-file').href=image.src;$('image-counter').textContent=`${imageIndex+1} de ${imageList.length}`;$('previous-image').disabled=imageIndex===0;$('next-image').disabled=imageIndex===imageList.length-1;}
  function openImage(index){menu.hidden=true;showImage(index);viewer.showModal();}
  function showPrompt(index){
    menu.hidden=true;const map=imageList[index],info=typeof map.prompt==='string'?{text:map.prompt,exact:false}:map.prompt||{};promptText=info.text||'';
    $('prompt-title').textContent=`Prompt: ${map.label}`;$('prompt-text').value=promptText||'No se registró el texto efectivo de esta llamada. No se ha sustituido por una plantilla.';
    $('prompt-provenance').textContent=info.derived_from?'OpenGL se obtiene del Normal DX invirtiendo solo G (255 − G). El siguiente prompt generó el DX; no hubo otra llamada de IA.':promptText?(info.exact?'Texto efectivo registrado para este mapa.':'Texto recuperado; el literal exacto no está confirmado.'):'Prompt no disponible en el registro de esta ejecución.';
    $('prompt-references').textContent=info.reference_roles?.length?'Imágenes a adjuntar, en orden: '+info.reference_roles.join(' | '):map.filename==='Material_BaseColor.png'?'Para reutilizarlo, adjunta la foto o el recorte del material.':'Para reutilizarlo, adjunta primero el albedo maestro y después la foto o el recorte del material.';
    $('copy-prompt').disabled=!promptText;$('copy-status').textContent='';promptViewer.showModal();
  }
  async function copyPrompt(){
    try{if(!navigator.clipboard)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(promptText);$('copy-status').textContent='Prompt copiado.';}
    catch{$('prompt-text').focus();$('prompt-text').select();let copied=false;try{copied=document.execCommand('copy');}catch{}$('copy-status').textContent=copied?'Prompt copiado.':'Texto seleccionado. Usa Copiar en el menú de tu dispositivo.';}
  }
  function openMenu(event,index){
    event.preventDefault();event.stopPropagation();menuIndex=index;const image=imageList[index],bridge=window.PBR_LOCAL_BRIDGE;
    $('file-menu-name').textContent=image.filename;$('menu-prompt').hidden=index===0;$('menu-reveal').disabled=!bridge;
    $('file-menu-note').textContent=bridge?'La carpeta se abrirá en esta computadora.':'Abrir ubicación está disponible en el visor local iniciado con Iniciar_visor.mjs. Desde el celular puedes ver las imágenes y los prompts.';
    menu.hidden=false;const rect=event.currentTarget.getBoundingClientRect(),x=event.clientX||rect.left,y=event.clientY||rect.bottom;
    menu.style.left=Math.max(12,Math.min(x,innerWidth-menu.offsetWidth-12))+'px';menu.style.top=Math.max(12,Math.min(y,innerHeight-menu.offsetHeight-12))+'px';$('menu-open').focus();
  }
  async function reveal(){
    const bridge=window.PBR_LOCAL_BRIDGE;if(!bridge)return;
    try{const response=await fetch(bridge.origin+'/api/reveal',{method:'POST',headers:{'Content-Type':'application/json','X-PBR-Token':bridge.token},body:JSON.stringify({key:imageList[menuIndex].key||imageList[menuIndex].filename})});if(!response.ok)throw Error('No se pudo abrir la carpeta.');$('file-menu-note').textContent='Ubicación abierta en la computadora.';}
    catch(error){$('file-menu-note').textContent=error.message;}
  }
  picker.addEventListener('change',()=>render(cases.findIndex(item=>item.id===picker.value)));$('previous').addEventListener('click',()=>render(current-1));$('next').addEventListener('click',()=>render(current+1));
  $('original-button').addEventListener('click',()=>openImage(0));$('original-button').addEventListener('contextmenu',event=>openMenu(event,0));$('original-actions').addEventListener('click',event=>openMenu(event,0));
  $('close-viewer').addEventListener('click',()=>viewer.close());$('previous-image').addEventListener('click',()=>showImage(imageIndex-1));$('next-image').addEventListener('click',()=>showImage(imageIndex+1));
  $('close-prompt').addEventListener('click',()=>promptViewer.close());$('copy-prompt').addEventListener('click',copyPrompt);
  $('menu-open').addEventListener('click',()=>openImage(menuIndex));$('menu-prompt').addEventListener('click',()=>showPrompt(menuIndex));$('menu-reveal').addEventListener('click',reveal);
  document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.hidden=true;});document.addEventListener('keydown',event=>{if(event.key==='Escape')menu.hidden=true;});
  for(const dialog of [viewer,promptViewer])dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  viewer.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')showImage(imageIndex-1);if(event.key==='ArrowRight')showImage(imageIndex+1);});
  watchError($('original'));watchError($('large-image'));const match=location.hash.match(/^#material-(\d{2})$/),initial=match?cases.findIndex(item=>item.id===match[1]):0;render(Math.max(0,initial));
})();
