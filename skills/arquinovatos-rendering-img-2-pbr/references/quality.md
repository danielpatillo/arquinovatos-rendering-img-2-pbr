# Revisión de imágenes antes del visor

La prioridad es aceptar un buen albedo antes de gastar llamadas en derivados. Cada agente revisa el archivo que produce; la evidencia se guarda fuera de `maps/`. No necesitas construir HTML ni abrir un navegador para este control.

## Diagnóstico reutilizable

Con el runtime Node.js disponible, ejecuta el script incluido, sin paquetes externos:

```text
node <skill>/scripts/check-seams.mjs --input <mapa.png> --output <resultado>/work/qa/<nombre-mapa>
```

Produce `repeat-3x3.png`, `offset-half.png` y `seams.json`. Usa todos los píxeles nativos para las métricas; limita cada repetición de la previsualización a 512 px para revisar rápido. El desplazamiento lleva las uniones al centro. No modifica ni corrige el mapa original, ni genera HTML. Admite PNG gris/RGB/RGBA de 8 bits sin entrelazado.

El informe compara el salto entre bordes con las transiciones del interior. Marca saltos atípicos en U/V, pero **no aprueba seamless automáticamente**. Bordes de igual valor pueden esconder un marco, juntas rotas o repetición obvia. Su código de salida indica que el diagnóstico pudo ejecutarse, no que el mapa esté aprobado. Revisa visualmente ambas imágenes y el mapa nativo; amplía detalles cuando la reducción oculte el defecto.

## Qué aceptar

- Continuidad visible de forma, color/valor, grano y juntas en U, V y esquinas. Sin marco, franjas repetidas, juntas cortadas, duplicaciones ni cambio de iluminación en las uniones.
- Albedo reconocible respecto a la foto, ortográfico y sin luces, reflejos, sombras o AO horneados. El albedo defectuoso bloquea todos sus derivados.
- Derivados registrados con el maestro: juntas y rasgos identificables en las mismas posiciones. Compara con el albedo; una misma resolución no prueba registro.
- Datos coherentes con su propósito, según [delegation.md](delegation.md). No confundas pigmentos con relieve, sombra con AO ni brillo con roughness. En un piso plano, Normal/Height deben conservar un relieve prudente.
- Siete PNG íntegros, cuadrados y con dimensiones comunes. GL conserva R/B del DX y únicamente invierte G.

Los flags numéricos requieren inspección y explicación. Si hay una costura real, una junta rota o un error crítico del mapa, no lo apruebes. Si el diagnóstico no es suficiente, registra la revisión pendiente; no inventes un resultado favorable.

## Evidencia y correcciones

Cada agente guarda junto al diagnóstico `review.json` con `sha256`, `approved`, `repeatReviewed`, `offsetReviewed`, `registrationReviewed` y `issues`. Incluye el motivo de cualquier alerta numérica que se haya descartado tras inspección. El coordinador comprueba hashes y resultados; solo reinspecciona fallos, incertidumbres o evidencia ausente.

Una corrección dirigida por mapa, únicamente para defectos observados; no hagas un segundo intento si el primero está bien. Corrige con el generador integrado y vuelve a adjuntar las referencias pertinentes. Vuelve a ejecutar el diagnóstico sobre el retenido y actualiza su prompt literal y revisión. No mezcles un diagnóstico antiguo con un archivo nuevo.

Si persiste un defecto crítico después de esa corrección, conserva los candidatos y detén la aprobación del material. No continúes cinco derivados desde un albedo con costuras, no ofrezcas el visor como siguiente paso de un material no aprobado y no repitas llamadas indefinidamente. Informa lo que falló y lo que falta.

La aceptación comunica **ausencia de costuras visibles en las comprobaciones realizadas**, sin prometer continuidad matemática, recuperación física exacta ni calidad garantizada por el generador.
