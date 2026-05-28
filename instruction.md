Actúa como un Senior Full Stack Engineer, Software Architect y Database Architect experto en SaaS multi-tenant, PostgreSQL/Supabase, diseño de bases de datos relacionales normalizadas, optimización de consultas, seguridad, auditoría, Entity Relationship Modeling, UI funcional y buenas prácticas de implementación.

Tengo un demo visual ya levantado de un CRM para iglesias. El proyecto ya existe localmente en Visual Studio / VS Code. El diseño visual está avanzado y NO quiero rediseñarlo desde cero. Ahora necesito convertirlo en un sistema funcional conectado a Supabase.

IMPORTANTE:
Antes de escribir código o crear tablas, debes analizar quirúrgicamente el proyecto actual, módulo por módulo, archivo por archivo y flujo por flujo. No asumas la arquitectura. Primero inspecciona la estructura real del sistema.

OBJETIVO GENERAL:
Crear un plan completo de implementación para hacer funcional todo el CRM de iglesias, incluyendo:
- análisis del sistema actual
- levantamiento de requerimientos por módulo
- diseño de base de datos relacional
- normalización de entidades
- relaciones entre tablas
- índices para consultas frecuentes
- reglas de integridad referencial
- migraciones para Supabase/PostgreSQL
- seed data inicial
- servicios/lógica de aplicación
- conexión de UI existente con datos reales
- acciones funcionales para botones, tablas, filtros, modales, drawers, formularios, dashboards y reportes

CONTEXTO DEL PRODUCTO:
El sistema es un CRM administrativo para iglesias pequeñas y medianas en Estados Unidos, especialmente iglesias hispanas o bilingües.

El CRM debe permitir a una iglesia administrar:
- personas
- miembros
- visitantes
- donantes
- donaciones
- donaciones recurrentes
- fondos
- campañas
- recibos de contribución
- reenvío de recibos
- portal público
- reportes
- configuración general

MENÚ PRINCIPAL DEL CRM:
1. Inicio
2. Personas
3. Donaciones
4. Portal
5. Reportes
6. Configuración

NO agregar nuevos módulos innecesarios.
NO convertir esto en un ERP complejo.
NO rediseñar la UI desde cero.
Mantener la simplicidad visual actual.

ESTILO VISUAL EXISTENTE:
El sistema ya tiene un diseño con:
- sidebar azul oscuro mate
- fondo claro
- tarjetas blancas
- acento café
- estilo limpio, elegante y sobrio
- tipografía seria pero ligeramente redondeada
- UI simple y compacta

Debes mantener ese diseño y solo hacer ajustes cuando sean necesarios para funcionalidad, consistencia, estados o validación.

SUPABASE / POSTGRESQL:

El proyecto debe conectarse a Supabase.

Datos del proyecto Supabase:

Project URL:
https://dcmdcmpqowwntdtkrlfm.supabase.co

Publishable key:
sb_publishable_5-FwR0eTfmw6Jw9lGMooNQ_cZjQVQyk

Direct connection string template:
postgresql://postgres:[YOUR-PASSWORD]@db.dcmdcmpqowwntdtkrlfm.supabase.co:5432/postgres

CLI setup commands:
supabase login
supabase init
supabase link --project-ref dcmdcmpqowwntdtkrlfm

IMPORTANTE SOBRE SEGURIDAD:
- No hardcodees contraseñas en el código.
- No hardcodees la connection string completa en archivos públicos.
- Usa variables de entorno para la conexión.
- Usa .env, appsettings.Development.json, user-secrets o el mecanismo correcto según el stack detectado.
- Si necesitas la contraseña real de la base de datos, indícame exactamente dónde colocarla de forma segura.
- No expongas claves privadas ni secretos en el frontend.
- La publishable key puede usarse del lado cliente solo si aplica, pero cualquier acceso administrativo o escritura sensible debe pasar por backend o políticas correctas.
- Considera Row Level Security de Supabase si el sistema usa acceso directo desde cliente, pero si hay backend propio, define claramente el modelo de seguridad.

PRIMERA TAREA: ANÁLISIS QUIRÚRGICO DEL PROYECTO

Antes de crear tablas o modificar código, realiza un diagnóstico completo:

1. Identifica el stack real del proyecto:
   - Blazor
   - Razor Pages
   - MVC
   - Minimal API
   - React
   - HTML estático
   - JavaScript vanilla
   - otro

2. Identifica la estructura de carpetas.

3. Identifica:
   - páginas
   - componentes
   - layouts
   - servicios existentes
   - modelos existentes
   - archivos de configuración
   - rutas
   - assets
   - estilos
   - scripts
   - lógica de navegación

4. Identifica cómo está construido cada módulo:
   - Inicio
   - Personas
   - Donaciones
   - Portal
   - Reportes
   - Configuración

