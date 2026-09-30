# Acceso y usuarios — Operate

Extensión del sistema existente, implementada y revisada en escritorio y móvil. Conserva azul noche, oro antiguo, Marcellus y DM Sans; no introduce una identidad ni tokens nuevos.

`/login` usa usuario y contraseña, campos etiquetados y estados de espera/error. El formulario se dispone junto al texto de presentación en escritorio y debajo en móvil. No hay registro público ni recuperación por correo.

`/usuarios` es exclusivo del administrador: creación de cuentas, asignación de rol, bloqueo/desbloqueo y recarga de monedas. Las filas y formularios se apilan en pantallas pequeñas. No se puede bloquear la propia cuenta ni quitarse el rol de administrador; el servidor impide que desaparezca el último administrador activo.

Cada fila incorpora «Administrar colección». La vista identifica la cuenta en el título y permite volver a Usuarios o actualizar sus datos. Se opera desde la sesión administrativa sin necesitar la conexión del titular ni bloquear su acceso. «Entregar cartas» busca por nombre en español o inglés y permite elegir formato, rareza y cantidad; muestra la carta seleccionada y registra el origen «Entrega administrativa». La entrega advierte si la carta no está permitida en el formato, sin modificar sus reglas.

«Colección completa» ofrece búsqueda, filtro por formato y páginas de 20 cartas, con cantidades editables por origen y rareza. Reducir una cantidad, incluido llevarla a cero, requiere confirmación y avisa que se ajustarán los mazos sin entregar monedas. «Vaciar colección» ocupa una sección separada al final y exige escribir el nombre de la cuenta; explica que elimina todas las cartas y vacía los mazos, conservando sus nombres, la cuenta y las monedas. Los cambios invalidan el deshacer anterior. Los estados de espera, éxito y error se anuncian; ante conflicto de revisión se recarga la colección para revisar y repetir la operación.

Esta ampliación reutiliza botones, campos, tipografías, paleta y separadores del sistema existente. En escritorio, los campos de entrega comparten una fila y cada lote alinea cantidad y guardado; hasta 700px, los campos y metadatos se apilan. Las capturas `.impeccable/review/admin-collection/desktop.png` (1440px) y `mobile.png` (390px) documentan la entrega, los lotes y la acción destructiva con el contexto de cuenta visible. La revisión final aprobó la extensión sin cambios materiales del sistema visual.

La navegación y las acciones reflejan el rol. Los jugadores consultan reglas y gestionan su propio progreso; los editores, reposiciones e importaciones requieren administrador. Los permisos se validan también en las API. El cierre de sesión identifica al usuario y revoca únicamente la sesión actual.

El JWT dura siete días y se conserva en cookie HttpOnly, SameSite=Strict y Secure bajo HTTPS. Las escrituras de datos se confirman desde PostgreSQL antes de actualizar la pantalla. La importación explica y confirma el reemplazo del progreso propio y del estado compartido; el guardado histórico del navegador se conserva.

La cuenta administradora de esta instalación local ya existe y su acceso fue verificado. Las credenciales permanecen fuera de la documentación y del versionado. La instalación local no equivale a despliegue público.

Las pruebas están en `tests/auth-browser/auth.spec.js` y `tests/integration/auth.mjs`; usan bases aisladas y no deben ejecutarse sobre la base local del usuario. La revisión visual de acceso y usuarios tuvo resultado favorable; no constituye una auditoría de accesibilidad de toda la aplicación.
