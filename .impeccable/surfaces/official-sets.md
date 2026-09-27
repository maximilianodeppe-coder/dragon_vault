# Expansiones oficiales y creaciones

Scope: extensión del archivo/editor existente. Modo Operate. El creador busca una edición TCG por nombre o año, revisa su contenido y prepara una publicación sin mezclarla con sus creaciones. El usuario delegó la ubicación y organización.

## Direction contract

THESIS: un archivo cronológico consultable que conduce al editor existente; evita convertir cientos de expansiones en tarjetas decorativas.

OWN-WORLD: se conserva azul noche, oro antiguo, Marcellus y DM Sans, pestañas subrayadas, campos oscuros y filas separadas por líneas del sistema actual.

STORY: distinguir oficiales de creaciones; buscar y ordenar; seleccionar una edición; revisar cobertura y pasar a un borrador. Publicar conserva la economía y no entrega cartas.

FIRST VIEWPORT: navegación local Oficiales TCG / Mis creaciones; búsqueda, año, formato y orden; listado de fechas, nombres, cobertura y acción Preparar. TCG y las fechas más antiguas son los valores iniciales. Filas fluidas apiladas en móvil. El contenido se revisa en el editor con la vista previa existente.

FORM: extensión local especificada, sin sorteo ni nueva identidad. Seleccionar una edición importa un borrador y permite volver al archivo. Sin animaciones nuevas; foco y estados claros.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented behavior

- `/expansiones` consulta el archivo de YGOPRODeck; `/especiales` conserva las creaciones propias. El archivo presenta 30 productos por página, permite filtrar Speed Duel por separado y deja los productos sin fecha al final del orden cronológico. La clasificación de formato se infiere del nombre de la fuente; no representa una auditoría del catálogo de Konami.
- La cobertura cuenta cartas distintas vinculadas por nombre exacto de edición. Preparar crea una plantilla de sobres con cantidades iniciales por rareza (Común 1, Rara 5, Súper Rara 3, Ultra Rara 1 y Secreta 1), incluso para productos físicos que sean mazos. La capacidad empieza en al menos 100 sobres y aumenta si las copias iniciales lo requieren. Usa la primera rareza compatible o Común como respaldo. La explicación de esta conversión acompaña al editor: no prometer cantidades, colación ni probabilidades del producto físico.
- Preparar no publica ni entrega cartas. Publicar usa la economía existente y las publicaciones oficiales quedan separadas de las creaciones propias en Sobres. El archivo permite retomar productos oficiales ya guardados.
- El borrador en edición se conserva durante la navegación. Abrir otro producto o empezar uno nuevo pide confirmar si hay cambios sin guardar, incluidos cambios de nombre, descripción, precio y otros campos aunque no haya cartas. Cancelar conserva ese trabajo; solo Guardar borrador o publicar lo persiste.
- La referencia se actualiza diariamente en el servidor y conserva la última copia válida ante fallos. Las publicaciones guardadas conservan su referencia original y persisten en PostgreSQL con existencias compartidas; el progreso pertenece a cada cuenta. Preparar, editar y publicar requieren administrador y las rutas del editor están protegidas. Los datos de la importación y los comandos de mantenimiento están en `README.md`.

Esta extensión reutiliza el sistema global existente; no cambia `DESIGN.md` ni `.impeccable/design.json`.

## Capacidad y revisión de cajas

El editor incorpora Sobres por caja y Autocompletar comunes en los campos existentes, sin cambiar la tipografía o composición global. El objetivo visible es sobres × cartas por sobre. Autocompletar distribuye solo nuevas copias comunes, conserva las cantidades especiales y rechaza excesos o capacidad común insuficiente. Los topes son 1.000 copias por carta y 100.000 en total. Cambiar a una rareza no común restablece su cantidad estándar, editable después. Un borrador puede estar incompleto; publicar una caja con `boxPacks` exige el total exacto también en el servidor. Las cajas anteriores sin ese campo mantienen compatibilidad.

Las compras incorporadas LOB/MRD/SRL y SDY/SDK desaparecen de productos; sus datos, recursos y adquisiciones anteriores permanecen. Un mundo nuevo empieza sin productos ni ofertas. Las capturas de escritorio y móvil de esta extensión están en `.impeccable/review/box-mixed/`.