5. Identifica qué elementos son actualmente solo visuales:
   - botones sin acción
   - tablas con data hardcodeada
   - filtros sin lógica
   - gráficos estáticos
   - modales no conectados
   - formularios sin persistencia
   - drawers estáticos
   - preview del portal sin datos reales

6. Entrega un diagnóstico claro con:
   - estado actual
   - qué está funcional
   - qué está mockeado
   - qué falta conectar
   - riesgos técnicos
   - recomendaciones antes de implementar

SEGUNDA TAREA: LEVANTAMIENTO DE REQUERIMIENTOS POR MÓDULO

Haz un levantamiento de requerimientos funcionales y de datos, módulo por módulo.

Para cada módulo debes documentar:

1. Objetivo del módulo
2. Usuarios que lo usan
3. Datos que necesita leer
4. Datos que necesita crear
5. Datos que necesita actualizar
6. Datos que necesita eliminar o desactivar
7. Acciones principales
8. Validaciones necesarias
9. Estados visuales
10. Tablas de base de datos involucradas
11. Relaciones con otros módulos
12. Consultas frecuentes
13. Índices recomendados

MÓDULO INICIO:
Debe mostrar:
- donaciones del mes
- donantes recurrentes
- campañas activas
- recibos enviados
- tendencia mensual de donaciones
- donaciones por fondo
- distribución por tipo de donación
- últimas donaciones
- campañas activas con progreso
- acciones pendientes

MÓDULO PERSONAS:
Debe permitir:
- listar personas
- buscar por nombre, teléfono o email
- filtrar por tipo/estado
- agregar persona
- editar persona
- ver perfil
- ver historial de donaciones
- ver notas
- ver seguimiento
- asignar etiquetas
- asociar persona a familia/hogar

Tipos de persona:
- Miembro
- Visitante
- Donante
- Servidor
- Líder
- Inactivo

MÓDULO DONACIONES:
Debe permitir:
- listar donaciones
- registrar donación manual
- registrar donaciones únicas
- manejar donaciones mensuales
- manejar donaciones anuales
- filtrar por fecha, fondo, campaña, método y estado
- crear fondos
- crear campañas
- ver recibos
- reenviar recibos
- ver historial de envío
- registrar motivo de reenvío
- ver detalle de pago
- preparar integración con Stripe

Frecuencias:
- Única
- Mensual
- Anual

Métodos:
- Tarjeta
- ACH
- Efectivo
- Cheque
- Stripe

Estados:
- Pagada
- Pendiente
- Fallida
- Reembolsada

MÓDULO PORTAL:
Debe permitir:
- editar identidad de la iglesia
- editar logo
- editar nombre público
- editar color principal
- editar hero
- editar mensaje de bienvenida
- editar horarios
- editar información de donaciones
- seleccionar campañas visibles
- editar contacto
- guardar cambios
- publicar portal
- descartar cambios
- previsualizar versión escritorio y móvil
- marcar cambios sin publicar

Estados del portal:
- Borrador
- Publicado
- Cambios sin publicar

MÓDULO REPORTES:
Debe permitir:
- filtrar por rango de fecha
- filtrar por fondo
- filtrar por campaña
- mostrar total recibido
- mostrar total neto
- mostrar donantes únicos
- mostrar campaña con mayor recaudación
- mostrar gráficos de línea, barra y dona
- generar reportes descargables
- exportar Excel
- descargar PDF
- enviar reporte por email como placeholder inicial
- ver estado anual de contribuciones

MÓDULO CONFIGURACIÓN:
Debe permitir:
- editar datos de la iglesia
- editar EIN
- editar dirección
- editar pastor principal
- editar tesorero
- administrar usuarios y permisos
- configurar Stripe
- configurar métodos de pago
- configurar recibos de contribución
- configurar mensaje fiscal
- configurar firma opcional
- configurar idioma
- ver suscripción actual

TERCERA TAREA: DISEÑO DE BASE DE DATOS RELACIONAL

Diseña una base de datos relacional para Supabase/PostgreSQL.

Debe cumplir:

- normalización adecuada
- evitar duplicidad innecesaria
- relaciones claras
- claves primarias
- claves foráneas
- restricciones
- índices
- nombres consistentes
- auditoría básica
- preparada para multi-tenant
- optimizada para consultas frecuentes del dashboard y reportes
- preparada para crecer sin romper el diseño inicial

La arquitectura debe ser multi-tenant.
Toda tabla que pertenezca a una iglesia debe incluir church_id.

No usar una base de datos por iglesia.
Usar una sola base de datos con church_id.

TABLAS BASE ESPERADAS:

