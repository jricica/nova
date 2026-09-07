# Autenticación propia de NOVA

## Usar una cuenta existente sin perder proyectos

1. Abre `/login` y elige **Continuar con ChatGPT**.
2. Ve a `/seguridad`, elige un usuario y configura una contraseña.
3. Guarda el código de recuperación que aparece. El acceso independiente usa **la misma identidad interna** y conserva proyectos, voz, muestras, fuentes y memoria.
4. En adelante entra con ese usuario y contraseña.

No crees un usuario nuevo separado si quieres conservar tu cuenta anterior. NOVA no fusiona cuentas por correo. Las cuentas locales nuevas no necesitan email; la recuperación utiliza un código aleatorio privado. No hay recuperación por correo ni envío de emails simulado.

## Funcionamiento

- Registro: nombre visible, usuario único normalizado y contraseña de 12–128 caracteres.
- `lib/auth-core.ts`: hashing scrypt nativo (`N=16384,r=8,p=5`, sal aleatoria de 16 bytes, salida 32 bytes). Esta combinación de menor memoria está contemplada en la [guía de almacenamiento de contraseñas de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). La implementación utiliza [`node:crypto`, compatible con Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/), sin un algoritmo criptográfico propio.
- Cookie `__Host-nova_session`: `HttpOnly`, `Secure`, `SameSite=Lax`, raíz `/`, hasta 30 días. D1 almacena solo el SHA-256 de un token aleatorio de 256 bits. El token nunca se devuelve en JSON ni se guarda en localStorage.
- Todas las APIs de datos resuelven la sesión en el servidor. Las cabeceras de ChatGPT solas **ya no autorizan** la API de NOVA.
- Registro, login y cambios requieren Origin idéntico; JSON limitado a 8 KB. Límites atómicos en D1 por ventana: global, IP, usuario y operación. Es una configuración conservadora para el piloto, no una defensa completa contra abuso distribuido.
- Login valida que la contraseña siga siendo la misma al emitir la sesión. Cambiar/restablecer contraseñas revoca las sesiones anteriores y renueva el código de recuperación; los códigos usados no se reutilizan.
- Recuperación: código aleatorio de 256 bits, hash en D1, revelación única en un diálogo para copiar/descargar. Si se pierde junto con la contraseña y no hay ChatGPT asociado, no hay recuperación automática.
- ChatGPT: inicio mediante POST local con Origin, nonce HttpOnly de diez minutos y navegación superior a la ruta SIWC propiedad del dispatcher. Callback `/auth/chatgpt` consume el nonce una sola vez y usa exclusivamente la identidad que verifica el dispatcher. No se implementa ni reemplaza `/callback`.
- El callback de ChatGPT solo está habilitado en dominios `.chatgpt.site`. Al alojar el código fuera de Sites, se mantiene el acceso de usuario/contraseña; conectar ChatGPT desde otro alojamiento requeriría una integración de identidad verificada apropiada.
- Cerrar sesión en NOVA revoca la sesión de NOVA, no la sesión global de ChatGPT. En equipos compartidos también hay que salir de ChatGPT.
- Recuperación local del manuscrito: las claves nuevas usan el ID estable de NOVA. Al encontrar una copia antigua de la misma cuenta de ChatGPT, se traslada a esa clave sin sobrescribir texto en el servidor.

## Rutas

| Ruta | Función |
| --- | --- |
| `/login`, `/registro`, `/recuperar` | Pantallas públicas a nivel de aplicación |
| `/seguridad` | Credenciales y cierre de todas las sesiones, con sesión requerida |
| `/api/auth/me` | Sesión pública resumida o null; nunca hashes ni tokens |
| `/api/auth/signup`, `/login`, `/recover` | Operaciones de acceso (POST) |
| `/api/auth/credentials`, `/logout`, `/logout-all` | Gestión de credenciales/sesiones (POST) |
| `/api/auth/start-chatgpt`, `/auth/chatgpt` | Inicio POST y retorno GET de SIWC |

Migración: `0004_odd_abomination.sql`. No altera tablas ni propietarios existentes.

## Alojamiento y apertura del registro

El control de acceso de Sites es independiente de la autenticación de NOVA. Mientras el Site siga privado, el dispatcher exige acceso autorizado antes de mostrar incluso `/login`. Para recibir registros externos sin ChatGPT debe autorizarse el cambio de audiencia del Site a **público**. Esto abre la landing y las pantallas de acceso; los proyectos continúan protegidos por sesiones y comprobaciones de propiedad.

No publicar las tablas D1 ni R2 ni habilitar acceso anónimo a las APIs de datos. Al mover el proyecto a otro alojamiento, provisionar D1/R2 o adaptar esos servicios, aplicar las migraciones, servir por HTTPS y mantener las mismas comprobaciones de sesión. El login independiente no convierte automáticamente el backend de Cloudflare en un backend para otro proveedor.

## Verificación

`npm test` ejecuta registro con KDF real en Workers/Miniflare, login inválido/válido, cookies, Origin, revocación, cambio de credenciales, recuperación y consumo único, expiración, límites, aislamiento, rechazo de cabeceras sin sesión y continuidad de proyectos ChatGPT. También ejecuta los tests existentes de datos y borradores.

La vista previa visual sigue sin estar disponible por el bloqueo del navegador del entorno. Verificar en dispositivos reales el autocompletado, el diálogo de recuperación, el flujo SIWC y el comportamiento táctil antes de abrir el piloto a usuarios externos.
