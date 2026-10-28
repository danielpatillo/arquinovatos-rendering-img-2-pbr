# Biblioteca local de materiales

Cada usuario conserva su propio historial en `<carpeta-personal>/Arquinovatos/Materiales_PBR`. El helper obtiene esa carpeta del sistema, sin rutas del autor. No guarda datos en la instalación de la skill ni publica el catálogo. Actualizar la skill mantiene intactos los materiales y registros locales.

Es una biblioteca compartida por todos los chats y ejecuciones de ese usuario en la misma computadora. Usa siempre esa raíz predeterminada, independientemente del directorio de trabajo o la versión instalada. Elegir una carpeta para guardar un material cambia el destino del caso, no la ubicación del historial común. Solo usa `--library` con otra raíz si el usuario pidió expresamente otra biblioteca; no crees una biblioteca nueva por chat o por generación.

## Crear y registrar

Antes de generar, si no hay destino expreso:

```text
node <skill>/scripts/material-library.mjs new --name "Nombre del material"
```

Devuelve `library`, `root` y `maps`; reserva una carpeta exclusiva con maps/ y work/, sin crear páginas ni un servidor. Usa esas rutas durante el encargo. Si el usuario eligió un destino, consérvalo y usa la biblioteca personal para indexarlo. `--library <carpeta>` permite una biblioteca elegida expresamente; no cambies configuraciones globales para imponerla a otros encargos.

Después de aprobar y entregar los PNG, registra primero el material con `register --status viewer-pending` para conservar su acceso aunque se interrumpa el HTML. Luego `build-review.mjs --library <biblioteca>` construye el visor y actualiza automáticamente el mismo registro a ready. Si omites --library, usa la biblioteca personal. Revisa `library.registered` y comunica cualquier error conservando los PNG y el HTML ya construidos.

Si solo se pidieron PNG o el visor no se pudo construir, registra el resultado aprobado con su estado real:

```text
node <skill>/scripts/material-library.mjs register --material <caso> --name "Nombre del material" --status png-only --library <biblioteca>
node <skill>/scripts/material-library.mjs register --material <caso> --name "Nombre del material" --status viewer-pending --library <biblioteca>
node <skill>/scripts/material-library.mjs register --material <caso> --name "Nombre del material" --status viewer-error --library <biblioteca>
```

`viewer-pending` sirve para un resultado final cuyo visor queda pendiente por una interrupción; no significa que esté revisado. `ready` exige HTML, manifiesto y los siete PNG base. El historial no sustituye la revisión de calidad ni autoriza aprobar candidatos. En lotes, termina primero todas las imágenes y realiza estos registros y visores en la fase posterior.

El registro mantiene nombre, fechas, carpeta, estado e identificador; una reconstrucción actualiza el mismo material. Los registros separados y las escrituras atómicas con bloqueo evitan perder entradas entre ejecuciones simultáneas. Un registro dañado se conserva y se informa; no reinicialices toda la biblioteca para ocultar el error.

## Reabrir en cualquier momento

Entrega siempre un enlace al `Biblioteca_PBR.html` devuelto por el helper. Ese archivo permanente permite buscar por nombre y abrir los visores disponibles. No depende de mantener abierto este chat ni de una URL temporal.

Al pedir «abre mi historial» o después de actualizar expresamente la skill, reconstruye el catálogo desde sus registros locales, sin modificar sus materiales ni descargar recursos:

```text
node <skill>/scripts/material-library.mjs refresh
```

Usa `--library <biblioteca>` solo si se eligió otra raíz. `refresh` devuelve las rutas de catálogo e iniciador y el número de materiales, conserva los registros y sus fechas, y también recupera un HTML vacío o desactualizado a partir del historial existente. No reinicies el historial ni lo reemplaces por una lista que solo contenga el material actual. Si había resultados antiguos sin registrar, importa únicamente sus carpetas de salida conocidas según la sección siguiente.

Para habilitar las carpetas desde el navegador:

```text
node <biblioteca>/Iniciar_biblioteca.mjs
```

Abre su URL en la misma computadora. El catálogo tiene **Ver material**, **Abrir carpeta de este material** y **Abrir carpeta de todos los materiales**. El visor conserva además **Abrir carpeta de mapas** y añade **Mis materiales** y ambas acciones de carpeta. Un HTML abierto directamente funciona para consultar; abrir carpetas requiere el acompañante local. Si se cierra, vuelve a ejecutar el iniciador. No requiere regeneración, claves API, autenticación del autor ni paquetes npm.

Con el acompañante local, la lista se actualiza al volver a la pestaña y cada 30 segundos mientras está visible, además del botón **Actualizar historial**. Mantiene el filtro de búsqueda y conserva la lista anterior si falla una lectura. Un archivo abierto directamente muestra el catálogo guardado más reciente; recargarlo vuelve a leer ese HTML actualizado. El servidor comprueba Host/Origin/token para acciones y recibe identificadores, nunca rutas proporcionadas por la web. Sirve solo los visores y vistas previas de materiales registrados. Fotos, mapas, prompts, nombres y rutas no se envían a la integración comercial remota.

## Materiales anteriores y carpetas movidas

Para incorporar resultados anteriores, limita la búsqueda a una carpeta de resultados conocida o indicada por el usuario:

```text
node <skill>/scripts/material-library.mjs import --from <carpeta-de-resultados> --library <biblioteca>
```

Detecta visores existentes con review-files.json y mapas completos, omite work/, maps/, tests/ y repositorios internos, y los registra sin copiar, mover, regenerar ni reescribir los materiales. No busques por todo el disco ni importes ejemplos de pruebas como trabajos del usuario. La biblioteca principal contiene los nuevos materiales creados con el destino predeterminado; los importados o guardados en otro destino siguen en sus carpetas y se abren desde su registro. No afirmes haber recuperado materiales que no encontraste.

Los materiales creados dentro de la biblioteca usan referencias relativas; mover la biblioteca completa conserva su navegación. Si se mueve por separado una carpeta externa, su registro anterior aparece no disponible: vuelve a importar la ubicación real. No borres su historial ni inventes un visor faltante.
