# Formatos y reglas — Operate

## Direction contract
THESIS: un formato une productos, copias y una lista de permitidas; los límites se editan en el mismo lugar, sin trasladar cartas entre formatos.

OWN-WORLD: extensión de Dragon Vault. Se conservan azul noche, oro antiguo, Marcellus y DM Sans, filas con separadores y controles nativos. Sin nueva identidad ni imágenes decorativas.

STORY: elegir formato, obtener cartas de sus productos, consultar copias y construir un mazo dentro de sus reglas. Las banlists adicionales solo pueden restringir más. Lo existente se conserva en Oficial.

FIRST VIEWPORT: Formatos reemplaza dos enlaces principales. Selector de formato y accesos a reglas/publicación encima de los productos existentes. Listas y reglas reúne selector de tipo, creación y búsqueda; cada resultado ofrece límites 0–3 de un toque. Colección y mazos comienzan con selector de formato.

FORM: ampliación funcional especificada y confirmada, sin concept-seed. Hereda composición y componentes actuales. Interacción principal: un toque cambia el límite y guarda; los conflictos se explican sin quitar cartas. No se añade movimiento.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implementación y continuidad visual

`FormatsView.vue` reúne productos; `RulesView.vue` reemplaza `BanlistsView.vue` en `/banlists`. `FormatSelect.vue` comparte el selector nativo etiquetado entre productos, reglas, colección, mazos y editores. Colección admite «Todos los formatos»; cada mazo y producto tiene uno concreto. Crear otro producto desde Formatos confirma el descarte de cambios pendientes antes de limpiar el editor y aplicar el formato elegido.

Las capturas de reglas, productos, colección y mazos en `.impeccable/review/formats-{rules,products,collection,decks}-{desktop,mobile}.png` registran la extensión del sistema existente: fondo azul noche, títulos Marcellus, lectura DM Sans, botones dorados para acciones y límites seleccionados, campos oscuros y separadores discretos. Los productos conservan sus ilustraciones y las cartas sus proporciones. Los controles se distribuyen en filas en escritorio y se apilan en móvil, sin añadir movimiento ni recursos decorativos.

La lista de permitidas distingue ausencia/0 de los máximos 1–3; las banlists adicionales mantienen su función restrictiva. Publicar solo incorpora cartas aún no listadas, y la interfaz explica que permitir no entrega copias. La selección de formato delimita productos, copias y mazos, mientras cada cuenta usa un saldo común a sus formatos, sin compartirlo con otras cuentas. Los conflictos permanecen visibles y editables; no se retiran cartas automáticamente.

Esta superficie no modifica la identidad global de `DESIGN.md` ni repara la deriva previamente detectada en `.impeccable/design.json`. Mis mazos ofrece reglas Estándar (40–60/15) o Speed Duel (20–30/6), con selectores nativos. Las banlists compartidas distinguen Libre de Limitada 3 y muestran cupos usados por grupo. Side Deck y habilidades siguen fuera del alcance. Los productos fijos pueden superar 60 cartas; el diálogo explica cuándo solo se entregan a colección. Las capturas documentan los estados revisados, no una certificación general de accesibilidad.

## Cuentas y permisos vigentes

Productos, existencias, formatos y banlists persisten como estado compartido en PostgreSQL. Solo administradores crean formatos, editan límites, publican productos y reponen cajas. Los jugadores consultan listas, compran y gestionan su colección y sus mazos privados. Los cambios se confirman desde el servidor; una edición administrativa desactualizada se rechaza para evitar sobrescrituras. Las variantes histórica/post-errata conservan cantidades separadas y comparten el máximo general de tres copias.

## Banlists mixtas y continuidad de productos

Mixta conserva el tipo original de cada entrada al cambiar desde Normal o Speed Duel y permite elegirlo por carta. El mapa `cardStyles` guarda `individual` o `shared`; la ausencia equivale a individual. Los límites numéricos son 0–3: Normal 3 elimina la restricción adicional; las compartidas 1/2/3 consumen su respectivo cupo entre Main y Extra sin contar las individuales. Pasar a individual limpia las entradas compartidas de límite 3. Los conflictos se mantienen visibles sin retirar cartas.

`RestrictionBadge.vue` presenta círculos de 28 px con borde de 3 px: rojo (#ef7777) para Normal y celeste (#8dc9ff) para compartidas. El 0 usa un trazo SVG de prohibición; los demás límites muestran el número. El título y `aria-label` expresan tipo y significado, por lo que el color no es la única señal. En `DeckCard.vue` el indicador ocupa `top: 36px; right: 6px`, debajo del contador de copias; las comprobaciones de geometría y capturas de escritorio/móvil en `.impeccable/review/box-mixed/` verifican que no se superponen.

Oficial empieza vacío en mundos nuevos. Las compras incorporadas LOB/MRD/SRL y SDY/SDK se retiraron sin borrar catálogo, recursos, cartas adquiridas, mazos, formatos ni cuentas existentes. Los productos publicados ocupan las superficies de compra. Se preservan azul noche, oro, Marcellus y DM Sans; esta extensión no redefine la identidad global ni repara la deriva preexistente del sidecar.