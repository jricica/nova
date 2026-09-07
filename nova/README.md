# NOVA — guía rápida

NOVA es un espacio de escritura con páginas para proyectos, voz, fuentes y perfil. El frontend y el backend funcionan en Sites; la asistencia con LLM todavía no está conectada.

Para usarlo: abre el sitio, inicia sesión o crea tu usuario y entra a **Inicio**, configura tu nombre y tu voz, crea un proyecto y añade un capítulo. **Guardar** crea una versión en tu cuenta. La copia local de recuperación protege frente a cierres accidentales, pero no reemplaza ese botón.

Para continuar el desarrollo desde GitHub, abre la carpeta `nova/` del repositorio. Aquí están la aplicación, el backend, las migraciones y las pruebas. Los detalles técnicos y la conexión futura del proveedor están debajo.

## Cuenta propia e interfaz renovada

NOVA ahora tiene `/login`, `/registro`, `/recuperar` y `/seguridad`. El registro utiliza **usuario y contraseña**, sin pedir correo. Guarda el código de respaldo que aparece al registrarte.

**Si ya tenías proyectos:** entra primero con ChatGPT y configura usuario/contraseña desde Seguridad. Así conservas tu espacio original. Crear otra cuenta desde cero produce un espacio nuevo.

El acceso con contraseña funciona en el backend sin un proveedor externo de autenticación. Mientras el Site esté privado, su capa de acceso seguirá exigiendo ChatGPT antes de mostrar NOVA: abrir el registro externo requiere cambiar la audiencia del Site a público, conservando protegidos los proyectos. Esa apertura no forma parte de una mera publicación de código.

Se añadieron entrada de marca, transiciones breves, diálogos de recuperación/seguridad, guía rápida, estados de sesión y Ctrl+S/⌘S en el editor. Las animaciones respetan la preferencia de movimiento reducido. No hay GIFs pesados ni reproducción permanente en el editor.

Detalles, seguridad y migración: [docs/authentication.md](docs/authentication.md). El apartado técnico anterior que sigue debajo describe la versión inicial; la autenticación de este documento reemplaza el acceso directo mediante cabeceras.

## Actualización del piloto

- `/inicio`: cuatro pasos calculados con datos reales y proyectos recientes. El progreso persiste porque depende del perfil, la aprobación de voz, los proyectos y los capítulos guardados.
- `/feedback`: respuestas privadas en D1, validación, límite de 50 por usuario e idempotencia por identificador. No envía emails ni crea tickets externos. El propietario puede analizar las respuestas mediante acceso administrativo a la base; no hay panel global de feedback expuesto a participantes.
- `/acceso`: instrucciones del acceso autenticado. No modifica la lista de permisos de Sites. Hace falta habilitar la cuenta del cliente antes de compartirle el piloto.
- El editor ofrece recuperar, descargar o descartar una copia local antes de seguir editando. Mantiene el control de versión del servidor y muestra los errores de guardado. Las copias duran hasta 7 días, con máximo 20 por navegador; la limpieza ocurre al leer/escribir copias, no mediante borrado programado. Pueden permanecer después de cerrar sesión. La cuenta en la clave evita mezclar usuarios en la interfaz, pero no cifra el almacenamiento del dispositivo.
- El contexto desplegable de proyecto muestra exclusivamente el perfil aprobado, las preferencias activas generales/de ese proyecto y hasta dos muestras de su género. Las instrucciones de proyecto se muestran aparte. No se ejecuta un modelo.
- El tema `app/pilot.css` añade inicio editorial, navegación oscura y distribución adaptable sin quitar las rutas existentes.
- Migración nueva: `0003_cheerful_sally_floyd.sql`. No modificar migraciones ya aplicadas.
- QA: pruebas de API D1/R2, recuperación local y TypeScript. La revisión de navegador se intentó pero el entorno bloqueó la vista previa; desktop, móvil y logout requieren comprobación visual antes de presentar al cliente.

## Documentación técnica

Private, multi-page editorial workspace. Runs on Vinext/React and Cloudflare Workers with D1 metadata and R2 text sources. The existing Sites project identity is retained in `.openai/hosting.json`.

