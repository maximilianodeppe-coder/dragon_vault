# Dragon Vault

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Destino confirmado: Nuxt.js con Nuxt UI, PostgreSQL y despliegue mediante imágenes Docker para ofrecer la aplicación online.

La aplicación está migrada a Nuxt 4, Vue 3 y Nuxt UI, con componentes reactivos, autenticación y persistencia en PostgreSQL. `dist/` conserva la versión estática anterior. Hay configuración Docker para Nuxt y preparación de la base; PostgreSQL requiere su propio servicio y almacenamiento. La instalación local persistente y la cuenta administradora inicial ya están configuradas y el acceso fue verificado. El proveedor, la base de producción y el despliegue público siguen pendientes. La importación del progreso anterior es explícita; no se realiza automáticamente. Ver `README.md` para ejecución y migración del progreso.

## Users

El creador y su grupo de amigos, jóvenes de aproximadamente 20 a 25 años a quienes les gusta coleccionar cartas.

## Product Purpose

Mantener la emoción de abrir sobres de cartas, construir una colección propia y armar mazos para luego exportarlos a MDpro3. El producto debe permitir disfrutar ese recorrido entre amigos; los duelos quedan fuera de Dragon Vault.

El éxito del producto se entiende como poder completar el recorrido de apertura, colección, construcción y exportación de mazos preservando el progreso personal. No se han fijado métricas cuantitativas.

## Positioning

Experiencia de colección de cartas de Yu-Gi-Oh! para un grupo de amigos, con apertura de sobres y construcción de mazos conectada al uso posterior de MDpro3. La primera versión se centra en cartas clásicas. No se afirma exclusividad ni superioridad frente a otros productos.

## Operating Context

- Actual: aplicación en español con acceso obligatorio mediante cuentas individuales y progreso en PostgreSQL; conserva la lectura y exportación del respaldo histórico del navegador.
- Objetivo confirmado: publicar la aplicación online para el grupo, sin duelos integrados. La implementación se ha probado con PostgreSQL temporal aislado y pruebas automatizadas. Además funciona una base local persistente fuera de OneDrive; aún no se ha configurado una base de producción ni publicado esta versión.
- Recorrido principal: obtener cartas abriendo sobres o mediante los otros mecanismos existentes, consultar y gestionar la colección, construir mazos y exportarlos para MDpro3.
- La exportación compatible con MDpro3 es un requisito del producto; su formato y compatibilidad se deberán verificar durante su implementación.
- No están definidos intercambios, mercado entre jugadores, funciones sociales ni acceso público fuera del grupo de amigos.

## Capabilities and Constraints

El usuario indicó preservar todo lo existente durante la evolución: funcionalidades, contenidos, reglas, progreso, fidelidad histórica, economía y nombre. Esto no convierte las limitaciones del prototipo local en restricciones permanentes: las cuentas y el funcionamiento online son cambios explícitamente deseados.

La base funcional documentada en `LEEME.txt` y presente en `dist/` comprende:

- Catálogo de 422 cartas, expansiones clásicas y mazos iniciales Yugi y Kaiba; imágenes en inglés y fichas en español, con fuentes y aclaraciones sobre ediciones y erratas.
- Sobres de cajas con existencias finitas; aperturas que descuentan cartas y guardan el resultado antes de la animación. Reposición de cajas conservando colección y mazos.
- Colección con búsqueda, filtros combinables, ordenamientos, fichas y gestión de copias.
- Constructor visual de mazos, limitado por las cartas poseídas: hasta tres copias por carta, principal de hasta 60 cartas, referencia mínima de 40 y hasta 15 fusiones; sin lista de prohibidas.
- Monedas virtuales, compras de sobres y mazos iniciales, tienda de cartas, precios por rareza y ventas que protegen las copias necesarias para mazos guardados.
- Creación y administración de sobres especiales y ofertas de tienda.
- Guardado, carga y compatibilidad con respaldos anteriores, incluyendo colección, mazos, monedas y estado de cajas y tienda.

