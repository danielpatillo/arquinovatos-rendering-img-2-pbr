# Arquinovatos · Imagen a PBR

Adjunta una foto e indica la superficie. Pídelo así:

> Con la skill https://arquinovatos.com/PBR2IMG dame el material de este plafón.

También puedes usar el [enlace directo de GitHub](https://github.com/danielpatillo/arquinovatos-rendering-img-2-pbr/tree/main/skills/arquinovatos-rendering-img-2-pbr). La petición incluye cargar, instalar o actualizar la skill y usarla en esa conversación. Las instrucciones completas están en [SKILL.md](skills/arquinovatos-rendering-img-2-pbr/SKILL.md); no necesitas pegarlas en el chat.

## Qué recibes

Una carpeta local con siete mapas base PNG8: BaseColor, Normal DX y GL, Roughness, AO, Specular UE y Height. Incluye también tres contrastes de Roughness y tres de Specular calculados con las recetas correspondientes de PBR Studio: trece PNG en total cuando hay variación suficiente. Conserva ambos originales. Si una fuente uniforme no admite variantes útiles, lo informa sin inventar detalle.

El albedo se revisa antes de crear los cinco derivados. Los agentes trabajan en paralelo según la capacidad disponible. La revisión distingue defectos visibles de advertencias numéricas; DX/GL se resuelve invirtiendo G sin otra generación. Las propiedades y escala son estimaciones fotográficas, no mediciones físicas. Para superficies opacas no metálicas.

Con los mapas listos puedes elegir el visor HTML Arquinovatos. La plantilla incluida ofrece tres formas, controles de material, Original/Contraste 1/2/3 para Roughness y Specular, descarga de PNG, prompts copiables y **Abrir carpeta de mapas**. Este último abre la carpeta real mediante el iniciador local, sin ZIP.

## Requisitos

- Agente con visión, generador de imágenes integrado, subagentes y acceso a archivos.
- Node.js 18+ para los helpers, sin paquetes npm adicionales.
- Navegador con WebGL para el visor opcional.

Instalar la skill no añade capacidades que el agente no tenga. No requiere claves API ni PBR Studio instalado. Usa la ubicación personal de skills configurada en tu agente; conserva la carpeta completa. El [SKILL.md](skills/arquinovatos-rendering-img-2-pbr/SKILL.md) detalla el procedimiento y los límites.

## Carpeta y visor

Los PNG se guardan directamente en maps/. El resultado incluye Material_PBR.html, Iniciar_visor.mjs, review-files.json y la foto de referencia. Para abrir carpetas desde el visor, el agente inicia `node Iniciar_visor.mjs` y abre su dirección local. Puedes mover el resultado conservando esa carpeta completa.

El material y sus controles funcionan sin Internet. Redes, WhatsApp y la landing se cargan mediante la configuración pública y la página remota vigentes de Arquinovatos. La landing se muestra después de los mapas; su HTML no se copia en este repositorio ni dentro del material. Esa integración no recibe fotos, mapas, prompts ni rutas locales.

## Desarrollo

La skill está en skills/arquinovatos-rendering-img-2-pbr. Los helpers preparan QA, exportan variantes y construyen el visor sin pintar nuevas texturas. Las bases y los PNG incrustados conservan sus bytes. Ejecuta `npm test` para las comprobaciones automáticas.

Este repositorio distribuye instrucciones, prompts, plantilla e integración pública. Las referencias y materiales de cada usuario permanecen en su espacio de trabajo.

Licencia MIT; no concede derechos sobre las fotos que aporte cada usuario.
