# Arquinovatos - Rendering IMG 2 PBR

Una fotografía de un material → seis mapas PBR con el generador integrado de Codex y subagentes.

Estado experimental: las pruebas iniciales detectaron costuras y diferencias
entre la apariencia de un mapa y los datos que debería representar. La skill
informa esos límites; cada conjunto necesita revisión antes de usarlo en producción.

## Necesitas

- Codex con visión, generación de imágenes integrada y subagentes. Los subagentes también necesitan acceso al generador y a las referencias.
- Un espacio de trabajo donde guardar los archivos.
- Una foto y una indicación del material si aparecen varias superficies.

No requiere claves API adicionales. Instalar instrucciones no añade herramientas: si falta una capacidad, la skill lo explica y se detiene.

## Instalar

En Codex pide:

```text
Usa skill-installer para instalar la skill desde
https://github.com/danielpatillo/arquinovatos-rendering-img-2-pbr
en la carpeta skills/arquinovatos-rendering-img-2-pbr.
```

O descarga el ZIP del repositorio y copia la carpeta completa
`skills/arquinovatos-rendering-img-2-pbr` a tu directorio personal de skills.
La ubicación de usuario documentada actualmente es `~/.agents/skills/` en
macOS/Linux y `%USERPROFILE%\.agents\skills\` en Windows. Respeta la ubicación
configurada por tu instalación de Codex y reinícialo si todavía no aparece.

## Usar

Adjunta una sola foto y escribe, por ejemplo:

```text
Usa $arquinovatos-rendering-img-2-pbr.
Quiero el material de la fachaleta de piedra de la pared izquierda.
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

Los originales, recortes y resultados permanecen en el espacio de trabajo del
usuario. Este repositorio distribuye instrucciones y prompts, sin fotografías
de terceros, credenciales ni rutas personales.

## Referencias

- [Skills e instalación en Codex](https://learn.chatgpt.com/docs/build-skills)
- [Subagentes y concurrencia](https://learn.chatgpt.com/docs/agent-configuration/subagents)

Licencia MIT para el contenido de este repositorio. No concede derechos sobre
las fotografías que cada usuario aporte.
