# Visor de resultados

Usa los recursos de `assets/review/`; no recrees el probador en cada ejecución. Es una esfera WebGL con iluminación de estudio y mapas del material, sin bibliotecas de red. Interpreta Albedo como sRGB, mapas de datos como lineales, Normal como DirectX Y− y Specular como F0 = 0.08 × S. La altura es relativa al radio, sin escala física recuperada. En equipos sin texturas de vértice se indica que la altura actúa como relieve de superficie.

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

El constructor comprueba presencia, formato PNG y tamaño cuadrado común, incrusta los bytes originales y escapa las etiquetas de usuario. No genera, recorta, convierte ni corrige imágenes. El HTML puede pesar varios MB porque contiene siete imágenes. Se abre en un navegador moderno sin Internet ni servidor; WebGL debe estar habilitado para la esfera.

## Abrir ubicación

El constructor escribe junto al HTML `Iniciar_visor.mjs` y `review-files.json`. El manifiesto contiene rutas de esta computadora y **no se publica en GitHub ni en una galería remota**.

```text
node <resultado>/Iniciar_visor.mjs
```

Inicia el comando en una sesión retenida y abre la URL `http://127.0.0.1:PUERTO` que devuelve. Sirve el HTML en loopback, con una lista cerrada de archivos y comprobación de origen/token. Clic derecho sobre una imagen o botón Archivo → Abrir ubicación del archivo. Windows selecciona el archivo en Explorer; macOS usa Finder; Linux abre su carpeta. Cerrar el proceso detiene el acceso local. No expongas este servicio a Internet.

Al abrir directamente el HTML o una galería web, el navegador no dispone de ese acompañante. La acción aparece deshabilitada y explica cómo abrir el visor local. Desde el celular funciona la revisión y copia de prompts; la carpeta existe en la computadora que generó los archivos.

## Comprobar y entregar

Comprueba carga de los seis mapas, cambio visible de controles, giro, restablecimiento y prompts/copiar. Si hay herramientas de navegador, prueba también pantalla estrecha y menú contextual. Conserva los PNG y separa las limitaciones del material de las del probador. El shader normaliza los vectores para dibujar; eso no repara los datos del Normal original ni certifica el PBR.

Entrega los seis PNG y el HTML, con los dos archivos auxiliares locales. Publicar fotos, prompts o resultados en un sitio requiere que el usuario lo solicite. La skill no necesita el servicio Sites ni una cuenta del autor para funcionar.
