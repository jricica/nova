# Revisión del piloto

La compilación y las pruebas automáticas pasan. La vista previa de navegador fue bloqueada por el entorno, por lo que los siguientes escenarios siguen pendientes de ejecución visual. No confundir esta lista con evidencia de pruebas aprobadas.

| Escenario | Resultado esperado |
| --- | --- |
| Entrar con la cuenta autorizada | Inicio muestra el nombre correcto; navegación permite abrir perfil y proyectos. |
| Guardar nombre y preferencias, recargar | Persisten el nombre, tipografía, tamaño y meta. |
| Completar y aprobar Mi voz | Inicio completa ese paso; el proyecto muestra las reglas aprobadas. |
| Crear proyecto desde Inicio | Abre el formulario y luego el manuscrito nuevo. |
| Crear capítulo y guardar | Cambia a “Guardado en tu cuenta”, aumenta la versión y aparece en el historial. |
| Editar sin guardar, salir y volver | Se ofrece recuperación local sin sobrescribir la versión de la cuenta. |
| Recuperar copia local y guardar | Se conserva como nueva versión y deja de ofrecer esa copia local. |
| Editar el mismo capítulo en dos ventanas | Guardar una versión obsoleta muestra conflicto y conserva el texto del editor. |
| Exportar Markdown y JSON | Los archivos contienen capítulos y fuentes correspondientes. |
| Enviar feedback y recargar | La respuesta aparece una vez, en la cuenta que la creó. |
| Cerrar sesión | El dispatcher termina la sesión; el siguiente acceso privado exige autenticación según la sesión de ChatGPT. |
| Cuenta diferente autorizada | No ve proyectos, muestras ni feedback del primer usuario. |
| Móvil a 390 y 768 px | No hay desbordamiento horizontal; navegación, editor y formularios son utilizables. |
| Teclado y lector de pantalla | Foco visible, etiquetas y navegación accesibles; no se pierde acceso a guardar. |

El cliente aún debe ser habilitado por el propietario en los permisos de Sites. La aplicación no concede acceso desde `/acceso`.
