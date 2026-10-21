# Visor de resultados

Usa los recursos de `assets/review/`; no recrees ni rediseñes el probador en cada ejecución. Incluye esfera y cubo redondeado con malla, plano infinito por intersección analítica, tiling UV y temas claro/oscuro con los logos incluidos. No requiere bibliotecas de red. Interpreta Albedo como sRGB, datos como lineales, Normal como DirectX Y− y Specular como F0 = 0.08 × S. La inversión Y es una prueba del relieve en la vista previa. La altura es relativa, sin escala física recuperada; en equipos sin texturas de vértice se representa como relieve de superficie.

## Construir

Resuelve `<skill>` y las rutas de esta ejecución. Usa el ejecutable Node.js disponible, sin instalar paquetes:

```text
node <skill>/scripts/build-review.mjs --maps <resultado>/maps --photo <foto-original> --prompts <resultado>/work/prompts.json --name "Nombre del material" --zone "Zona seleccionada" --output <resultado>/Material_PBR.html
```

Opcional: `--note "Limitaciones observadas en esta revisión"`. Si la foto usada por los agentes fue un recorte, pasa esa misma referencia y conserva el original fuera del paquete público.

Formato de `prompts.json`, una entrada por cada uno de los seis nombres finales:

```json
{
  "Material_BaseColor.png": {"text": "Prompt efectivo enviado", "exact": true, "reference_roles": ["Fotografía original del material."]},
  "Material_Normal_DX.png": {"text": "Prompt efectivo enviado", "exact": true, "reference_roles": ["Albedo maestro inmutable.", "Fotografía original del material."]}
}
```

El ejemplo abrevia los otros cuatro. Nunca marques como exacta una plantilla o reconstrucción. El texto del prompt no incluye automáticamente las imágenes: registra sus roles reales en orden. Una corrección de Albedo puede necesitar el intento anterior además de la foto; el diálogo debe mostrarlo. Los derivados usan albedo maestro + foto.

Antes de construir, crea `Material_Normal_GL.png` desde DX con `scripts/normal-opengl.mjs`. Este único procesamiento invierte G y conserva R/B; no altera el DX. El constructor exige los siete PNG, comprueba tamaño cuadrado común, incrusta sus bytes y escapa etiquetas y prompts. No modifica píxeles. El HTML contiene la foto, siete mapas y dos logos; puede pesar varios MB. Se abre en un navegador moderno sin Internet ni servidor; WebGL habilita el probador.

## Abrir ubicación

El constructor escribe junto al HTML `Iniciar_visor.mjs`, `review-files.json` y una copia exacta `Foto_referencia.ext`. El manifiesto usa rutas relativas a esa carpeta. Mantén `maps/` dentro del resultado y mueve la carpeta completa para conservar el acceso local. Los resultados y el manifiesto **no se publican en GitHub ni en una galería remota** sin solicitud del usuario.

```text
node <resultado>/Iniciar_visor.mjs
```

Inicia el comando en una sesión retenida y abre la URL `http://127.0.0.1:PUERTO` que devuelve. Sirve el HTML en loopback, con una lista cerrada de archivos y comprobación de origen/token. Clic derecho sobre una imagen o botón Archivo → Abrir ubicación del archivo. Windows selecciona el archivo en Explorer; macOS usa Finder; Linux abre su carpeta. Cerrar el proceso detiene el acceso local. No expongas este servicio a Internet.

Al abrir directamente el HTML o una galería web, el navegador no dispone de ese acompañante. La acción aparece deshabilitada y explica cómo abrir el visor local. Desde el celular funciona la revisión y copia de prompts; la carpeta existe en la computadora que generó los archivos.

## Comprobar y entregar

Comprueba las tres formas, nueve sliders, inversión Y, temas, giro, restablecimiento, siete archivos y prompts/copiar. Si hay herramientas de navegador, prueba también pantalla estrecha y menú contextual. El GL muestra su operación y el prompt del DX: no se atribuye a una segunda llamada de IA. Conserva los PNG y separa límites del material y del probador. El shader normaliza los vectores para dibujar; eso no repara el Normal original ni certifica el PBR.

Entrega los siete PNG y el HTML con su acompañante, manifiesto y copia de referencia. Construye y abre el visor como parte de cada material. Publicar fotos, prompts o resultados en un sitio requiere que el usuario lo solicite. La skill no necesita Sites, PBR Studio ni una cuenta del autor.
