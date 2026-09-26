# Dragon Vault · Nuxt

Aplicación migrada a Nuxt 4, Vue 3 y Nuxt UI. Conserva las 422 cartas, las imágenes, la identidad visual, las cajas clásicas, los mazos iniciales, la colección, el constructor de mazos, la economía, la tienda y los sobres especiales.

Ahora requiere cuentas y PostgreSQL. Implementa roles **administrador** y **jugador**, contraseñas con bcrypt (costo 12) y JWT de siete días en cookies HttpOnly y SameSite=Strict, Secure cuando se usa HTTPS. No existe registro público ni recuperación por correo. El catálogo y las API requieren sesión. Cada cuenta tiene sus monedas, colección y mazos; cajas clásicas, expansiones, ofertas, stock, precios, formatos y banlists son compartidos.

## Estado actual

Actualizado el 26/09/2026. La instalación local persistente ya funciona en `http://127.0.0.1:3000` y la cuenta administradora `admin` existe y tiene acceso verificado. Su contraseña se conserva únicamente en `.data/local-access.txt`, fuera de Git. Están implementados RBAC, sesiones, economía compartida, importación de progreso, formatos, banlists y variantes históricas/post-errata. El despliegue público y la configuración de producción siguen pendientes.

## Preparar PostgreSQL y la primera cuenta

### Instalación local de esta computadora

`node scripts/setup-local.mjs` reutiliza los binarios PostgreSQL ya disponibles en `.data/postgres-tools`, crea una base independiente en `%LOCALAPPDATA%\DragonVault\postgres` (fuera de OneDrive), escucha únicamente en `127.0.0.1:55440` y prepara `.env`. Nunca reinicializa una base existente. El acceso inicial está en `.data/local-access.txt`; ese archivo, `.env` y `.data/local-database.json` son privados y no deben compartirse. **Iniciar Dragon Vault.cmd** inicia también esta base antes de la página. No utiliza ni modifica la base de pruebas.

Para trasladar las creaciones anteriores, ingresar como administrador en el mismo navegador y origen de siempre y usar **Guardar / cargar → Importar progreso de este navegador**. No se ha importado automáticamente el almacenamiento de las pestañas existentes. La copia original queda intacta. La aplicación permite exportar el respaldo JSON. Para migrar todas las cuentas al futuro servidor se necesitarán las herramientas cliente PostgreSQL (`pg_dump` y `pg_restore`), no incluidas en estos binarios locales mínimos. No copiar los archivos de una base activa como respaldo.

### Otra computadora o servidor

Los binarios de PostgreSQL y la configuración privada de esta instalación no viajan con Git. En una copia nueva del proyecto, instalar PostgreSQL o usar un servicio existente y seguir estos pasos.

1. Crear una base PostgreSQL vacía y copiar `.env.example` como `.env`. Configurar `DATABASE_URL`, un `JWT_SECRET` aleatorio de al menos 32 bytes y `APP_ORIGIN` con el origen exacto, sin barra final. En el servidor público usar HTTPS; HTTP solo se admite en localhost. Configurar TLS de PostgreSQL según el proveedor, sin deshabilitar la validación del certificado.
2. Ejecutar `npm ci` y `npm run db:migrate`. Las tablas se crean explícitamente; el servidor no modifica el esquema al arrancar.
3. Definir `ADMIN_USERNAME` y `ADMIN_PASSWORD` en el entorno privado o `.env`, ejecutar `npm run db:admin` y quitar esas dos variables después. El comando solo crea la primera cuenta administradora; nunca sustituye una cuenta existente. Usuario: 3–32 letras, números, punto, guion o guion bajo, sin distinguir mayúsculas. Contraseña: al menos 12 caracteres y hasta 72 bytes UTF-8 (límite de bcrypt).
4. Ingresar con esa cuenta. **Usuarios** permite crear otras cuentas, asignar roles, bloquear/desbloquear y agregar monedas. Cada jugador empieza con 1.000 monedas. No se permite bloquearse ni quitarse el propio rol de administrador.

