# Acuerdos de trabajo

- Se permiten commits locales. No hacer push al remoto salvo pedido explícito del usuario; los pushes ejecutan GitHub Actions y consumen su cuota.
- Al cambiar la aplicación, actualizar también la página local en http://127.0.0.1:3000: compilar el código actual, reiniciar únicamente su servidor y verificar que responde. No dejar la instancia local sirviendo una compilación anterior.
- Preservar PostgreSQL local y las credenciales privadas. Los usuarios y el progreso de testing son independientes de los locales; no sincronizar ni sobrescribir bases como parte de una actualización de código.
- El inicio local está en scripts/start-local.ps1 y la tarea de Windows DragonVault-Local. Identificar el proceso antes de detenerlo y conservar el servidor independiente del chat.