1. churches
2. church_users
3. people
4. person_tags
5. person_tag_assignments
6. households
7. household_members
8. funds
9. campaigns
10. donations
11. recurring_donation_profiles
12. contribution_receipts
13. receipt_deliveries
14. portal_settings
15. service_times
16. portal_visible_campaigns
17. audit_logs
18. notification_logs
19. system_settings, si aplica

Evalúa si todas son necesarias.
Puedes agregar, quitar o ajustar tablas, pero debes justificarlo.

ENTIDADES CLAVE:

churches:
Debe guardar información legal, pública y administrativa de la iglesia.

people:
Debe guardar miembros, visitantes, donantes, servidores e inactivos.
No crear tablas separadas para miembros, visitantes y donantes, salvo que el análisis demuestre que es necesario.
Una misma persona puede tener varios roles o etiquetas.

donations:
Debe registrar cada pago/donación individual.

recurring_donation_profiles:
Debe representar la intención recurrente de donar mensualmente o anualmente.
Cada cobro exitoso debe generar una fila en donations.

contribution_receipts:
Debe representar el comprobante generado para una donación.
No se debe crear una nueva donación al reenviar un recibo.

receipt_deliveries:
Debe registrar cada envío o reenvío de un recibo.

funds:
Debe representar destinos contables internos de la iglesia:
- Fondo General
- Misiones
- Construcción
- Ayuda Comunitaria
- etc.

campaigns:
Debe representar campañas asociadas opcionalmente a fondos.

portal_settings:
Debe guardar contenido editable del portal público.

service_times:
Debe guardar horarios de culto o reuniones.

audit_logs:
Debe guardar acciones sensibles:
- crear donación
- editar donación
- generar recibo
- reenviar recibo
- publicar portal
- cambiar configuración fiscal
- cambiar datos de iglesia
- cambiar roles de usuarios

NORMALIZACIÓN:
- Evita guardar datos derivados si pueden calcularse fácilmente, excepto cuando sea útil por performance.
- Si guardas collected_amount en campaigns, explica si será denormalizado y cómo se mantendrá sincronizado.
- Evalúa si conviene usar vistas o materialized views para dashboard/reportes.
- Evita JSONB salvo para metadata flexible no crítica.
- Usa enums o check constraints para estados importantes.
- Usa timestamps.
- Usa soft delete donde tenga sentido.
- Usa índices compuestos para consultas comunes.

CONSULTAS QUE DEBEN OPTIMIZARSE:

Dashboard:
- donaciones del mes por church_id
- donaciones por fondo
- donaciones por campaña
- donaciones por frecuencia
- donantes únicos
- campañas activas
- recibos enviados
- últimas donaciones

Personas:
- búsqueda por nombre, email, teléfono
- filtro por status
- historial de donaciones por persona

Donaciones:
- filtro por fecha
- filtro por fondo
- filtro por campaña
- filtro por estado
- filtro por método de pago
- filtro por frecuencia

Reportes:
- agregaciones por mes
- agregaciones por fondo
- agregaciones por campaña
- agregaciones por método
- recibos por año fiscal
- donaciones grandes
- donantes recurrentes

ÍNDICES:
Propón y crea índices para:
- church_id
- church_id + created_at
- church_id + donation_date
- church_id + status
- church_id + fund_id
- church_id + campaign_id
- donor_person_id
- receipt_id
- lower(email), si aplica
- búsquedas por nombre, si aplica

CUARTA TAREA: MIGRACIONES SUPABASE

Crea las migraciones SQL necesarias dentro de supabase/migrations.

Usa SQL limpio, ordenado y comentado.

Debes:
- crear tablas en orden correcto
- crear constraints
- crear indexes
- crear triggers si son necesarios
- crear funciones para updated_at si aplica
- crear seed data inicial
- no destruir tablas existentes sin autorización
- no usar DROP destructivo sin explicación y aprobación

Si el proyecto ya tiene tablas, primero identifícalas y compáralas antes de proponer cambios.

QUINTA TAREA: SEED DATA

Crear seed data realista para probar todo el CRM.

Iglesia demo:
- Iglesia Casa de Restauración

Usuarios:
- Pastor Miguel
- María López, tesorera
- Ana Rivera, secretaria

Personas:
- Miembros
- Visitantes
- Donantes
- Servidores
- Una empresa donante: ABC Construction LLC

Fondos:
- Fondo General
- Misiones
- Construcción
- Ayuda Comunitaria

Campañas:
- Fondo de construcción
- Misiones 2026
- Ayuda comunitaria

Donaciones:
- donaciones únicas
- donaciones mensuales
- donaciones anuales
- donaciones en efectivo
- donaciones con cheque
- donaciones con Stripe
- una donación grande de $10,000 hecha por ABC Construction LLC

Recibos:
- recibos generados
- recibos enviados
- un recibo reenviado por motivo “Solicitud del contador”
- un recibo con historial de reenvío por cambio de correo