## Product

- `/`: short landing; `/como-funciona`, `/confianza`: product information.
- `/proyectos`: create, search and filter projects.
- `/proyectos/:id`: chapter editor with explicit saves, revision history, conflict detection and source search.
- Project subpages: `/fuentes`, `/memoria`, `/estilo`, `/configuracion`.
- `/estadisticas`: saved words, chapters, sources, memory, goals and 30-day revision counts.
- `/ajustes`: account/storage/provider state.

NOVA authenticates visitors using server-side sessions. All resource reads and writes check project ownership. Sites dispatch may add a separate audience gate. Browser writes require matching Origin. The optional ChatGPT callback depends on trusted Sites dispatch and is disabled outside `.chatgpt.site`; native username/password does not trust those headers.

## Persistence

Schema: `db/schema.ts`. Generated migrations: `drizzle/`. D1 stores projects, chapters, versions, source metadata, text passages and memory. R2 stores the complete uploaded/pasted source text. UI state is not the authoritative store. No provider or API key is configured.

Limits: 100 projects per user; 300 chapters and 5 million manuscript characters per project; 100 sources and 10 MB source text per project; 500,000 characters per source; 500 memory entries. Text/Markdown uploads use UTF-8. PDF and DOCX parsing are not implemented. Dates entered in memory are author-owned labels; automatic chronology interpretation is not implemented.

## AI integration seam

Replace the disabled implementation of `WritingProvider` in `lib/ai-provider.ts` with a server-only provider adapter. No OpenAI-specific requests, credentials or dependencies are present. Do not place secrets in public or client-prefixed environment variables. Configure hosted values using Sites environment management when integrating.

`POST /api/nova/projects/:id/context` accepts `{chapterId, action: 'continue'|'rewrite'|'verify', instruction}` and produces actual context from the saved chapter, style rules, sample, memory and retrieved passages. It returns explicit context limits and `retrieval: 'lexical'`.

`POST /api/nova/projects/:id/ai` validates identity and ownership; returns HTTP 503 with `AI_NOT_CONFIGURED` until the adapter is available. Once supplied, returns a proposal plus the chapter version it was based on. Do not automatically overwrite the manuscript. Wire explicit acceptance into the editor using the existing version-checked chapter PUT. Usage accounting, provider cancellation/timeouts, semantic embeddings and model verification remain part of API integration; the current UI accurately describes them as unavailable. Sources are untrusted content, not model instructions; a source match does not establish factual support.

## API

Under `/api/nova`:

- `GET /status`, `GET /stats`.
- `GET/POST /projects`; `GET/PATCH/DELETE /projects/:id`.
- `POST /projects/:id/chapters`; `GET/PUT/DELETE /projects/:id/chapters/:chapter`.
- `GET /projects/:id/chapters/:chapter/revisions` (last 40). PUT requires the current integer `version`; conflict returns 409.
- `POST /projects/:id/sources`; `GET/DELETE /projects/:id/sources/:source`.
- `GET /projects/:id/search?q=...`: accent-insensitive lexical retrieval, up to 12 passages.
- `POST /projects/:id/memory`; `PUT/DELETE /projects/:id/memory/:entry`.
- `GET /projects/:id/export` for Markdown; `?format=json` includes project, chapters, source content and memory. No history, no JSON import endpoint.

Deletion removes metadata and attempts R2 cleanup; cleanup errors are logged. No application trash/restore feature exists. Project archive is reversible.

## Development and verification

Keep the supplied lockfile. `npm run db:generate` generates new immutable migration files. Use Sites build/hosting skills for deployment; platform supplies D1 and R2 resources. `npm run build` compiles the Worker and browser assets. `node --test tests/nova-api.test.mjs` runs against Miniflare D1/R2, testing persistence, access isolation, cross-origin rejection, conflicts, search, style/memory context, metrics, exports, cascades and object cleanup without contacting an LLM.

## Perfil de autor y memoria guiada

