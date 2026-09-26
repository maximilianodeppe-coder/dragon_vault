# Acceso y usuarios — Operate

Extensión del sistema existente, implementada y revisada en escritorio y móvil. Conserva azul noche, oro antiguo, Marcellus y DM Sans; no introduce una identidad ni tokens nuevos.

`/login` usa usuario y contraseña, campos etiquetados y estados de espera/error. El formulario se dispone junto al texto de presentación en escritorio y debajo en móvil. No hay registro público ni recuperación por correo.

`/usuarios` es exclusivo del administrador: creación de cuentas, asignación de rol, bloqueo/desbloqueo y recarga de monedas. Las filas y formularios se apilan en pantallas pequeñas. No se puede bloquear la propia cuenta ni quitarse el rol de administrador; el servidor impide que desaparezca el último administrador activo.

La navegación y las acciones reflejan el rol. Los jugadores consultan reglas y gestionan su propio progreso; los editores, reposiciones e importaciones requieren administrador. Los permisos se validan también en las API. El cierre de sesión identifica al usuario y revoca únicamente la sesión actual.

El JWT dura siete días y se conserva en cookie HttpOnly, SameSite=Strict y Secure bajo HTTPS. Las escrituras de datos se confirman desde PostgreSQL antes de actualizar la pantalla. La importación explica y confirma el reemplazo del progreso propio y del estado compartido; el guardado histórico del navegador se conserva.

La cuenta administradora de esta instalación local ya existe y su acceso fue verificado. Las credenciales permanecen fuera de la documentación y del versionado. La instalación local no equivale a despliegue público.

Las pruebas están en `tests/auth-browser/auth.spec.js` y `tests/integration/auth.mjs`; usan bases aisladas y no deben ejecutarse sobre la base local del usuario. La revisión visual de acceso y usuarios tuvo resultado favorable; no constituye una auditoría de accesibilidad de toda la aplicación.
