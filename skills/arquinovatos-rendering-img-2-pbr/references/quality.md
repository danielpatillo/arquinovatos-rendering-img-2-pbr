# Revisión práctica de los mapas

Revisa si el material es utilizable y representa la propiedad pedida. No confundas una estimación artística con una medición de laboratorio. El resultado puede aprobarse con advertencias explícitas; no debe ocultar un defecto visual real.

## Una preparación y una revisión por candidato

Usa el helper incluido en vez de escribir scripts de formato, histogramas, vectores y previsualizaciones en cada encargo:

    node <skill>/scripts/pbr-qa.mjs prepare --input <salida-real.png> --map roughness --output <caso>/work/roughness/attempt-001

Mapas admitidos: albedo, normal, roughness, ao, specular, height. Para Normal añade --normal-source directx u opengl, según la convención solicitada o identificada en esa llamada. La inversión de Y es reversible: el helper conserva la salida original y produce la pareja mediante G = 255 − G, sin otra generación.

El helper conserva original.png, prepara candidate.png, registra formato/conversión/hash en qa.json, genera qa/seams.json, repetición y desplazamiento, y deja review.json pendiente de revisión visual. qa/contact-sheet.png reúne repetición a la izquierda, candidato arriba a la derecha y desplazamiento debajo. Inspecciona esa hoja y la imagen nativa que ya devolvió el generador; no vuelvas a cargar lo ya visto salvo duda concreta. Amplía solo la unión o rasgo dudoso si la reducción no lo resuelve.

La conversión de RGB casi gris a escalar está autorizada como round((R+G+B)/3), sin gamma, contraste ni remuestreo. Se conserva el original y se declaran diferencias de canales. Mucha cromaticidad exige revisar si realmente se generó un mapa escalar; convertirlo no valida su significado. Toda conversión precede a QA y al hash retenido.

## Qué bloquea y qué se documenta

**Bloquea:** archivo ilegible, dimensiones incompatibles, transparencia indebida, costura o marco claramente visible, juntas rotas/dobladas, registro visiblemente incorrecto, iluminación fotográfica copiada o error que cambie el significado del mapa: Height con juntas salientes, Roughness como albedo gris, AO con sombras/pigmentos, Normal como imagen coloreada sin estructura direccional, Specular como glossiness/Metallic.

**Se documenta sin bloquear por sí solo:**

- Baselines, intervalos y números de gris sugeridos en prompts. No son valores medidos. Un Specular distinto de 128 o un AO distinto de una guía no demuestra que el mapa sea incorrecto.
- Desviaciones de longitud de vectores, pequeñas asimetrías de perfiles o diferencias de uno o pocos píxeles sin artefacto visible relevante. No exijas un bake matemático a una generación artística.
- Alertas de salto U/V dentro de una junta física. Revisa si hay una franja adicional visible; la métrica por sí sola no aprueba ni rechaza.
- Convención Y del Normal. DX y OpenGL son igualmente admisibles; producir la opuesta invirtiendo G resuelve esa diferencia. No regeneres para forzar una de ellas.

No conviertas una advertencia en defecto crítico por incumplir un número que añadió el coordinador. Para bloquear por intensidad o contraste, describe el efecto visible o la interpretación material injustificada, no solo la distancia respecto de la guía. Tampoco rebajes un defecto visible real para terminar.

## Evidencia mínima

En la **raíz del intento**, completa review.json con sha256 del candidato retenido, approved, status, repeatReviewed, offsetReviewed, registrationReviewed, issues y warnings. Usa status "approved" o "approved_with_warnings" junto con approved:true cuando corresponda. issues contiene impedimentos reales; warnings, estimaciones y límites.

No afirmes coincidencia exacta por píxel ni recuperación física. El agente es dueño de la revisión de su mapa; el coordinador comprueba hashes y solo reinspecciona defectos, incertidumbres o evidencia ausente. Una reevaluación conserva el dictamen anterior y explica la nueva decisión; no cambia píxeles a escondidas.

## Correcciones sin pausas administrativas

**Albedo:** bucle hasta aprobar o interrupción técnica real, como pide SKILL.md. El agente prepara el candidato y sus diagnósticos; el coordinador decide una sola vez por intento. Si un problema se repite sin mejora, cambia la estrategia en lugar de insistir con el mismo prompt. No lances derivados desde un albedo pendiente.

**Derivados:** el encargo ya autoriza una corrección dirigida por defecto crítico. El agente conserva el intento anterior, registra el motivo y corrige sin esperar un mensaje del coordinador. No gastes esa llamada por una advertencia numérica, el contenedor gris o la convención Y. Si el defecto crítico persiste, conserva pendiente y explica el impedimento; no sustituyas el trabajo por un placeholder.

## Comprobación final, una vez

El coordinador reúne work/reviews.json como un objeto por nombre final, con review relativo al caso. El Normal invertido lleva derived_from con el nombre del Normal origen y comparte su revisión. Ejecuta:

    node <skill>/scripts/pbr-qa.mjs verify-set --root <caso>

Comprueba siete PNG, formato, dimensiones, hashes/revisiones y G invertida exactamente. Las advertencias no invalidan el conjunto. La aprobación visual sigue siendo necesaria: la integridad de archivos no demuestra continuidad ni propiedades físicas. Entrega con el alcance real: «sin costuras visibles en las comprobaciones realizadas», o declara la advertencia concreta si se aceptó una limitación menor.