- `/mi-voz`: cuatro pasos con audiencia/objetivo, tono y ritmo, muestras de texto, ejercicios de una biblioteca de plantillas y aprobación explícita del perfil. Permite guardar borrador y retomar en otra sesión. El resumen se construye de forma determinista a partir de las respuestas; no infiere estilo ni genera prosa con IA.
- `/mi-memoria`: preferencias generales o por proyecto, con edición, activación/desactivación y eliminación al guardar. Son declaradas por el usuario, no hechos verificados. Los datos de ficción siguen en la memoria de cada proyecto.
- Se admiten 12 muestras por usuario, cada una de hasta 30.000 caracteres. TXT/MD UTF-8 o texto pegado. El habla se admite como transcripción pegada; no hay grabación, transcripción automática ni lectura de PDF/DOCX.
- D1 guarda perfiles versionados y metadatos; R2 guarda el texto de las muestras. Las escrituras del perfil usan comparación de versión: un guardado obsoleto devuelve 409 y conserva el borrador en la interfaz. El origen y la identidad se validan en el backend; los proyectos referidos deben pertenecer al usuario.
- `GET/PUT /api/nova/author` carga y guarda el perfil. `POST /api/nova/author-samples` guarda una muestra; `GET/DELETE /api/nova/author-samples/:id` la consulta/elimina.
- El contexto existente incluye únicamente perfiles aprobados, preferencias activas globales o del proyecto y hasta dos muestras escritas del mismo género (4.000 caracteres por muestra), además del ejercicio del género correspondiente (hasta 4.000 caracteres). Las muestras de habla nunca se mezclan automáticamente con escritura. Los borradores de perfil no se usan como preferencias aprobadas.
- Cambiar el perfil y guardar borrador requiere aprobarlo nuevamente. Guardar cambios explícitos de memoria conserva la aprobación existente. Las muestras se guardan por separado y quedan disponibles como referencias aportadas por el autor.
- Al conectar el proveedor, deberá aplicar precedencia explícita: instrucción actual, reglas de proyecto y luego preferencias generales. Textos y recuerdos son datos, nunca instrucciones con privilegios de sistema. No se ha conectado ni entrenado un LLM y no hay llamadas externas ni credenciales nuevas.
- La prueba de API cubre persistencia, aislamiento de perfiles/muestras entre usuarios, origen, conflictos de versión, alcance de proyecto, exclusión de recuerdos desactivados, borradores y eliminación de muestras/recuerdos del contexto.

## Cuenta y presentación profesional

- `/perfil` administra nombre visible, ocupación, biografía, tipografía y tamaño del manuscrito y meta inicial de proyectos. D1 conserva estos datos por usuario con control de versión; no modifica la identidad de ChatGPT ni el perfil de voz del autor.
- `GET/PUT /api/nova/account` obtiene/actualiza la cuenta autenticada. El servidor obtiene el correo y el nombre de identidad de las cabeceras de sesión, no del formulario. Los valores inválidos devuelven 400 y los guardados obsoletos, 409.
- El menú y la barra lateral cierran la sesión de NOVA mediante POST. La sesión es una cookie HttpOnly; no se simula en localStorage. La política de acceso del Site es una capa aparte.
- El contexto de cuenta compartido aplica tipografía/tamaño al manuscrito y la meta al formulario de proyectos nuevos. La biografía no se envía automáticamente al contexto del LLM.
- `/ajustes` organiza cuenta, personalización, funciones y exportación. `/ayuda` documenta el guardado manual, historial, formatos, conflictos y cierre de sesión. Hay un estado de desconexión y una frontera de errores del espacio de trabajo.
- La biblioteca conserva sus acciones y añade ordenación por actualización, título o palabras. La interfaz usa una presentación de lista adaptable a móvil con cifras obtenidas de los proyectos reales.
- El tema se define en `app/professional.css`, sobre los componentes existentes: blanco, azul tinta, controles consistentes, navegación de cuenta y tipografía editorial solo donde corresponde. Incluye enlace para saltar al contenido, foco visible, tamaños táctiles y preferencias de movimiento reducido.
- Verificación: TypeScript, compilación de producción y pruebas de API con D1/R2 locales, incluyendo persistencia/aislamiento de cuenta, validación, origen y versiones. No se realizaron pruebas de navegador ni del cierre de sesión de producción.
