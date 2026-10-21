---
name: arquinovatos-rendering-img-2-pbr
description: >-
  Convierte una fotografía y un material señalado en seis mapas PBR y un visor HTML
  con esfera, controles por mapa y prompts copiables. Usa el generador integrado
  de Codex y subagentes: albedo primero y cinco derivados en paralelo.
  Para superficies opacas no metálicas.
---

# Arquinovatos - Rendering IMG 2 PBR

Recibe **una fotografía** como único archivo de entrada y entrega **seis mapas PBR y un visor HTML interactivo**. El usuario puede identificar el material en el mismo mensaje. Cada mapa se genera mediante un subagente; el coordinador selecciona, prepara referencias y revisa.

## Capacidades necesarias

Comprueba visión, generador de imágenes **integrado de Codex**, subagentes que tengan ese generador y acceso a los archivos. Usa las herramientas y firmas reales de la sesión, que pueden variar entre clientes. Si falta una capacidad, explica cuál falta y detén la generación. No sustituyas el flujo por APIs, otro proveedor, imágenes de stock, código que dibuje texturas ni ejecución sin subagentes. No solicites claves API ni cambies configuraciones globales. Instalar la skill no habilita capacidades ausentes.

Usa subagentes nativos, no chats separados. Hereda modelo y razonamiento del coordinador salvo indicación expresa del usuario. Para construir el visor usa Node.js disponible en la sesión, incluido el runtime de Codex cuando exista; los scripts no necesitan instalar paquetes. El navegador necesita WebGL para la esfera. Si no puedes construir o comprobar el visor, conserva los mapas e informa la limitación concreta.

## 1. Identificar el material

Inspecciona la foto real. No asumas que el objeto principal es el material solicitado.

- **Indicación clara:** si el usuario identifica inequívocamente una superficie por nombre, posición, marca o recorte, procede directamente aunque haya más acabados.
- **Sin material indicado:** pregunta cuál quiere. Cuando sea útil y exista una herramienta adecuada, muestra una copia con un rectángulo en la zona candidata y pide confirmar esa selección. La prominencia visual no sustituye la indicación del usuario.
- **Varias candidatas:** muestra o describe las zonas y aclara únicamente la diferencia que importa. Espera la respuesta antes de generar.

Conserva el original. No presentes una escena redibujada como una anotación exacta de la fotografía. Si no puedes marcarla de forma fiable, describe la posición y pide indicarla. No repitas confirmaciones después de identificarla.

El conjunto está diseñado para materiales **opacos no metálicos**: piedra, cerámica, concreto, madera, textiles y revestimientos. Una capa opaca sobre metal se trata según su acabado visible. Para metal expuesto, vidrio, transparencia o translucidez, explica que estos seis mapas no describen el material completo y pide otro material compatible; no falsees la solución con un Specular dieléctrico.

## 2. Preparar la referencia común

Si el objetivo es pequeño o hay otros materiales que distraen, usa un **recorte fiel de la región confirmada** mediante las herramientas disponibles. No lo redibujes ni aumentes artificialmente su detalle. Si no puedes hacer un recorte fiel, usa el original indicando con precisión la región. Evita marcos o etiquetas dentro de la referencia de generación.

Todos los agentes usarán la misma foto o el mismo recorte, sin reinterpretaciones diferentes. Resume material, acabado, organización del grano o juntas y relieve estimado en una ficha breve común. La cobertura nominal es **2 × 2 m por repetición**, no una medida recuperada con precisión de la foto.

Crea una carpeta nueva en el destino indicado o en el espacio de trabajo, con `maps/` para finales y `work/` para intermediarios. No escribas resultados dentro de la skill. Resuelve las rutas en esta ejecución; no dependas de rutas, programas o cuentas de la computadora del autor.

## 3. Generar el albedo con un subagente

Encarga a un subagente [references/01-albedo.md](references/01-albedo.md), la foto o recorte, la ficha y una ruta exclusiva. Debe inspeccionar la referencia y adjuntarla realmente al generador integrado. Produce un solo albedo limpio, ortográfico y repetible en U/V, sin iluminación horneada.

Solicita **PNG de 8 bits por canal y la máxima resolución cuadrada nativa disponible**. No impongas 4K si no está admitido ni presentes reescalado como detalle nuevo. Si la herramienta no expone controles de tamaño, pide la máxima y registra las dimensiones recibidas; no afirmes haber demostrado el máximo técnico.

Espera el archivo real, inspecciónalo y corrige problemas concretos antes de continuar. El coordinador acepta el albedo sin volver a pedir aprobación del material ya identificado. Sus dimensiones, encuadre, orientación y diseño se vuelven el **maestro inmutable** para los cinco mapas siguientes. Si hay que reemplazarlo después, invalida todos sus derivados; no mezcles versiones.

Aceptar un maestro para continuar no certifica todas sus propiedades. Si representa el material y sirve como diseño común, pero queda una costura o iluminación residual tras la corrección permitida, conserva la mejor versión, registra **QA parcial** y continúa los cinco derivados con esa limitación heredada. No gastes llamadas repitiendo el mismo defecto sistémico ni pidas confirmar de nuevo la estimación. Un archivo ausente, corrupto o del material equivocado sí bloquea sus derivados. La entrega parcial debe distinguir seis archivos generados de seis mapas aprobados para producción.

## 4. Generar cinco mapas en paralelo

