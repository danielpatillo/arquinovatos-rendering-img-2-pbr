---
name: arquinovatos-rendering-img-2-pbr
description: >-
  Convierte una fotografía y un material señalado en seis tipos de mapas PBR,
  revisa costuras y después ofrece un visor HTML opcional con controles y prompts
  copiables. Usa el generador integrado de Codex y subagentes: corrige el albedo
  en bucle hasta aprobarlo y continúa con cinco derivados en paralelo.
  Para superficies opacas no metálicas.
---

# Arquinovatos - Rendering IMG 2 PBR

Recibe **una fotografía** y entrega primero **seis tipos de mapas PBR revisados**. Son siete PNG: el Normal se entrega en DX y OpenGL. Solo después ofrece construir el **visor HTML opcional**, usando la plantilla incluida. El usuario puede identificar el material en el mismo mensaje. Los seis mapas base se generan mediante subagentes; OpenGL se deriva exactamente del DX mediante código.

## Capacidades necesarias

Comprueba visión, generador de imágenes **integrado de Codex**, subagentes que tengan ese generador y acceso a los archivos. Usa las herramientas y firmas reales de la sesión, que pueden variar entre clientes. Si falta una capacidad, explica cuál falta y detén la generación. No sustituyas el flujo por APIs, otro proveedor, imágenes de stock, código que dibuje texturas ni ejecución sin subagentes. No solicites claves API ni cambies configuraciones globales. Instalar la skill no habilita capacidades ausentes.

Usa subagentes nativos, no chats separados. Hereda modelo y razonamiento del coordinador salvo indicación expresa del usuario. Los diagnósticos de costuras y el constructor usan Node.js 18+, incluido el runtime de Codex cuando exista; no necesitan paquetes npm. Si falta y el encargo autoriza preparar requisitos, descarga un runtime portátil desde nodejs.org al espacio de trabajo y verifica su checksum oficial, sin cambiar PATH ni instalaciones globales. Si no puedes realizar la revisión, conserva los candidatos e informa que aún no están aprobados. WebGL y navegador solo hacen falta si el usuario elige el visor. Instalar esta skill no añade herramientas integradas ausentes.

## Orden y continuidad del encargo

Sigue **mapas → revisión → entrega de PNG → elección de HTML**. Durante la fase de imágenes no construyas páginas, servidores, instaladores del visor ni pruebas de interfaz. La plantilla ya está programada; no necesita diseño ni código nuevo por material.

Mantén `work/progress.json` con la lista de casos del encargo y, para cada uno, material, foto o recorte, fase, intento actual de albedo, historial de intentos y revisiones, albedo maestro y hash, mapas pendientes/aprobados y elección del visor (`pending`, `skip` o `build`). Solo el coordinador actualiza ese estado antes y después de cada intento y al cambiar de fase. Léelo al retomar y antes de responder: un cambio de turno o compactación no termina el encargo ni permite olvidar materiales pendientes.

En un lote, realiza primero la fase de imágenes de todos los casos y después pregunta una vez por los visores de los materiales aprobados. No interrumpas el lote para construir o probar el HTML del primero. Un caso bloqueado conserva sus candidatos y no impide procesar los otros; nunca ofrezcas como listo el caso fallido.

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

Crea una carpeta nueva en el destino indicado o en el espacio de trabajo, con `maps/` para archivos aprobados y `work/` para candidatos, prompts y diagnósticos. Copia un candidato a su nombre final en `maps/` solo después de aprobarlo, sin cambiar sus bytes. No escribas resultados dentro de la skill. Resuelve las rutas en esta ejecución; no dependas de rutas, programas o cuentas de la computadora del autor.

## 3. Generar el albedo con un subagente

Encarga a un subagente [references/01-albedo.md](references/01-albedo.md), la foto o recorte, la ficha y una ruta exclusiva. Debe inspeccionar la referencia y adjuntarla realmente al generador integrado. Produce un solo albedo limpio, ortográfico y repetible en U/V, sin iluminación horneada.

Solicita **PNG de 8 bits por canal y la máxima resolución cuadrada nativa disponible**. No impongas 4K si no está admitido ni presentes reescalado como detalle nuevo. Si la herramienta no expone controles de tamaño, pide la máxima y registra las dimensiones recibidas; no afirmes haber demostrado el máximo técnico.

Antes de lanzar derivados, aplica [references/quality.md](references/quality.md): repetición 3 × 3, desplazamiento de media imagen y revisión del color sin iluminación horneada. El coordinador acepta el albedo sin volver a pedir aprobación del material identificado. **Una costura visible, junta interrumpida, marco repetido o iluminación horneada bloquea los cinco derivados.**