Generar el secreto JWT localmente: `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. No subir `.env` ni compartir contraseñas por el chat. El token no se guarda en localStorage. Se permiten varios dispositivos; **Salir** revoca solo la sesión actual. El vencimiento es fijo a los siete días desde el ingreso, sin renovación silenciosa. El servidor consulta el rol y bloqueo actuales; los controles de la interfaz reflejan cambios de rol al volver a ingresar. No se incluye una pantalla para cerrar todas las sesiones.

El login limita intentos por usuario y dirección de conexión usando PostgreSQL. Detrás de un proxy, la dirección de conexión corresponde al proxy; no se confía en cabeceras de IP enviadas por el cliente. Las escrituras requieren JSON y un Origin idéntico a `APP_ORIGIN`.

## Ejecutar

En Windows, hacer doble clic en **Iniciar Dragon Vault.cmd** para servir la compilación existente sin depender del chat. Registra una tarea local `DragonVault-Local`, sin privilegios de administrador ni inicio automático, y la inicia en segundo plano. Se mantiene al cerrar el chat; después de reiniciar Windows hay que ejecutar el acceso otra vez. No cambia el origen ni el progreso del navegador. Los errores quedan en `.data/server.log`.

Para detenerla: `schtasks /End /TN DragonVault-Local`. Para quitar el registro después de detenerla: `schtasks /Delete /TN DragonVault-Local /F`. Después de modificar código, detenerla, ejecutar `npm run build` y volver a iniciarla. El modo de desarrollo que sigue requiere mantener su terminal abierta.

Requiere Node.js 24 o posterior, PostgreSQL y la preparación anterior.

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:3000. **Formatos** (`/formatos`) reúne mazos de inicio y sobres. Las rutas antiguas `/iniciales` y `/sobres` siguen disponibles para Oficial. El acceso empieza en `/login`. Las otras secciones son `/coleccion`, `/mazos`, `/banlists`, `/tienda`, `/catalogo`, `/expansiones`, `/especiales` y `/usuarios`; las tres últimas requieren administrador.

```sh
npm run build
npm run preview
```

La compilación de producción queda en `.output/`. Usar el servidor Nuxt (`npm run preview` o `node --env-file-if-exists=.env .output/server/index.mjs`): las imágenes nuevas requieren `/api/card-image/:id`. Una exportación puramente estática con `npm run generate` no ofrece esa ruta y no es el despliegue completo. `dist/` conserva la versión anterior y no es la salida de Nuxt. No se ha publicado ningún cambio al sitio alojado.

## Catálogo completo y expansiones

`data/catalog/cards.json` contiene los **14.572 registros** entregados por el endpoint completo de [YGOPRODeck](https://ygoprodeck.com/api-guide/) el 23/09/2026, sin filtros de formato o edición. Incluye los campos originales, textos, estadísticas, arquetipos, ediciones y referencias de imágenes; la metadata registra origen, fecha, cantidad y hash de la respuesta. Es una copia de esa fuente, no una garantía sobre cartas que aún no estén en ella. Las 422 cartas clásicas conservan sus fichas en español, textos históricos e imágenes locales. El catálogo también retiene 10 registros clásicos ausentes del endpoint: 14.582 fichas base, sin contar las variantes post-errata documentadas más abajo ni las altas de sincronizaciones posteriores.

Los nombres y efectos españoles se guardan en `data/catalog/es.json`, cruzando ID, ID de Konami y nombre inglés con [YAML Yugi](https://github.com/DawnbrandBots/yaml-yugi) y completando con [CDBEsp](https://github.com/ryoken08/CDBEsp). La descarga actual cubre **14.211 fichas**; **371** conservan el texto inglés y muestran «Traducción pendiente», por decisión del usuario. `es-missing.json` registra las pendientes. Las traducciones comunitarias se identifican como tales; no se han generado traducciones automáticas. Las fichas históricas existentes prevalecen. La sincronización española usa SQLite nativo de Node.js (verificada con Node 24), no agrega dependencias, guarda fecha y hashes, y no modifica el progreso.

- **Base de datos** permite buscar todo el catálogo por nombre, ID, tipo, arquetipo o edición oficial. «Solo catálogo» no habilita cartas en la colección, los mazos ni la tienda.
- **Expansiones** permite seleccionar cartas, nombre, descripción, portada, precio, cartas por sobre, rarezas y copias. La vista previa resume contenido y probabilidades iniciales.
- **Guardar borrador** persiste la expansión sin habilitar sus cartas. **Crear y publicar expansión** la agrega a Sobres junto a LOB, MRD y SRL. Publicar habilita las cartas, pero no entrega ninguna copia.
- En **Expansiones → Tipo de producto → Mazo de inicio** se diseñan productos de contenido fijo, incluidos lotes de más de 60 cartas. No se exigen tamaños de mazo ni máximo de tres por carta; se mantienen topes técnicos de 1.000 copias por entrada y 100.000 por producto. Cada compra entrega todo el contenido. Solo se ofrece guardarlo también en Mis mazos si tiene hasta 60 cartas totales, 15 de Extra y tres por carta jugable; el motor también impide crear un mazo si no cumple. Un mazo incompleto queda como borrador. La compra es repetible y no consume cajas. Cambiar de tipo, editar o retirar el producto no altera copias ni mazos comprados.
- Las portadas de Sobres muestran cartas de su propio contenido en un abanico que se abre al pasar el mouse o enfocar con teclado. En pantallas táctiles y con movimiento reducido el abanico queda desplegado sin animación. El texto del efecto se muestra en blanco tanto en la ficha como en la vista previa.
- Los sobres sortean entre **todas las copias restantes por igual, sin reposición ni rareza garantizada**. Un último sobre parcial cobra el precio indicado; la pantalla lo advierte.
- Editar presentación, precio o estado conserva existencias. Cambiar contenido exige confirmar reposición. Retirar una expansión no borra cartas adquiridas ni mazos; las ofertas creadas previamente también permanecen.
- La colección mantiene una sola entrada por carta. Dentro de **Tus copias** se desglosan expansión, rareza, cantidad y precio. Las ventas descuentan la edición elegida y pagan su rareza real; los mazos siguen usando el total de copias sin distinguir rareza. La venta rápida elige primero las copias de menor precio y conserva al menos tres por carta.
- Los nombres de la grilla se recortan a una línea para mantener las imágenes alineadas. Pasar el mouse o enfocar con el teclado muestra el nombre completo, atributos y un resumen del efecto; pulsar la carta abre la ficha completa. La ficha prioriza los datos y el efecto, seguidos por las copias y dónde conseguirla. En pantallas táctiles se accede directamente tocando la carta.
- Los sobres personalizados anteriores se interpretan como publicados, manteniendo su stock. Los mazos extra admiten Fusión, Sincronía, Xyz y Enlace; fichas y cartas de habilidad no se agregan a mazos.

### Variantes históricas y erratas

Se ofrecen variantes separadas para las cuatro erratas funcionales ya documentadas: Sangan, Bruja del Bosque Negro, Tortuga Catapulta y Se Aproxima la Oscuridad. El ID original conserva su efecto histórico y sus copias; el ID con sufijo `:errata` representa el efecto actual y muestra una **E en un círculo**. Comparten ilustración, no cantidades. Se pueden seleccionar explícitamente en productos y listas; importar una edición oficial no duplica automáticamente sus cartas. El máximo general de tres copias se cuenta entre ambas variantes. Las restricciones adicionales siguen configurándose por variante.

No es un historial exhaustivo de erratas. Cuando cambia la versión de YGOPRODeck, el chequeo diario conserva diferencias de efecto como pendientes de revisión, visibles para administradores en **Base de datos → Variantes y revisión de erratas**. Un cambio de redacción no crea automáticamente una variante funcional. El efecto histórico documentado no se sobrescribe. La traducción de una variante actual solo se aplica si corresponde a su texto inglés vigente.

La colección muestra una entrada por variante sin etiquetas ni colores de rareza. Al abrir la ficha, **Tus copias** resume cantidades por rareza y conserva el desglose por expansión y formato.

### Actualización diaria automática

El servidor Nuxt revisa el catálogo y las traducciones automáticamente cada 24 horas, sin intervención del chat ni recompilaciones diarias. Al arrancar comprueba si corresponde actualizar; mientras sigue encendido verifica el vencimiento cada hora. Si estuvo apagado, realiza el chequeo pendiente al volver a iniciarse.

Consulta `checkDBVer.php` de YGOPRODeck y descarga el catálogo completo cuando cambia su versión. Revisa YAML Yugi y CDBEsp todos los días, incluso si no hay cartas nuevas en inglés. Conserva cartas ausentes de una descarga posterior, traducciones anteriores y fichas clásicas. Una carta sin traducción sigue en inglés con «Traducción pendiente». Las altas aparecen en Base de datos; publicar expansiones sigue siendo la forma de habilitarlas en el juego.

Guarda catálogo, español, versión, fecha del último chequeo y errores en `.data/catalog/snapshot.json`. Las respuestas se validan antes del reemplazo atómico. Si falla una fuente, conserva su última copia válida y puede actualizar la otra; reintenta en el siguiente chequeo diario. Los fallos quedan registrados también en la salida del servidor (`.data/server.log` con el iniciador de Windows). Una copia persistida ilegible utiliza el catálogo incluido en la compilación como respaldo.

La página obtiene los datos mediante `/api/catalog/cards` y `/api/catalog/es`; las imágenes nuevas usan el índice actualizado. Las novedades se ven al abrir o recargar la página después de completar el chequeo. Las pestañas ya abiertas mantienen su catálogo hasta recargarlas.

Requiere Node.js 24, Internet, un único proceso Nuxt activo y almacenamiento persistente y escribible en `.data`. El volumen Docker documentado abajo conserva tanto las imágenes como las actualizaciones. No funciona en una publicación exclusivamente estática ni en un servidor que se suspende permanentemente cuando no hay visitas. La configuración histórica de `.openai/hosting.json`, que publica `dist/`, no ejecuta este servidor.

Actualizar manualmente la copia incluida en futuras compilaciones, sin tocar el progreso:

Para forzar un chequeo de los datos persistidos, detener el servidor, ejecutar `npm run catalog:check` y volver a iniciarlo. El chequeo automático no requiere estos pasos. Los comandos siguientes actualizan las copias de respaldo incluidas en la compilación:

```sh
npm run catalog:sync
npm run catalog:spanish
npm run build
```

La sincronización requiere Internet y valida la respuesta completa antes de reemplazar archivos. Los metadatos se sirven localmente; no se consulta la API de cartas en cada visita. Las imágenes nuevas se descargan al mostrarlas y se guardan en `.data/card-images/`, con deduplicación y un máximo de cuatro inicios de descarga por segundo por proceso. Las siguientes visitas usan la caché; una imagen no disponible muestra el reverso con una aclaración accesible. Se necesita Internet para imágenes todavía no almacenadas y un directorio `.data` escribible. No se han descargado anticipadamente todas las ilustraciones. Mantener un único proceso o compartir una caché persistente al desplegar.

## Archivo de expansiones oficiales

**Expansiones → Oficiales TCG** (`/expansiones`) guarda el listado de productos del endpoint `cardsets.php` de YGOPRODeck. La importación del 25/09/2026 contiene **1.035 productos: 1.009 clasificados como TCG y 26 Speed Duel**. Incluye expansiones, mazos, latas y promociones; es la cobertura de esa fuente, no una auditoría exhaustiva del catálogo de Konami. Speed Duel se identifica por el nombre publicado y se muestra con un filtro separado. Los cuatro productos sin fecha se conservan al final del orden cronológico.

El archivo permite buscar por nombre, filtrar año y formato y ordenar por fecha ascendente, descendente o nombre. Se guarda en `data/catalog/sets.json` como respaldo de compilación y en `.data/catalog/snapshot.json` para el servidor. Se sirve mediante `/api/catalog/sets` y se revisa todos los días junto a cartas y español, incluso si no cambia la versión de cartas; un fallo conserva el listado anterior. `npm run catalog:sets` actualiza el listado y la copia persistida manualmente (detener y volver a iniciar el servidor alrededor de ese comando).

**Preparar** cruza el nombre exacto de la edición con `card_sets` del catálogo de cartas y carga el editor. Los nombres identifican productos porque distintos productos pueden compartir código. El contador muestra cartas distintas vinculadas; el total original `num_of_cards`, que puede incluir variantes y reimpresiones, se conserva en los datos. Los cinco productos sin cartas vinculadas se muestran como «Sin contenido» y no se importan vacíos.

La importación es una plantilla de sobres con una copia por carta distinta, precio inicial de 5 monedas y hasta 5 cartas por sobre, todos editables. Conserva las ediciones y rarezas originales en las fichas; el juego usa una rareza por carta: primera compatible con las cinco admitidas, o Común si ninguna lo es. La pantalla explica esta conversión. No reproduce colación, probabilidades ni multiplicidades de productos físicos; incluso los mazos del archivo se preparan como una selección para sobres. Publicar es explícito y no otorga cartas. La referencia oficial se conserva en guardados y respaldos, sin modificarla cuando el listado se actualiza.

**Mis creaciones** (`/especiales`) mantiene el editor administrativo de productos propios y solo lista esos productos; el archivo oficial permite retomar las publicaciones importadas. En **Sobres** las oficiales y las creaciones propias tienen grupos separados. Las cajas clásicas conservan sus reglas. Las publicaciones y existencias se comparten desde PostgreSQL; el progreso pertenece a cada cuenta y el archivo de referencia se mantiene en el servidor.

## Formatos, listas de permitidas y banlists

En **Listas y reglas**, cada formato tiene una whitelist: las cartas ausentes o con límite 0 no se pueden agregar a sus mazos; 1, 2 y 3 son máximos de copias. Los botones guardan al instante. Se puede buscar en todo el catálogo o incorporar una expansión completa (oficial o local), sin entregar copias ni publicar productos y sin sobrescribir límites previos. Oficial empieza con las cartas clásicas y, al migrar guardados, con las cartas que ya estaban en juego. No es una banlist competitiva de Konami ni se descarga automáticamente una lista oficial de restricciones.

Cada producto guardado pertenece a un formato. Al publicar, sus cartas nuevas se agregan a la whitelist con límite 3, respetando límites ya definidos, incluidos los 0. Para usar un producto guardado en otro formato se duplica: no se trasladan sus existencias ni las copias adquiridas. El archivo oficial permite preparar una edición por formato. La consulta diaria del archivo de expansiones continúa y no altera productos publicados ni reglas compartidas.

**Colección** permite ver todos los formatos o uno solo. **Mis mazos** permite elegir el formato y muestra únicamente sus mazos y copias; la misma carta adquirida en otro formato no sirve como sustituto. Cada lote conserva formato, expansión y rareza incluso al retirar el producto. Las ventas protegen los mazos y calculan excedentes por carta y por formato. La tienda de cartas sueltas pertenece a Oficial y no vende cartas excluidas de su whitelist. Cada cuenta tiene un único saldo de monedas para todos sus formatos; el saldo no se comparte entre usuarios.

Las **banlists adicionales** permiten elegir estilo individual o **Speed Duel · cupos compartidos**. En el individual, 0 prohíbe, 1 y 2 limitan por carta y 3 elimina la restricción. En el compartido, las cartas marcadas 1, 2 o 3 forman grupos cuyo total de copias entre Main y Extra no puede superar ese número; «Libre» elimina la restricción y no equivale a Limitada 3. La banlist nunca habilita cartas excluidas del formato. Cambiar de estilo conserva 0/1/2 y elimina entradas 3 para no confundir libre con un grupo compartido.

En **Mis mazos → Reglas del nuevo mazo**, elegir **Speed Duel** aplica 20–30 principales y hasta 6 de Extra; Estándar conserva 40–60/15. Cada mazo guarda su regla independientemente de whitelist y banlist. Un cambio que exceda los máximos se rechaza sin retirar cartas. Los mínimos se muestran como borrador. No se incluyen Side Deck ni habilidades, no se verifica el sello físico Speed Duel ni se descarga una banlist competitiva. El administrador define las cartas del formato. Referencia: [Konami, reglas Speed Duel](https://www.yugioh-card.com/en/events/ycs-faqs/).

En **Mis mazos**, cada mazo guarda su propia selección de banlist. Los límites cuentan todas las rarezas de una carta. La biblioteca muestra las copias permitidas y bloquea agregados por encima del límite, tanto por botón como por arrastre. Cambiar de lista o editarla conserva el mazo y señala conflictos; quitar cartas sigue permitido. Cumplir la banlist no sustituye los límites de tamaño y de colección. Eliminar una lista requiere confirmación y deja sus mazos sin banlist, sin borrar cartas.

Las listas y su asignación a mazos se guardan automáticamente y viajan en el respaldo general. Los guardados anteriores sin listas siguen funcionando; referencias rotas y límites inválidos se rechazan sin sobrescribir el progreso.

## Conservar el progreso

La tienda entrega siempre copias comunes no vendibles. Cada oferta permite editar su precio y stock en **Editar tienda**; sin precio individual usa el valor de compra Común como predeterminado. Las copias con origen Tienda (también compras anteriores que ya registraban ese origen) quedan bloqueadas para venta individual y rápida, y no cuentan para el umbral de tres copias vendibles. Las rarezas históricas ya adquiridas no se cambian. Las copias de otros orígenes conservan su valor y se pueden vender respetando los mazos guardados.

Los códigos de edición de cartas ya no se muestran ni se usan en búsquedas, desempates u ordenamientos de la colección. El editor tampoco pide un código. Se conservan metadatos de origen y compatibilidad de las cajas antiguas; la identidad funcional sigue siendo el ID de carta, no su código impreso.

Se lee la clave histórica `dragon-vault-boxes-v4` sin borrarla ni modificarla; los guardados nuevos viven en PostgreSQL. El esquema de respaldo es v7 y admite respaldos v1–v7. Los mazos sin regla explícita conservan Estándar y las banlists sin estilo conservan límites individuales. El progreso anterior a v6 queda en Oficial sin perder cantidades, productos, mazos ni monedas. Antes de v5 no se registraban procedencia ni rareza: esas copias quedan **sin identificar**, sin inventar el origen. El administrador puede identificarlas desde la ficha; esto no cambia formato, cantidades ni saldo. Las adquisiciones nuevas conservan edición, formato y rareza incluso después de editar o eliminar el producto. El desglose se valida, exporta y conserva al deshacer el borrado de colección.

Si se ejecuta en el mismo origen (protocolo, dominio y puerto), Nuxt puede leer el guardado anterior. Un archivo `file://`, otro puerto o dominio tiene almacenamiento diferente: en la versión anterior usar **Guardar / cargar → Descargar copia**, y cargar ese JSON en Nuxt. Los respaldos v7 no son compatibles con versiones anteriores de la aplicación.