Lee [references/delegation.md](references/delegation.md). Lanza una tarea especializada por mapa hasta el límite real de la sesión y usa tandas o agentes inactivos para los restantes. No esperes al Normal para iniciar Roughness ni al Height para iniciar AO. Respeta también los límites del servicio de imágenes; no prometas que cinco llamadas siempre podrán ejecutarse a la vez.

**Cada llamada de generación de un mapa derivado debe recibir dos imágenes reales, en este orden:**

1. **Image 1:** el mismo albedo maestro, autoridad para posiciones, escala, orientación y diseño UV.
2. **Image 2:** la misma foto original o recorte fiel, referencia del acabado y relieve.

No basta escribir rutas en el prompt. Adjunta los archivos con el mecanismo de referencias documentado. Usa rutas locales explícitas si se admiten. Si solo se admiten imágenes del contexto, cada subagente carga ambas en su propio contexto y las incluye expresamente. No presupongas que hereda imágenes de otro agente ni selecciones «las últimas imágenes» si pueden incluir mapas ajenos.

Cada agente lee y ejecuta el prompt correspondiente:

| Mapa | Prompt | Archivo final |
| --- | --- | --- |
| Albedo / Base Color | [01-albedo.md](references/01-albedo.md) | `Material_BaseColor.png` |
| Normal DirectX / Y− | [02-normal-dx.md](references/02-normal-dx.md) | `Material_Normal_DX.png` |
| Roughness | [03-roughness.md](references/03-roughness.md) | `Material_Roughness.png` |
| Ambient Occlusion | [04-ao.md](references/04-ao.md) | `Material_AO.png` |
| Specular escalar UE | [05-specular-ue.md](references/05-specular-ue.md) | `Material_Specular_UE.png` |
| Height / Displacement | [06-height.md](references/06-height.md) | `Material_Height.png` |

Asigna destinos exclusivos. Ningún agente modifica el albedo u otros mapas. El coordinador reúne los resultados. Si el usuario pide procesar varias fotos, repite la unidad de una foto a seis mapas por caso, con maestros y carpetas independientes.

Cada agente registra **el texto efectivo pasado al generador**, no solo el archivo de plantilla. Reúne en `work/prompts.json` una entrada por nombre final, con `text` y `exact: true` cuando proceda. Si una corrección produce el mapa retenido, su prompt es el que corresponde al final; conserva los intentos anteriores separados. Registra también las dos referencias y sus roles. No reconstruyas un prompt perdido y lo presentes como literal: el visor admite indicar que no está disponible.

## 5. Revisar y entregar

Inspecciona los seis archivos reales: mapa correcto, proporción cuadrada, mismas dimensiones y orientación. La igualdad de tamaño no demuestra alineación: compara posiciones de juntas, vetas, bordes y poros. Revisa continuidad de bordes en ambos ejes y esquinas, preferentemente con repetición 3 × 3 y desplazamiento de media imagen cuando haya herramientas. Conserva esos diagnósticos fuera de `maps/`.

Albedo lleva color intrínseco; su luminancia no equivale a Height, Roughness, AO ni Specular. Pigmentos oscuros no son automáticamente cavidades. Normal debe representar vectores DirectX coherentes, no solo una ilustración violeta. Specular usa `F0 = 0.08 × S`, no glossiness ni Metallic. Aplica los criterios de [delegation.md](references/delegation.md).

Pide RGB para Albedo y Normal y monocanal para los cuatro escalares, todos PNG a 8 bits. Comprueba el formato recibido. Si el generador exporta RGB para un mapa gris, decláralo y conviértelo solo con herramientas compatibles con las reglas de la sesión; no lo describas como monocanal ni cambies su gamma. Si no hay conversión disponible, entrega el contenedor real con esa limitación.

Ante un defecto concreto, pide **una corrección dirigida al agente responsable**, conservando ambas referencias. No rehagas mapas válidos. Si sigue sin resolverse o una herramienta falla de forma persistente, conserva el trabajo e informa qué falta; no hagas reintentos indefinidos ni declares completo un conjunto incompleto.

Mantén **exactamente seis mapas finales en `maps/`**, enlazados o en un ZIP que contenga solo esos seis PNG. Entrega además el visor y su acompañante local conforme al siguiente apartado. Selecciones, recortes, diagnósticos y variantes son intermediarios. Informa dimensiones, bits, canales reales y límites observados. Distingue comprobación técnica, revisión visual y propiedades no verificadas; no afirmes un bake, exactitud física, alineación perfecta o pruebas de render que no realizaste. Son estimaciones artísticas a partir de una fotografía.

## 6. Construir el visor de cada resultado

Lee [references/review.md](references/review.md) y usa la plantilla y el constructor incluidos. Produce `Material_PBR.html` con la foto y los seis PNG incrustados sin modificar sus bytes. Incluye la esfera en tiempo real, intensidad independiente de los seis mapas, contrastes de roughness y specular, galería, menú contextual y prompt copiable por mapa. No sustituyas un render real por una esfera dibujada con CSS o una imagen fija.

El constructor también crea `Iniciar_visor.mjs` y `review-files.json`. El HTML funciona sin servidor para revisar y ajustar. Para **abrir ubicación del archivo**, inicia el acompañante local en la misma computadora y abre su URL con las herramientas disponibles. Usa únicamente los archivos de esta ejecución; el acompañante no ofrece acceso general al disco. En un enlace remoto o en el celular esa acción debe explicarse como local, no fingirse. Los controles solo cambian la vista previa, no los PNG finales.

Generar mapas no autoriza publicar fotos ni resultados. Mantén referencias y ejecuciones fuera del paquete público de la skill.