**Ejecuta un bucle automático hasta aprobar el albedo:** genera o corrige → diagnostica → inspecciona → registra la decisión. Si falla, encarga al mismo subagente una corrección concreta de los defectos observados, adjuntando realmente la foto y el candidato que deba corregir, y repite la revisión del nuevo archivo. Conserva cada candidato, prompt literal, referencias, hash y revisión en `work/albedo/attempt-NNN/`; no sobrescribas el historial. No hay un límite fijo de correcciones ni una confirmación del usuario entre intentos. Si un defecto se repite sin mejora, cambia la instrucción de corrección según la evidencia e informa el progreso; no repitas ciegamente el mismo prompt ni rebajes el criterio para salir del bucle. Corrige con el generador integrado, no mediante retoques de píxeles por código.

El bucle termina al aprobar el albedo o ante una interrupción real: cancelación del usuario, cuota agotada, generador inaccesible, error que impide continuar o imposibilidad de revisar. En una interrupción conserva el estado, explica la causa y no declara aprobado el candidato. Un albedo de «QA parcial» sigue pendiente y bloquea derivados y visor.

Solo el albedo aprobado se vuelve el **maestro inmutable**, con dimensiones, encuadre, orientación, diseño y hash registrados. **Al aprobarlo, continúa de inmediato con el paso 4 dentro del mismo encargo, sin preguntar si debe continuar ni esperar otro mensaje.** Si cambia después, invalida todos sus derivados; no mezcles versiones.

## 4. Generar cinco mapas en paralelo

Lee [references/delegation.md](references/delegation.md). Lanza una tarea especializada por mapa hasta el límite real de la sesión y ocupa cada hueco libre con el siguiente pendiente. No esperes al Normal para iniciar Roughness ni al Height para iniciar AO. Cada agente genera y revisa su propio mapa mientras los demás trabajan; el coordinador reúne evidencias sin repetir todas sus inspecciones. Respeta preferencias expresas del usuario y límites del servicio; no prometas cinco llamadas simultáneas si la sesión no lo permite.

**Cada llamada de generación de un mapa derivado debe recibir dos imágenes reales, en este orden:**

1. **Image 1:** el mismo albedo maestro, autoridad para posiciones, escala, orientación y diseño UV.
2. **Image 2:** la misma foto original o recorte fiel, referencia del acabado y relieve.

No basta escribir rutas en el prompt. Adjunta los archivos con el mecanismo de referencias documentado. Usa rutas locales explícitas si se admiten. Si solo se admiten imágenes del contexto, cada subagente carga ambas en su propio contexto y las incluye expresamente. No presupongas que hereda imágenes de otro agente ni selecciones «las últimas imágenes» si pueden incluir mapas ajenos.

Cada agente lee y ejecuta el prompt correspondiente:

| Mapa | Prompt | Archivo final |
| --- | --- | --- |
| Albedo / Base Color | [01-albedo.md](references/01-albedo.md) | `Material_BaseColor.png` |
| Normal DirectX / Y− | [02-normal-dx.md](references/02-normal-dx.md) | `Material_Normal_DX.png` |
| Normal OpenGL / Y+ | Conversión exacta del DX con `scripts/normal-opengl.mjs` | `Material_Normal_GL.png` |
| Roughness | [03-roughness.md](references/03-roughness.md) | `Material_Roughness.png` |
| Ambient Occlusion | [04-ao.md](references/04-ao.md) | `Material_AO.png` |
| Specular escalar UE | [05-specular-ue.md](references/05-specular-ue.md) | `Material_Specular_UE.png` |
| Height / Displacement | [06-height.md](references/06-height.md) | `Material_Height.png` |

Asigna destinos exclusivos. Ningún agente modifica el albedo u otros mapas. El coordinador reúne los resultados. Si el usuario pide procesar varias fotos, repite la unidad de una foto a seis mapas por caso, con maestros y carpetas independientes.

Cada agente registra **el texto efectivo pasado al generador**, las dos referencias y sus roles, y su revisión con hash conforme a [quality.md](references/quality.md). Reúne los prompts en `work/prompts.json`, una entrada por nombre final con `text` y `exact: true` cuando proceda. Si una corrección produce el mapa retenido, registra esa llamada; conserva intentos anteriores separados. No reconstruyas un prompt perdido como si fuera literal. Estos registros se guardan aunque el usuario omita HTML.