Los valores y reglas detallados están en `LEEME.txt` y en la implementación actual; este registro no los sustituye. La migración conserva el progreso existente mediante importación administrativa del respaldo del navegador o de un JSON compatible, sin borrar ni modificar la copia local. Todos pueden exportar; solo administradores pueden importar. La importación confirmada reemplaza el progreso de esa cuenta y el estado compartido, conserva las colecciones de otras cuentas y rechaza la eliminación de formatos que ellas usan. La herramienta de importación está disponible; la existencia de una cuenta no significa que su progreso histórico se haya importado.

Las cuentas usan nombre de usuario y contraseña y tienen rol de administrador o jugador. El administrador crea las cuentas desde Usuarios, cambia roles, bloquea o desbloquea accesos y agrega monedas; no puede bloquearse ni quitarse su propio rol. Cada cuenta empieza con 1.000 monedas. No hay registro público ni recuperación por correo. Las contraseñas se guardan con bcrypt de costo 12; las sesiones usan JWT de siete días en cookies HttpOnly y SameSite=Strict, con Secure bajo HTTPS. Salir revoca únicamente la sesión actual, permitiendo otras sesiones en otros dispositivos.

Cada cuenta conserva sus monedas, colección y mazos. Las cajas, productos, ofertas, existencias, precios, formatos y banlists son compartidos y su edición requiere administrador. El servidor valida permisos y calcula compras, sorteos y saldos dentro de transacciones PostgreSQL; el navegador muestra el estado confirmado. El catálogo y las API también requieren sesión. Los respaldos JSON de una cuenta no sustituyen un respaldo completo de PostgreSQL.

Ampliación del catálogo: se incorpora la copia completa de YGOPRODeck para diseñar expansiones sin activar automáticamente sus cartas. Las expansiones tienen descripción, portada, precio, tamaño de sobre, rareza y cantidad por carta, vista previa y estados borrador/publicada. Solo las publicadas aparecen junto a las cajas clásicas en Sobres. El usuario confirmó sorteo uniforme entre copias disponibles, sin rareza garantizada. Las fichas nuevas usan inglés cuando no existe traducción; se conservan las clásicas en español. Los mazos extra admiten también Sincronía, Xyz y Enlace. La incorporación original del catálogo fue independiente de la posterior implementación de cuentas, PostgreSQL e inventario compartido.

El editor permite crear productos de contenido fijo, incluidos lotes mayores a 60 cartas. Publicar no exige tamaños de mazo ni máximo de tres por carta; mantiene topes técnicos de 1.000 por entrada y 100.000 por producto. Cada compra entrega todo el contenido con sus rarezas sin consumir cajas. Solo permite crear un mazo editable si el producto tiene hasta 60 cartas totales, 15 de Extra y tres por carta jugable; en los demás casos entrega únicamente copias a la colección.

La interfaz identifica cartas y productos por nombre: no muestra códigos de carta ni los solicita en el editor. La búsqueda, el ordenamiento y sus desempates no utilizan códigos; los metadatos existentes se conservan por compatibilidad.

Las nuevas compras de tienda agregan copias comunes con origen Tienda. Ninguna copia de ese origen se puede vender, incluidas las antiguas, que conservan su rareza histórica. La venta rápida calcula el excedente de tres únicamente entre copias vendibles; las de tienda no elevan ese umbral. Las copias de otras fuentes mantienen sus reglas de venta y la protección de mazos. Cada oferta admite un precio entero propio de 1 a 100.000 monedas, editable junto a las existencias; si no tiene precio propio, usa el valor de compra de común.

Formatos reúne sobres y mazos de inicio. Cada formato tiene su lista de permitidas con límites de 0 a 3: una carta ausente o con límite 0 queda excluida. Los formatos nuevos empiezan vacíos; Oficial conserva las cartas clásicas y, al migrar, las que ya estaban en juego. Se pueden incorporar cartas individuales o expansiones completas sin entregar copias ni publicar productos. Publicar un producto incorpora sus cartas aún no listadas con límite 3 y respeta los límites existentes. Las banlists adicionales solo restringen más: se aplica el menor límite y los cambios señalan conflictos sin quitar cartas del mazo.