Con la primera cuenta administradora, abrir **Guardar / cargar → Importar progreso de este navegador** o elegir un respaldo JSON. La importación requiere confirmación: reemplaza el progreso de esa cuenta y también las cajas, ofertas, productos y reglas compartidas. Conserva las colecciones de otros usuarios y rechaza copias que quiten formatos que ellos usan. Hacer la primera migración antes de invitar jugadores. La copia del navegador queda intacta. Todos pueden exportar; solo administradores pueden importar.

El servidor calcula sorteos, precios y saldos y guarda cada operación en una transacción PostgreSQL antes de revelar cartas. Un bloqueo de fila sobre el mundo compartido impide vender dos veces la última copia. Los editores administrativos usan revisiones para rechazar sobrescrituras de estados viejos. La implementación conserva los motores existentes y guarda progreso personal y estado compartido en JSONB; un único bloqueo global es apropiado para el grupo de amigos actual. Si aumenta la concurrencia, separar el stock por producto. Las pantallas actualizan existencias al navegar y después de cada operación; no hay notificaciones en tiempo real. Ante una respuesta de red incierta, revisar el estado antes de repetir la compra. Hacer backups de PostgreSQL para conservar todas las cuentas, hashes, sesiones y progresos; el JSON descargado por una cuenta no sustituye el respaldo completo de la base.