SEXTA TAREA: PLAN DE IMPLEMENTACIÓN FUNCIONAL

Después del análisis y la base de datos, crea un plan de implementación por fases.

FASE 1:
Análisis del proyecto y documentación técnica.

FASE 2:
Diseño de base de datos relacional y migraciones Supabase.

FASE 3:
Seed data inicial.

FASE 4:
Servicios de datos / repositories / API layer según el stack detectado.

FASE 5:
Conectar módulo Personas.

FASE 6:
Conectar módulo Donaciones.

FASE 7:
Conectar módulo Portal.

FASE 8:
Conectar módulo Reportes.

FASE 9:
Conectar módulo Configuración.

FASE 10:
Conectar módulo Inicio / Dashboard.

FASE 11:
Validaciones, toasts, loading states, empty states y manejo de errores.

FASE 12:
Pruebas manuales de flujo completo.

SÉPTIMA TAREA: CRITERIOS DE ACEPTACIÓN

Define criterios de aceptación por módulo.

Ejemplos:

Inicio:
- KPIs cargan desde base de datos.
- Gráficos se alimentan de donaciones reales.
- Campañas activas muestran progreso correcto.

Personas:
- Se puede crear persona.
- Se puede editar persona.
- Se puede buscar persona.
- Se puede filtrar por estado.
- Se puede ver perfil y donaciones asociadas.

Donaciones:
- Se puede registrar donación.
- Se puede asignar fondo.
- Se puede asignar campaña.
- Se genera recibo.
- Se puede reenviar recibo sin duplicar donación.
- Se registra historial del reenvío.

Portal:
- Se pueden editar campos.
- Preview se actualiza.
- Guardar persiste datos.
- Publicar cambia estado.
- Descartar revierte cambios.

Reportes:
- KPIs calculan correctamente.
- Gráficos reflejan datos filtrados.
- Export buttons existen y muestran feedback.
- Reportes tienen datos reales.

Configuración:
- Se pueden editar datos de iglesia.
- Se pueden ver usuarios.
- Se puede configurar texto de recibo.
- Stripe queda preparado como integración.

OCTAVA TAREA: REGLAS IMPORTANTES

No implementes cambios grandes sin explicar primero el plan.
No rompas el diseño actual.
No agregues módulos nuevos.
No mezcles usuarios administradores con personas de la congregación.
No trates donaciones como invoices.
No dupliques donaciones al reenviar recibos.
No hardcodees credenciales.
No uses datos sensibles reales en seed data.
No uses lógica fiscal como promesa legal.
El sistema solo debe generar registros y comprobantes útiles para la iglesia y el donante.

NOVENA TAREA: DOCUMENTACIÓN ESPERADA

Genera o actualiza documentación en Markdown:

1. IMPLEMENTATION_PLAN.md
Debe incluir:
- diagnóstico del proyecto
- fases
- módulos
- tareas
- riesgos
- criterios de aceptación

2. DATABASE_DESIGN.md
Debe incluir:
- entidades
- relaciones
- justificación de diseño
- normalización
- índices
- consultas principales

3. SUPABASE_SETUP.md
Debe incluir:
- comandos usados
- variables de entorno necesarias
- cómo correr migraciones
- cómo aplicar seed data
- cómo conectar el proyecto

4. MODULE_REQUIREMENTS.md
Debe incluir:
- levantamiento por módulo
- acciones funcionales
- validaciones
- dependencias de datos

DÉCIMA TAREA: RESULTADO FINAL ESPERADO

Al finalizar, necesito que el sistema tenga:
- base de datos Supabase creada
- tablas relacionales normalizadas
- relaciones correctas
- índices básicos
- seed data
- módulos conectados a datos reales
- botones principales funcionales
- filtros funcionales
- tablas funcionales
- modales funcionales
- drawers funcionales
- dashboard con datos reales
- portal editable con guardar/publicar
- reportes con gráficos alimentados por datos
- configuración editable
- recibos reenviables con historial
- documentación técnica clara

Antes de implementar, primero entrégame:
1. diagnóstico del proyecto
2. propuesta de modelo de datos
3. plan de implementación por fases
4. riesgos detectados
5. confirmación de qué archivos vas a tocar

Luego procede con la implementación de forma ordenada.

para entrar a supabase y hacer la conexion a la bd

Project url: https://dcmdcmpqowwntdtkrlfm.supabase.co
Publishable key: sb_publishable_5-FwR0eTfmw6Jw9lGMooNQ_cZjQVQyk
Direct connection string:postgresql://postgres:[YOUR-PASSWORD]@db.dcmdcmpqowwntdtkrlfm.supabase.co:5432/postgres
CLI setup commands: 
supabase login
supabase init
supabase link --project-ref dcmdcmpqowwntdtkrlfm