# Delegación con poca coordinación

Cada mapa base lo genera un subagente con el generador integrado. Hereda modelo y razonamiento salvo preferencia expresa; no abras chats separados. El coordinador lee esta guía y quality.md; cada agente lee solo su prompt especializado. No hagas que todos relean la skill completa y los otros cinco prompts.

## Un encargo completo por mapa

Pasa rutas absolutas y un encargo breve, sin volver a redactar todo el prompt:

    Genera y revisa [mapa]. Lee [prompt] y quality.md.
    Maestro: [ruta, dimensiones y hash]; foto común: [ruta].
    Ficha compartida: [ruta o material/acabado/relieve en pocas líneas].
    Destino exclusivo: [work/mapa].
    Adjunta realmente [maestro, foto], en ese orden. Para albedo: [foto].
    Guarda cada llamada con prompt literal, argumentos efectivos y roles;
    copia la salida real, nunca una ruta escrita en el prompt.
    Usa pbr-qa.mjs; completa review.json en la raíz del intento.
    El encargo incluye una corrección autónoma si aparece un defecto crítico,
    con los mismos dos adjuntos y una instrucción concreta. No la uses para
    alcanzar un gris orientativo ni cambiar Y. No esperes un permiso administrativo.
    No modifiques albedo, otros mapas o progress.json. No delegues ni construyas HTML.
    Confirma al arrancar y devuelve candidato, revisión, referencias, tiempos y límites.

La convención Normal puede ser DX o GL. Anota la convención solicitada y si llegó a verificarse visualmente; no la deduzcas solo por el color violeta. pbr-qa.mjs con --normal-source produce la pareja opuesta por inversión exacta de G. Asigna los nombres finales según el origen declarado, sin inventar otra llamada. La falta de longitud unitaria perfecta no justifica una segunda generación por sí sola.

## Referencias y trazabilidad

Si se admite referenced_image_paths, usa [maestro, foto] en **cada** llamada derivada. Para corregir albedo usa [foto, candidato a corregir], con sus roles explícitos. Si solo existen imágenes del contexto, cada agente carga sus propios adjuntos y selecciona exactamente esos, evitando mapas ajenos.

Cada intento conserva generation-request.json con los argumentos reales y reference_roles, prompt.txt literal, metadatos pequeños de respuesta y el original. No vuelques base64 en mensajes. Para el Normal invertido registra derived_from y el prompt real del origen; no inventes un prompt independiente. El coordinador reúne esos registros en work/prompts.json sin reconstruirlos de memoria.

Pide tamaño cuadrado nativo máximo para el albedo y sus dimensiones reales para los derivados; no inventes controles de herramienta ni prometas un máximo técnico que no se comprobó. Solo convierte almacenamiento con el helper: no remuestrees ni repintes para aparentar registro. Albedo es sRGB; los demás son datos sin decodificación sRGB.

## Cola y tiempos

Preasigna destinos para los intentos inicial y de corrección. Ocupa cada hueco real con el siguiente mapa pendiente y reutiliza agentes que ya terminaron. No esperes que un mapa concreto termine para lanzar otro independiente. Cada agente hace generación, preparación, inspección y corrección autorizada como un solo trabajo; el coordinador no dirige cada comando.

Guarda started_at, generation_started_at, generation_finished_at y finished_at en el registro del intento. El coordinador actualiza progress.json al repartir y recoger resultados, incorporando esos registros. No bloquees la corrección porque aún no se actualizó el resumen del coordinador.

La confirmación de arranque debe preceder a lecturas largas. Si falta y tampoco aparece el request/estado del intento, comprueba el estado real del agente; si la herramienta confirma pending_init, recupéralo una vez desde los archivos existentes. **No interrumpas ni dupliques una generación que ya tiene request o está ejecutándose porque pasaron unos segundos.** No consultes continuamente estados sin cambios.

## Aceptación

Un dueño revisa cada mapa y el coordinador valida los archivos retenidos. Usa quality.md para distinguir defectos, advertencias y números orientativos. Una pequeña diferencia de contraste no prueba desplazamiento UV; dimensiones iguales tampoco prueban registro. Compara las juntas y rasgos reconocibles visualmente. Conserva cualquier limitación aceptada, sin prometer bake físico o coincidencia matemática.
