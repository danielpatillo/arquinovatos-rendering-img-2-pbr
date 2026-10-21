# Arquinovatos - Rendering IMG 2 PBR

Una fotografía → seis tipos de mapas PBR revisados, Normal DX/OpenGL y prompts. Primero se entregan los siete PNG; después eliges si quieres añadir el visor 3D Arquinovatos.

Estado experimental: el generador puede introducir costuras o datos incorrectos.
La skill revisa las imágenes y detiene la aprobación si persiste un defecto crítico.
No presenta una textura con costuras conocidas como material terminado.

## Necesitas

- Codex con visión, generación de imágenes integrada y subagentes. Los subagentes también necesitan acceso al generador y a las referencias.
- Un espacio de trabajo donde guardar los archivos.
- Una foto y una indicación del material si aparecen varias superficies.
- Node.js 18 o superior para los diagnósticos de costuras y el HTML opcional; no necesita paquetes npm. Codex puede usar su runtime incluido o preparar uno portátil desde la fuente oficial cuando lo autorices en el encargo.
- Solo si eliges el probador: un navegador con WebGL. El HTML terminado funciona sin Internet.

No requiere claves API adicionales. Instalar instrucciones no añade herramientas: si falta una capacidad, la skill lo explica y se detiene.

## Instalar

Abre un chat nuevo de Codex. Adjunta la fotografía, cambia `[material y zona]` por tu objetivo y pega **un solo prompt**:

```text
Instala o actualiza esta habilidad desde GitHub y lee su SKILL.md para usarla ahora en esta misma conversación:
https://github.com/danielpatillo/arquinovatos-rendering-img-2-pbr/tree/main/skills/arquinovatos-rendering-img-2-pbr
Con la foto adjunta crea el material de [material y zona].
Prepara los requisitos locales necesarios. Usa subagentes en paralelo cuando la sesión lo permita. Primero entrega los seis tipos de mapas con Normal DX y OpenGL, revisados sin costuras visibles; después pregúntame si quiero crear el visor HTML u omitirlo.
```

