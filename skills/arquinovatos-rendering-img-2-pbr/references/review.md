# Construir el visor y entregar la carpeta

Usa esta guía cuando los siete mapas base estén aprobados y el usuario haya elegido el HTML. No regeneres imágenes ni escribas otra interfaz. La plantilla conserva el probador, las tres formas, controles, temas y prompts.

## Construcción

```text
node <skill>/scripts/build-review.mjs --maps <caso>/maps --photo <referencia-usada> --prompts <caso>/work/prompts.json --name "Nombre del material" --output <caso>/Material_PBR.html
```

Usa la misma referencia fotográfica que recibieron los agentes, aunque sea un recorte fiel. Conserva el original en el caso. El constructor incrusta los bytes de los siete mapas base y exporta automáticamente tres variantes de Roughness y tres de Specular en maps/. Si ya fueron exportadas, las comprueba sin alterar los originales. No hacen falta PBR Studio ni paquetes npm.

Para entregar solo PNG, ejecuta `node <skill>/scripts/export-variants.mjs --maps <caso>/maps` después de aprobar las bases. Si un mapa tiene dos niveles de gris o menos y no admite una curva útil, conserva el original y comunica la excepción en el informe; no inventes detalle para completar nombres.

La entrega principal es la **carpeta real maps/** con originales y variantes, no un ZIP. El HTML muestra los trece mapas en condiciones normales. El constructor también escribe Iniciar_visor.mjs, review-files.json y Foto_referencia.ext; conserva juntos esos archivos al mover el resultado.

## Variantes de PBR Studio

Roughness: Original y Contraste 1/2/3 usan reflection-contrast-v2-protected, perfil approved. El histograma completo define extremos y mediana; potencias 1.05/2.2/12, anclas .80/.50/.20, mezcla 10% lineal y 90% curva, rango protegido 8–247.

Specular: Original y Contraste 1/2/3 usan el perfil vigente separado de Specular, separated-v1. Las curvas y remapeos correspondientes están en PBRMath.specularLUT. No son la inversión de Roughness ni sus mismas curvas. Preservan datos escalares y no necesitan IA adicional.

Los selectores cambian la textura antes de los controles de intensidad y F0; Descargar guarda la variante completa como PNG. Los deslizadores ajustan la vista previa. Restablecer vuelve a Original. Los archivos derivados conservan source, recipe, profile y hashes; su prompt es el literal que generó el mapa origen, sin atribuir otra llamada.

## Carpeta local

```text
node <caso>/Iniciar_visor.mjs
```

Abre la URL loopback que devuelve en la misma computadora. **Abrir carpeta de mapas** abre directamente el directorio maps/ ya manifestado. Los menús Archivo siguen permitiendo seleccionar cada PNG en su carpeta. El acompañante solo acepta el origen y token de esta vista, y abre archivos o el único directorio incluidos en el manifiesto. No acepta rutas arbitrarias del navegador.

Un HTML abierto directamente conserva material, galería y prompts; la acción de abrir carpeta necesita el acompañante. El usuario no debe instalar otro programa ni pedir un ZIP para acceder a los mapas.

## Marca y landing en vivo

El encabezado dice «Los mejores recursos para render en arquinovatos.com», con enlaces oficiales de redes, Más información y un globo de WhatsApp Business. Usa únicamente la configuración pública confirmada por MKT ARQUINOVATOS, en assets/review/brand.json; --brand permite elegir un archivo del mismo schema.

Schema público: informationUrl, socialLinks [{label,url}], whatsappUrl, landingUrl, configUrl y revision. Las URLs son HTTPS. La configuración remota se consulta sin credenciales ni referrer al abrir, volver a la vista y cada 30 segundos mientras está visible; una nueva revisión recarga la landing vigente.

Después de todos los mapas aparece un iframe con la landing remota vigente. Distribuye solo su URL y el código de integración; no guardes una copia del HTML remoto en el repositorio, la skill o el material. No envíes fotos, mapas, prompts, rutas ni el token local a la web. La altura se recibe por postMessage desde el origen y ventana exactos del iframe; el tipo acordado es arquinovatos:landing:resize. Una caída de la web no bloquea el material local.

## Texto y revisión

Muestra solo nombres, etiquetas, acciones y mensajes operativos necesarios. Las observaciones de QA, calibración y limitaciones se guardan en work/ y en el informe de entrega; no añadas revisión visible, avisos experimentales ni párrafos sobre cómo se incrustan los archivos.

En cada material comprueba la construcción, carpeta y apertura con WebGL. No repitas una batería de todos los controles si la plantilla no cambió. Al cambiar la plantilla, comprueba las funciones afectadas y una vista de escritorio/móvil en una pasada acotada. Preserva prompts literales, hashes y registros de imágenes originales. Publicar fotos o resultados sigue requiriendo solicitud expresa; el repositorio público contiene la skill, no los materiales privados.