## Código

- `app/components/`: pantallas y controles reactivos Vue; diálogos nativos con foco y Escape.
- `app/pages/`: navegación Nuxt, rutas directas y validación de secciones.
- `app/plugins/vault.client.js`: sesión, estado confirmado por servidor, respaldos y llamadas de operaciones.
- `server/lib/`: autenticación, PostgreSQL, separación de estado y acciones con permisos.
- `server/api/auth/`, `server/api/admin/`, `server/api/vault/`: sesiones, usuarios y economía autenticada.
- `app/utils/`: motores de cajas, economía, filtros, validación y acciones. Se reutilizaron las reglas originales como módulos ES, sin variables globales de navegador.
- `app/data/` y `public/assets/`: catálogo, mazos iniciales e imágenes originales.
- `data/catalog/`, `scripts/sync-catalog.mjs` y `server/`: catálogo completo, actualización e imágenes con caché local.
- `app/assets/css/`: estilos originales, integrados con Nuxt UI y Tailwind.
- `dist/`: copia anterior conservada para recuperación y comparación de reglas y datos.

## Verificar

```sh
npm test
npm run build
```

Para integración, usar **una base aislada cuyo nombre termine en `_test`**, con `DATABASE_URL`, `JWT_SECRET` y `APP_ORIGIN=http://127.0.0.1:3107`, y arrancar la compilación con ese entorno (`PORT=3107`, `HOST=127.0.0.1`). Ejecutar `npm run test:auth:integration` y `npm run test:auth:browser` con el mismo entorno. Las pruebas crean y eliminan cuentas ficticias y modifican el mundo compartido de esa base; nunca apuntarlas a producción. Los tests de navegador usan Chrome instalado en Windows; en otros sistemas ejecutar `npx playwright install chromium`.