Después de aceptar el Normal DX, el agente responsable o el coordinador ejecuta `node <skill>/scripts/normal-opengl.mjs --input <resultado>/maps/Material_Normal_DX.png --output <resultado>/maps/Material_Normal_GL.png`. Invierte únicamente G = 255 − G; conserva R, B, dimensiones y 8 bits. No usa otra generación de IA ni aplica contraste, gamma o renormalización a los archivos. Si cambia el DX, vuelve a obtener su GL. El visor identifica el GL como derivado y muestra el prompt real del DX, sin inventar otra llamada.

## 5. Revisar y entregar

Reúne las seis revisiones de [quality.md](references/quality.md) y comprueba que sus hashes correspondan a los PNG retenidos. Verifica siete archivos legibles, cuadrados, con las mismas dimensiones, registro respecto al maestro y conversión GL exacta. La igualdad de tamaño no demuestra alineación. Investiga hallazgos o evidencias ausentes; no repitas toda la revisión ni generes otra vez mapas válidos.

Albedo lleva color intrínseco; su luminancia no equivale a Height, Roughness, AO ni Specular. Pigmentos oscuros no son automáticamente cavidades. Normal debe representar vectores DirectX coherentes, no solo una ilustración violeta. Specular usa `F0 = 0.08 × S`, no glossiness ni Metallic. Aplica los criterios de [delegation.md](references/delegation.md).

Pide RGB para Albedo y Normal y monocanal para los cuatro escalares, todos PNG a 8 bits. Comprueba el formato recibido. Si el generador exporta RGB para un mapa gris, decláralo y conviértelo solo con herramientas compatibles con las reglas de la sesión; no lo describas como monocanal ni cambies su gamma. Si no hay conversión disponible, informa el contenedor real. Haz cualquier conversión autorizada antes de la revisión final: un hash o diagnóstico anterior no aprueba un archivo convertido después.

En los **derivados**, ante un defecto concreto pide **una corrección dirigida al agente responsable**, conservando ambas referencias. Si persisten costuras, registro incorrecto o un error que falsee el tipo de mapa, conserva el trabajo e informa que el conjunto aún no está aprobado. Si descubres un defecto del **albedo**, vuelve al bucle del paso 3 e invalida los derivados de ese maestro. No declares listo un conjunto con defectos conocidos ni empieces su visor.

Con el conjunto aprobado, entrega **siete PNG en `maps/`: seis tipos y ambas convenciones de Normal**, enlazados o en un ZIP ligero. Selecciones, recortes y diagnósticos son intermediarios. Informa dimensiones, bits, canales reales y alcance de la revisión. «Sin costuras visibles en las pruebas realizadas» no es una certificación matemática ni un bake físico.

**Ahora pregunta:** «Los mapas están listos y revisados. ¿Quieres crear el visor HTML Arquinovatos o terminar solo con los PNG?». Usa una pregunta con las opciones **Crear visor HTML** y **Omitir HTML**, si la sesión ofrece esa herramienta. Guarda `pending` y espera la elección; el silencio no autoriza construir. Si omite, guarda `skip` y termina. Si ya eligió expresamente para esta ejecución, respeta esa elección sin otra confirmación. Una elección de HTML nunca adelanta su construcción a la revisión de imágenes.

## 6. Construir el visor solo si se elige

Con la elección `build`, lee [references/review.md](references/review.md) y ejecuta el constructor sobre los archivos ya aceptados. Usa la plantilla de `assets/review/`, descargada con la skill desde GitHub: **no escribas otro HTML/CSS/JS, no rediseñes ni vuelvas a generar imágenes**. Produce `Material_PBR.html` con la foto, siete PNG y los dos logos incrustados sin modificar sus bytes. Conserva las tres formas, tiling UV, inversión Y, intensidades por mapa, contrastes, temas, galería, menú contextual y prompts copiables.

El constructor también crea `Iniciar_visor.mjs`, `review-files.json` y una copia exacta `Foto_referencia.ext`. El manifiesto usa rutas relativas: conserva la carpeta completa con `maps/` al moverla. El HTML funciona solo para revisar y ajustar. Inicia el acompañante en una sesión retenida y abre su URL en la misma computadora para habilitar **Abrir ubicación del archivo**. Usa únicamente los archivos de esta ejecución; el acompañante no ofrece acceso general al disco. En un enlace remoto o en el celular esa acción debe explicarse como local. Los controles solo cambian la vista previa, no los PNG finales.

Generar mapas no autoriza publicar fotos ni resultados. Mantén referencias y ejecuciones fuera del paquete público de la skill.