O descarga el ZIP del repositorio y copia la carpeta completa
`skills/arquinovatos-rendering-img-2-pbr` a tu directorio personal de skills.
La ubicación de usuario documentada actualmente es `~/.agents/skills/` en
macOS/Linux y `%USERPROFILE%\.agents\skills\` en Windows. Respeta la ubicación
configurada por tu instalación de Codex y reinícialo si todavía no aparece.

Para tus seguidores basta compartir ese enlace de GitHub y el prompt anterior.
La instalación descarga las instrucciones, scripts y plantilla; las capacidades
de imágenes y subagentes dependen de su Codex. No instala PBR Studio ni requiere
claves API. Las actualizaciones se instalan pidiéndole a Codex que actualice
esa habilidad desde el mismo enlace, conservando los resultados anteriores.

## Usar

Adjunta una sola foto y escribe, por ejemplo:

```text
Usa $arquinovatos-rendering-img-2-pbr.
Quiero el material de la fachaleta de piedra de la pared izquierda.
```

Si no indicas el material, pregunta cuál quieres y, cuando sea posible, muestra
la zona marcada para confirmarla. Si ya está claro, empieza directamente.

Primero un subagente genera el albedo y comprueba su repetición 3 × 3 y sus
uniones con un desplazamiento de media imagen. Si tiene costuras, se corrige
antes de seguir. Si persisten tras una corrección dirigida, se conserva el
candidato y se informa el bloqueo, sin gastar llamadas en los cinco derivados.

Con el albedo aprobado, los agentes generan y revisan los cinco mapas restantes
en paralelo o por tandas según la capacidad real. Cada uno recibe el mismo
albedo y la misma foto o su recorte fiel. No se construye ni prueba un visor
durante esta fase.

Con los PNG listos aparece la elección: **Crear visor HTML** u **Omitir HTML**.
Si lo omites, termina con los mapas. Puedes pedir el visor después sobre esos
mismos archivos, sin volver a generar imágenes.
Si pides varios materiales, primero se procesa la fase de imágenes de todos;
la elección de visores se hace al final del lote.

## Archivos de salida

| Archivo | Contenido |
| --- | --- |
| `Material_BaseColor.png` | Albedo / Base Color, sRGB |
| `Material_Normal_DX.png` | Normal DirectX / Y−, datos |
| `Material_Normal_GL.png` | Normal OpenGL / Y+, G = 255 − G del DX |
| `Material_Roughness.png` | Rugosidad, datos |
| `Material_AO.png` | Oclusión ambiental, datos |
| `Material_Specular_UE.png` | Specular escalar UE: F0 = 0.08 × S, datos |
| `Material_Height.png` | Altura relativa, datos |

PNG de 8 bits por canal, cuadrados y con dimensiones comunes. Solicita la máxima
resolución nativa y comunica la recibida; no promete 4K ni presenta reescalado
como detalle nuevo. Cobertura nominal: 2 × 2 m por repetición, ajustable en tu
programa 3D. Si el generador exporta mapas grises en RGB, la entrega informa
los canales reales y cualquier conversión realizada.

Son estimaciones visuales para materiales opacos no metálicos. Metal expuesto,
vidrio y transparencias requieren otros parámetros. La generación por IA puede
introducir diferencias entre mapas; la skill revisa alineación y continuidad.
Un control numérico no garantiza seamless: también se inspeccionan los
diagnósticos. Se comunica qué se comprobó, sin prometer exactitud física.

## Visor opcional desde la plantilla de GitHub

Si lo eliges después de los PNG, la skill crea `Material_PBR.html`: foto, galería,
esfera, cubo con bordes redondeados y plano infinito. Hay controles independientes
de Albedo, Normal, Roughness, AO, Specular y Height, contraste de Roughness y
Specular, tiling UV e inversión Y del Normal. Permite girar, restablecer y
ver/copiar el prompt efectivo de cada mapa. Son **siete PNG** porque se incluyen
ambas convenciones de Normal. OpenGL se calcula exactamente del DX, sin otra
llamada de IA; el visor explica esa operación y muestra el prompt que generó DX.
Los ajustes solo afectan la vista previa; conservan los mapas originales.

La plantilla ya está programada y se descarga con la skill desde GitHub, en
[`assets/review/`](skills/arquinovatos-rendering-img-2-pbr/assets/review/).
El [constructor incluido](skills/arquinovatos-rendering-img-2-pbr/scripts/build-review.mjs)
inserta tus archivos; no escribe otra aplicación ni llama al generador de imágenes.
La interfaz es siempre la misma: temas claro y oscuro, sus logos Arquinovatos,
los mismos controles y la misma distribución. Cambian el material, sus archivos,
prompts y observaciones. En uso normal se comprueba la apertura del resultado;
las pruebas completas de interfaz se reservan para cambios de la plantilla.

El HTML lleva las imágenes y el código incrustados, sin bibliotecas de Internet.
Se puede abrir directamente en un navegador. La iluminación es orientativa y
la altura es relativa; el visor no convierte las estimaciones de IA en un bake
físicamente exacto ni reemplaza las pruebas en tu motor 3D.

Clic derecho o botón **Archivo** abre las acciones de cada imagen. Para
**Abrir ubicación del archivo**, Codex inicia el acompañante local
`Iniciar_visor.mjs`, junto con `review-files.json`, y abre su URL en la misma
computadora. Windows muestra el archivo en Explorer; macOS usa Finder y Linux
abre la carpeta. El servicio escucha solo en loopback y permite únicamente los
archivos de esa ejecución.

Un HTML abierto directamente o una galería remota no puede controlar el
explorador de archivos de una computadora. En esos casos explica la opción
local; en el celular siguen funcionando la esfera, la galería y los prompts.
El manifiesto usa rutas relativas y se entrega una copia exacta de la foto.
Puedes mover la carpeta completa con `maps/`, HTML, iniciador, manifiesto y foto
de referencia. El HTML por sí solo conserva imágenes y controles, pero abrir
ubicaciones necesita los archivos locales y el acompañante.

## Para desarrolladores

La skill incluye el constructor, la plantilla y `scripts/check-seams.mjs`.
Este último produce diagnósticos PNG y un informe con hash sin modificar los
mapas ni construir HTML. Las métricas señalan anomalías; requieren revisión visual.
Pruebas sin dependencias: `npm test`. El constructor no modifica píxeles; comprueba los
siete PNG y conserva sus bytes al incrustarlos en el HTML. La referencia de
uso está en `skills/arquinovatos-rendering-img-2-pbr/references/review.md`.

Los originales, recortes y resultados permanecen en el espacio de trabajo del
usuario. Este repositorio distribuye instrucciones y prompts, sin fotografías
de terceros, credenciales ni rutas personales.

## Referencias

- [Skills e instalación en Codex](https://learn.chatgpt.com/docs/build-skills)
- [Subagentes y concurrencia](https://learn.chatgpt.com/docs/agent-configuration/subagents)

Licencia MIT para el contenido de este repositorio. No concede derechos sobre
las fotografías que cada usuario aporte.
