# Delegación y aceptación

## Encargo por mapa

Cada mapa debe generarlo un subagente con el generador integrado. Incluye en su tarea:

```text
Genera únicamente [mapa] para [caso y material].
Lee el prompt [ruta resuelta].
Maestro: [ruta del albedo; no aplica al generar el albedo].
Foto: [ruta de la fotografía o recorte fiel].
Ficha común: [material, acabado y relieve estimado].
Dimensiones maestras reales: [ancho × alto].
Salida exclusiva: [ruta resuelta para este mapa].
Inspecciona y adjunta las referencias al generador integrado:
Image 1 = albedo, Image 2 = foto; para albedo solo se adjunta la foto.
Un mapa PNG a 8 bits, sin texto, marco, render ni collage.
Conserva diseño, encuadre, orientación y escala del maestro.
Copia el archivo real de la herramienta a tu destino exclusivo.
No modifiques otros archivos ni delegues de nuevo.
Devuelve ruta, dimensiones, canales y bits comprobados,
referencias realmente enviadas, revisión hecha y limitaciones.
Si falta el generador o no puedes adjuntar imágenes, informa el bloqueo.
```

Si existe `referenced_image_paths`, usa `[albedo, foto]` para derivados y `[foto]` para albedo; en otros clientes sigue su firma real. Inspecciona referencias locales antes de editar. No inventes argumentos de tamaño, formato o destino ni mezcles mecanismos de referencia incompatibles.

El generador puede guardar primero en su carpeta administrada. Copia después el archivo seleccionado al espacio de trabajo; no asumas que existe un parámetro para elegir destino. Si solo devuelve una imagen en contexto, usa su mecanismo de descarga documentado. Si no puede exportarse, informa el límite antes de afirmar que guardaste un archivo.

Respeta concurrencia de agentes y del servicio. No generes seis mapas en una sola llamada ni un mosaico. Reutiliza agentes inactivos cuando la sesión limite el número total de agentes. La tarea de cada nuevo mapa debe volver a especificar las dos imágenes y su destino.

## Criterios de revisión

- **Integridad:** seis PNG legibles, distintos y correspondientes a sus mapas; nunca placeholders, prompts escritos, duplicados o vistas de material.
- **Referencias:** los derivados recibieron el mismo albedo y foto. Verifica la llamada o evidencia disponible; el resumen de un agente no demuestra por sí solo que adjuntó imágenes.
- **Dimensiones:** cuadradas y comunes. Corrige el mapa divergente. Si solo puedes igualar tamaños por remuestreo, informa resolución nativa y remuestreada sin afirmar detalle nuevo. No cambies el maestro a mitad del trabajo.
- **Registro:** juntas, bordes y vetas coinciden con el maestro. Revisa detalles identificables; misma resolución no implica mismo diseño.
- **Seamless:** continuidad de estructura y valor en ambos ejes y esquinas. Usa diagnósticos cuando sea posible, sin llamarlos mapas finales.
- **Albedo:** conserva identidad y variación del material, sin sombras, reflejos ni AO pintados.
- **Normal:** DirectX / Y−; zona plana cerca de RGB (128, 128, 255), salientes y cavidades coherentes. Si hay análisis numérico, decodifica vectores y revisa longitud y consistencia. Renormalizar no corrige un relieve inventado; color violeta no demuestra un bake válido.
- **Roughness:** negro liso, blanco rugoso; deriva del acabado, no de luminancia o inversión de otro mapa.
- **AO:** blanco abierto y oscuro confinado. Evita sombras direccionales y juntas negras indiscriminadas.
- **Specular:** almacena `S`, con `F0 = 0.08 × S`. Variación sutil según el prompt; no es Metallic ni intensidad universal de reflexión.
- **Height:** negro bajo y blanco alto; geometría relativa coherente, sin convertir pigmentos o sombras en relieve. No impongas amplitud vertical física.
- **Datos:** Albedo se interpreta como sRGB. Normal y escalares son datos sin decodificación sRGB. No apliques gamma o contraste artístico para hacerlos llamativos.

La generación independiente no garantiza coincidencia exacta píxel a píxel. Distingue «verificado», «revisado visualmente» y «no verificado». Si observas una discrepancia sin resolver, no anuncies un conjunto listo para producción.