Se verifica compatibilidad de respaldos, reglas originales, bcrypt, vencimiento y manipulación de JWT, permisos HTTP, cookies, origen de solicitudes, login limitado, aislamiento de cuentas, compras concurrentes, importación, login móvil, gestión de usuarios y variantes de erratas con inventarios separados. `tests/browser/` y `npm run test:browser` conservan las pruebas anteriores del prototipo local: sus fixtures de localStorage necesitan adaptación a cuentas para ejecutarse contra esta versión. Las pruebas nuevas están en `tests/integration/` y `tests/auth-browser/`.

## Documentos y control de versiones

`README.md` es la guía técnica vigente; `LEEME.txt`, la guía rápida; `PRODUCT.md`, el alcance funcional; `DESIGN.md` y `.impeccable/surfaces/`, las decisiones visuales y de interacción. Los documentos históricos de banlists remiten a las reglas actuales. Los archivos `card-back-source.txt` conservan la procedencia de las imágenes y no describen versiones de la aplicación.

El repositorio usa la rama `main` y el remoto `origin`: [maximilianodeppe-coder/Dragon_Vault](https://github.com/maximilianodeppe-coder/Dragon_Vault). El commit inicial reúne el código, los recursos, las pruebas y la documentación. `.gitignore` excluye `.env` y sus variantes privadas (conserva `.env.example`), `.data/`, `.tools/`, `.openai/`, dependencias, compilaciones, capturas de revisión y resultados de pruebas. `dist/` conserva el prototipo histórico usado en comparaciones y pruebas, no la compilación actual. Git no sustituye los backups de PostgreSQL ni traslada la cuenta administradora. Publicar el repositorio tampoco despliega la aplicación: una instalación nueva requiere configurar PostgreSQL y sus propias credenciales.

## Docker

### Docker Compose (app y PostgreSQL)

Desde una copia de este repositorio, copiar `compose.env.example` como `.env.compose`. No reemplazar el `.env` de la instalación local. Completar `POSTGRES_PASSWORD` y `JWT_SECRET` con dos valores diferentes generados con `openssl rand -hex 32` (o `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`). Usar hexadecimal para la contraseña de PostgreSQL, porque se incorpora en la URL de conexión. Definir `ADMIN_PASSWORD` con al menos 12 caracteres y hasta 72 bytes; envolver el valor entre comillas simples si contiene `$` o `#`.

```sh
docker compose --env-file .env.compose config --quiet
docker compose --env-file .env.compose pull app db
docker compose --env-file .env.compose run --rm --build setup npm run db:admin
```

El comando de administrador se ejecuta una sola vez en una base nueva y también crea las tablas. Quitar `ADMIN_PASSWORD` de `.env.compose` después, y arrancar:

```sh
docker compose --env-file .env.compose up -d --build
docker compose --env-file .env.compose ps -a
docker compose --env-file .env.compose logs --tail=100 app setup
```

Abrir `http://127.0.0.1:3000` e ingresar con la cuenta recién creada. Si el puerto está ocupado por la instalación local, cambiar tanto `APP_PORT` como el puerto de `APP_ORIGIN`. `setup` debe finalizar con código 0: es una tarea de preparación, no un servicio permanente. Compose espera a que PostgreSQL esté listo y las tablas preparadas antes de iniciar la app. La imagen de la app se descarga de GHCR; `setup` se construye desde el Dockerfile del repositorio, por lo que se necesita el checkout completo. Para versiones fijas, usar en `IMAGE_TAG` el SHA del mismo commit del checkout.

Si GHCR rechaza la descarga de un paquete privado, ejecutar `docker login ghcr.io -u maximilianodeppe-coder` e ingresar un token con `read:packages` como contraseña, o permitir descargas públicas desde la configuración del paquete.

Para un servidor público, configurar `APP_ORIGIN=https://tu-dominio` sin barra final y un proxy HTTPS en el host hacia `127.0.0.1:3000`. Este Compose publica el puerto solo en loopback y no configura dominio ni certificados. PostgreSQL no publica puertos. Los volúmenes `postgres-data` y `app-data` conservan base y caché; `docker compose --env-file .env.compose down` los conserva, pero **no usar `down -v` si se quieren preservar los datos**. Esta base es independiente de la instalación local: no incluye sus cuentas ni su progreso. Cambiar `POSTGRES_PASSWORD` en el archivo no cambia la contraseña de una base ya inicializada.

Para actualizar, respaldar PostgreSQL, actualizar el checkout, descargar la imagen con `docker compose --env-file .env.compose pull app` y ejecutar nuevamente `docker compose --env-file .env.compose up -d --build`. No repetir `db:admin`. Las tablas se preparan con el comando idempotente `db:migrate` de la etapa `setup`. La ejecución completa debe verificarse en un host con Docker; esta computadora no dispone de Docker.

### Publicar en GHCR

El workflow `.github/workflows/docker.yml` construye y publica la imagen en cada push a `main`. También puede ejecutarse desde **Actions → Publicar imagen Docker → Run workflow**, seleccionando `main`. Usa el `GITHUB_TOKEN` automático de GitHub con permiso de escritura de paquetes; no requiere guardar un token personal en el repositorio.

La imagen es `ghcr.io/maximilianodeppe-coder/dragon_vault:latest`; cada publicación conserva además una etiqueta con el SHA completo del commit. El resultado de la construcción y publicación se consulta en [GitHub Actions](https://github.com/maximilianodeppe-coder/Dragon_Vault/actions/workflows/docker.yml). El paquete puede requerir autenticación para descargarlo; para permitir descargas anónimas, cambiar explícitamente su visibilidad a pública en la configuración de GitHub Packages.

```sh
docker pull ghcr.io/maximilianodeppe-coder/dragon_vault:latest
```

Publicar la imagen no inicia un servidor público. El servidor de destino necesita PostgreSQL, las variables privadas de entorno y HTTPS indicados abajo. Las cuentas, contraseñas y progreso locales no se incluyen en la imagen. El workflow publica la imagen final de la aplicación; la etapa `setup` se construye por separado para preparar la base.

### Construir y ejecutar

```sh
docker build -t dragon-vault .
docker build --target setup -t dragon-vault-setup .
docker run --rm --env-file .env dragon-vault-setup npm run db:admin
docker run --rm --env-file .env -p 127.0.0.1:3000:3000 -v dragon-vault-cache:/app/.data dragon-vault
```

`DATABASE_URL` debe apuntar a PostgreSQL accesible desde el contenedor, no al localhost del host. La imagen `setup` sirve para migrar y crear la primera cuenta; la imagen final ejecuta Nuxt como usuario sin privilegios. Tras crear el administrador, quitar `ADMIN_USERNAME` y `ADMIN_PASSWORD` del archivo entregado al contenedor. En migraciones posteriores usar `dragon-vault-setup npm run db:migrate`. Exponer la aplicación detrás de un proxy HTTPS con el dominio de `APP_ORIGIN`; limitar tamaño de solicitudes y conexiones también en ese proxy. El volumen `.data` conserva catálogo e imágenes; PostgreSQL necesita su propio almacenamiento y backups. No se ha desplegado ni conectado una base de producción. Docker debe verificarse en el servidor de destino; esta máquina no dispone de Docker.