Productos, mazos y lotes adquiridos pertenecen a un formato. Colección permite ver todos o filtrar uno; el constructor usa solo sus copias. Duplicar productos no traslada adquisiciones. Las ventas protegen mazos y calculan excedentes por formato; un saldo común a los formatos de cada cuenta y tienda de cartas sueltas en Oficial. Los respaldos v7 conservan estas asociaciones y migran versiones anteriores. Cada mazo elige reglas Estándar (40–60/15) o Speed Duel (20–30/6), independientemente de su whitelist. Las banlists pueden usar límites individuales o grupos compartidos 1/2/3, contados entre Main y Extra; Libre es distinto de Limitada 3. No se implementan Side Deck, habilidades ni verificación del sello físico Speed Duel, ni se importa automáticamente una lista competitiva.

Las cuatro erratas funcionales documentadas tienen variantes histórica y actual con inventarios separados, ilustración compartida y máximo general de tres copias entre variantes. La actual se identifica con una E en un círculo. El chequeo diario conserva cambios de efecto para revisión administrativa; no crea variantes automáticamente. La grilla de colección omite etiquetas y colores de rareza y la ficha resume las cantidades por rareza, expansión y formato.

La instalación local usa PostgreSQL en `%LOCALAPPDATA%\DragonVault\postgres`, con acceso restringido a localhost, y el iniciador de Windows levanta base y aplicación. Las credenciales están en archivos locales ignorados por Git. El repositorio usa `main` y el remoto `origin` en `https://github.com/maximilianodeppe-coder/Dragon_Vault.git`; su contenido versionado no incluye cuentas ni progreso de la base local. El repositorio en GitHub es independiente del despliegue público de la aplicación.

## Brand Commitments

Las copias adquiridas registran expansión y rareza, agrupadas por carta y variante en la colección. El usuario elige qué edición vender y cobra su rareza real; los mazos usan el total por carta. Los guardados anteriores conservan sus cantidades como copias sin identificar, con asignación manual de origen y rareza. Los efectos españoles se importan de YAML Yugi y CDBEsp, preservando textos históricos clásicos. El usuario confirmó conservar el original y marcar como pendientes las cartas para las que no se encontró traducción, sin traducirlas automáticamente.

Conservar el nombre Dragon Vault, el contenido en español y el carácter de proyecto no oficial. Mantener la identidad y contenidos existentes como punto de partida; no se solicitó un rediseño visual en esta inicialización.

## Evidence on Hand

- `LEEME.txt`: guía rápida vigente de acceso, instalación, permisos, progreso, productos y reglas; `dist/` conserva la referencia histórica.
- `dist/index.html`, `dist/style.css` y módulos JavaScript: interfaz y comportamiento existentes.
- `dist/cards.json`, datos de mazos iniciales y `dist/assets/`: catálogo, datos e imágenes disponibles.
- Las fuentes documentadas incluyen YGOPRODeck y la base oficial de cartas de Yu-Gi-Oh!; la auditoría histórica existente declara no ser exhaustiva.
- `data/catalog/`: copias del catálogo completo, traducciones y expansiones oficiales incluidas en la compilación, trasladadas fuera de los archivos públicos; las API autenticadas sirven estos datos y sus actualizaciones.
- `app/pages/login.vue`, `app/pages/usuarios.vue` y `server/`: acceso con cuentas, gestión administrativa y persistencia personal y compartida en PostgreSQL; `README.md` documenta preparación, permisos y migración.
- Se ejecutaron pruebas automatizadas y pruebas contra PostgreSQL temporal aislado. La instalación local persistente y el acceso de la cuenta administradora están verificados. El despliegue público y la base de producción siguen pendientes; no se ha realizado una importación automática del progreso del navegador. La imagen Docker requiere verificación en destino; la compatibilidad de exportación con MDpro3 conserva su requisito de verificación.

## Product Principles

1. Conservar la emoción de descubrir las cartas al abrir sobres.
2. Dar continuidad a la colección personal y proteger el progreso en cada evolución.
3. Conectar la obtención de cartas con la construcción de mazos utilizables en MDpro3.
4. Preservar contenidos, reglas y capacidades existentes al migrar a la experiencia online.
5. Mantener los duelos fuera de Dragon Vault.

## Accessibility & Inclusion

Preservar las alternativas con botones a las operaciones de arrastrar y soltar, la adaptación a pantallas pequeñas y el respeto a la preferencia de movimiento reducido ya documentados en la aplicación. No se han definido necesidades adicionales ni un estándar formal de conformidad.
