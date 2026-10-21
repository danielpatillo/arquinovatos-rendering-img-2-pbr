# Arquinovatos - Rendering IMG 2 PBR

Una fotografía de un material → seis mapas PBR, sus prompts y un visor HTML con esfera en tiempo real.

Estado experimental: las pruebas iniciales detectaron costuras y diferencias
entre la apariencia de un mapa y los datos que debería representar. La skill
informa esos límites; cada conjunto necesita revisión antes de usarlo en producción.

## Necesitas

- Codex con visión, generación de imágenes integrada y subagentes. Los subagentes también necesitan acceso al generador y a las referencias.
- Un espacio de trabajo donde guardar los archivos.
- Una foto y una indicación del material si aparecen varias superficies.
- Node.js 18 o superior para que Codex construya el HTML y abra el acompañante local; no necesita paquetes npm. Codex puede usar su runtime incluido cuando esté disponible.
- Un navegador con WebGL para el probador. El HTML terminado funciona sin Internet.

No requiere claves API adicionales. Instalar instrucciones no añade herramientas: si falta una capacidad, la skill lo explica y se detiene.

## Instalar

En Codex pide:

```text
Usa $skill-installer para instalar esta habilidad desde GitHub:
https://github.com/danielpatillo/arquinovatos-rendering-img-2-pbr/tree/main/skills/arquinovatos-rendering-img-2-pbr
```

O descarga el ZIP del repositorio y copia la carpeta completa
`skills/arquinovatos-rendering-img-2-pbr` a tu directorio personal de skills.
La ubicación de usuario documentada actualmente es `~/.agents/skills/` en
macOS/Linux y `%USERPROFILE%\.agents\skills\` en Windows. Respeta la ubicación
configurada por tu instalación de Codex y reinícialo si todavía no aparece.

Para tus seguidores basta compartir ese enlace de GitHub y el texto anterior.
La instalación descarga las instrucciones, scripts y plantilla; las capacidades
de imágenes y subagentes dependen de su Codex. No instala PBR Studio ni requiere
claves API. Las actualizaciones se instalan pidiéndole a Codex que actualice
esa habilidad desde el mismo enlace, conservando los resultados anteriores.

## Usar

Adjunta una sola foto y escribe, por ejemplo:

```text
Usa $arquinovatos-rendering-img-2-pbr.
Quiero el material de la fachaleta de piedra de la pared izquierda.
Entrega los seis mapas, el HTML con probador y abre el visor local.
```

Si no indicas el material, pregunta cuál quieres y, cuando sea posible, muestra
la zona marcada para confirmarla. Si ya está claro, empieza directamente.

Primero un subagente genera el albedo; después otros generan los cinco mapas
restantes en paralelo o por tandas según la capacidad real. Cada uno recibe
el mismo albedo y la misma foto o su recorte fiel.

## Archivos de salida

| Archivo | Contenido |
| --- | --- |
| `Material_BaseColor.png` | Albedo / Base Color, sRGB |
| `Material_Normal_DX.png` | Normal DirectX / Y−, datos |
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
introducir diferencias entre mapas; la skill revisa alineación y continuidad e
informa los controles que no pudo realizar.

## Visor que recibe cada usuario

Además de los seis PNG, la skill entrega `Material_PBR.html`: foto, galería,
esfera WebGL y controles independientes de Albedo, Normal, Roughness, AO,
Specular y Height, con contraste de Roughness y Specular. Permite girar la
esfera, restablecer valores y ver/copiar el prompt efectivo de cada mapa.
Los ajustes solo afectan la vista previa; conservan los mapas originales.

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
Los archivos auxiliares contienen rutas locales y se mantienen fuera del repo.

## Para desarrolladores

La skill incluye el constructor y la plantilla autocontenidos. Pruebas sin
dependencias: `npm test`. El constructor no modifica píxeles; comprueba los
seis PNG y conserva sus bytes al incrustarlos en el HTML. La referencia de
uso está en `skills/arquinovatos-rendering-img-2-pbr/references/review.md`.

Los originales, recortes y resultados permanecen en el espacio de trabajo del
usuario. Este repositorio distribuye instrucciones y prompts, sin fotografías
de terceros, credenciales ni rutas personales.

## Referencias

- [Skills e instalación en Codex](https://learn.chatgpt.com/docs/build-skills)
- [Subagentes y concurrencia](https://learn.chatgpt.com/docs/agent-configuration/subagents)

Licencia MIT para el contenido de este repositorio. No concede derechos sobre
las fotografías que cada usuario aporte.
