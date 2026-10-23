(() => {
  'use strict';
  const $=id=>document.getElementById(id),bridge=window.PBR_LOCAL_BRIDGE;
  let materials=Array.isArray(window.PBR_LIBRARY)?window.PBR_LIBRARY:[];
  function reflectTheme(){const dark=document.documentElement.dataset.theme==='dark';$('theme-toggle').textContent=dark?'Tema claro':'Tema oscuro';}
  reflectTheme();$('theme-toggle').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('arquinovatos-pbr-theme',document.documentElement.dataset.theme);}catch{}reflectTheme();});
  const statusLabels={'ready':'Visor listo','png-only':'Solo PNG','viewer-pending':'Visor pendiente','viewer-error':'Visor pendiente'};
  async function folder(route,body,button){
    if(!bridge)return;button.disabled=true;$('library-status').textContent='Abriendo carpeta…';
    try{const response=await fetch(bridge.origin+route,{method:'POST',headers:{'Content-Type':'application/json','X-PBR-Token':bridge.token},body:JSON.stringify(body)});if(!response.ok)throw Error('No se pudo abrir. Comprueba que la carpeta siga en su ubicación.');$('library-status').textContent='Carpeta abierta en esta computadora.';}
    catch(error){$('library-status').textContent=error.message;}finally{button.disabled=false;}
  }
  function render(){
    const query=$('library-search').value.trim().toLocaleLowerCase(),shown=materials.filter(item=>item.name.toLocaleLowerCase().includes(query));
    $('library-count').textContent=materials.length===1?'1 material guardado':materials.length+' materiales guardados';$('library-grid').replaceChildren();
    $('library-empty').hidden=shown.length>0;$('library-empty').textContent=materials.length?'No hay materiales que coincidan. Prueba otro nombre.':'Tu próximo material aparecerá aquí cuando sus PNG finales estén listos.';
    for(const item of shown){
      const article=document.createElement('article');article.className='library-material';
      const preview=document.createElement(item.hasViewer?'a':'div');preview.className='library-preview';if(item.hasViewer){preview.href=item.href;preview.setAttribute('aria-label','Ver material: '+item.name);}
      if(item.thumbnail){const image=document.createElement('img');image.src=item.thumbnail;image.alt=item.name;image.loading='lazy';image.decoding='async';image.width=400;image.height=300;image.addEventListener('error',()=>{image.hidden=true;});preview.append(image);}
      const title=document.createElement('h2');title.textContent=item.name;
      const detail=document.createElement('p');detail.className='library-detail';const date=new Date(item.createdAt);detail.textContent=(Number.isNaN(date.valueOf())?'':date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})+' · ')+(item.available?item.mapCount+' PNG':'Carpeta no disponible');
      const state=document.createElement('p');state.className='library-state';state.textContent=item.available?(statusLabels[item.status]||'Visor pendiente'):'Reubica o vuelve a importar este material';
      const actions=document.createElement('div');actions.className='library-material-actions';
      if(item.hasViewer){const link=document.createElement('a');link.href=item.href;link.className='library-view';link.textContent='Ver material';actions.append(link);}
      const open=document.createElement('button');open.type='button';open.textContent='Abrir carpeta de este material';open.disabled=!bridge||!item.available;if(!bridge)open.title='Inicia Iniciar_biblioteca.mjs para abrir carpetas.';open.addEventListener('click',()=>folder('/api/open-material',{id:item.id},open));actions.append(open);
      article.append(preview,title,detail,state,actions);$('library-grid').append(article);
    }
  }
  async function refresh(){
    if(!bridge){location.reload();return;}
    const button=$('refresh-library');button.disabled=true;
    try{const response=await fetch(bridge.origin+'/api/library',{cache:'no-store'});if(!response.ok)throw Error('No se pudo actualizar el historial. Vuelve a iniciar la biblioteca.');const data=await response.json();materials=data.materials;showWarnings(data.warnings);render();$('library-status').textContent='Historial actualizado.';}
    catch(error){$('library-status').textContent=error.message;}finally{button.disabled=false;}
  }
  function showWarnings(count){$('library-warning').hidden=!count;$('library-warning').textContent=count?'Hay registros que no se pudieron leer. Sus archivos se conservan; pide a Codex recuperar el historial.':'';}
  $('open-library').disabled=!bridge;$('open-library').addEventListener('click',()=>folder('/api/open-library',{},$('open-library')));
  if(!bridge)$('library-status').textContent='Para abrir carpetas, pide a Codex abrir tu biblioteca o ejecuta node Iniciar_biblioteca.mjs en esta carpeta.';
  $('library-search').addEventListener('input',render);$('refresh-library').addEventListener('click',refresh);showWarnings(window.PBR_LIBRARY_WARNINGS);render();
  window.addEventListener('focus',()=>{if(bridge)refresh();});
})();
