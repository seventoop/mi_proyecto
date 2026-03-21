export interface ModuleHelpContent {
    title: string;
    description: string;
    whatIs: string;
    howItWorks: string[];
    whatFor: string[];
    firstStep: string;
    moduleKey: string;
}

export const MODULE_HELP_CONTENT: Record<string, ModuleHelpContent> = {
    leads: {
        title: "Leads",
        description: "Tus contactos interesados en proyectos",
        whatIs: "Los leads son personas interesadas en tus proyectos. Acá podés ver, organizar y hacer seguimiento de cada contacto que mostró interés en comprar o invertir.",
        howItWorks: [
            "Un usuario deja sus datos o muestra interés",
            "Ese contacto se guarda como lead en el sistema",
            "Podés revisarlo, filtrarlo y analizarlo",
            "Cuando está listo, lo convertís en una oportunidad de venta"
        ],
        whatFor: [
            "Centralizar todos tus contactos",
            "No perder posibles clientes",
            "Tener orden en tu proceso comercial",
            "Preparar oportunidades para el CRM"
        ],
        firstStep: "Revisá tus leads disponibles o cargá uno nuevo para empezar a trabajar.",
        moduleKey: "leads"
    },
    proyectos: {
        title: "Mis Proyectos",
        description: "Gestioná tus desarrollos inmobiliarios y su estructura comercial.",
        whatIs: "Es el espacio donde creás y gestionás tus desarrollos inmobiliarios. Cada proyecto contiene etapas, manzanas, unidades y su información comercial.",
        howItWorks: [
            "Creás un nuevo proyecto",
            "Definís su estructura (etapas, lotes, unidades)",
            "Configurás precios, disponibilidad y estado",
            "Lo usás como base para generar leads, oportunidades y ventas"
        ],
        whatFor: [
            "Organizar tus desarrollos",
            "Tener control sobre lo que vendés",
            "Conectar proyectos con el sistema comercial",
            "Gestionar disponibilidad en tiempo real"
        ],
        firstStep: "Creá tu primer proyecto para comenzar a cargar unidades.",
        moduleKey: "proyectos"
    },
    crmPipeline: {
        title: "Pipeline CRM",
        description: "Gestioná tus oportunidades de venta por etapas.",
        whatIs: "Es un tablero donde gestionás tus oportunidades de venta. Cada cliente pasa por distintas etapas hasta concretar una operación.",
        howItWorks: [
            "Convertís un lead en oportunidad",
            "Esa oportunidad aparece en el pipeline",
            "La movés entre etapas (contacto, negociación, cierre, etc.)",
            "Cuando se concreta, se transforma en una venta"
        ],
        whatFor: [
            "Organizar tu proceso comercial",
            "Saber en qué estado está cada cliente",
            "Priorizar oportunidades",
            "Aumentar la tasa de cierre"
        ],
        firstStep: "Convertí un lead en oportunidad y movelo dentro del pipeline.",
        moduleKey: "crmPipeline"
    },
    reservas: {
        title: "Reservas",
        description: "Gestioná unidades reservadas y validá su avance hacia la venta.",
        whatIs: "Es donde se gestionan las unidades que los clientes quieren asegurar. Una reserva bloquea una unidad mientras se define la operación.",
        howItWorks: [
            "Un cliente elige una unidad",
            "Se genera una reserva",
            "La reserva queda pendiente de aprobación",
            "Podés aprobarla o rechazarla",
            "Si se aprueba, avanza hacia la venta"
        ],
        whatFor: [
            "Evitar vender la misma unidad dos veces",
            "Ordenar el proceso previo a la venta",
            "Tener control sobre disponibilidad real",
            "Formalizar el interés del cliente"
        ],
        firstStep: "Revisá las reservas pendientes y validá su estado.",
        moduleKey: "reservas"
    },
    kyc: {
        title: "KYC",
        description: "Verificá tu identidad para habilitar funciones clave del sistema.",
        whatIs: "KYC significa 'Know Your Customer' (Conocer a tu cliente). Es el proceso de verificación de identidad dentro del sistema.",
        howItWorks: [
            "Completás tus datos personales",
            "Subís la documentación requerida",
            "El sistema valida tu identidad",
            "Una vez aprobado, se desbloquean funciones clave"
        ],
        whatFor: [
            "Garantizar seguridad dentro de la plataforma",
            "Cumplir con requisitos legales",
            "Habilitar funciones como creación de proyectos o ventas",
            "Proteger a todos los usuarios del sistema"
        ],
        firstStep: "Completá tu verificación para habilitar todas las funcionalidades.",
        moduleKey: "kyc"
    },
    biMetrics: {
        title: "BI Métricas",
        description: "Análisis de rendimiento y embudo de ventas en tiempo real.",
        whatIs: "Es tu panel de control analítico. Aquí podés visualizar el rendimiento comercial de tu organización a través de indicadores clave (KPIs) y gráficos interactivos.",
        howItWorks: [
            "El sistema recopila datos de tus leads y oportunidades",
            "Calcula tasas de conversión y tiempos de ciclo",
            "Agrupa la información por canales y etapas",
            "Presenta los resultados en gráficos fáciles de leer"
        ],
        whatFor: [
            "Medir el éxito en la gestión de leads",
            "Identificar cuellos de botella en ventas",
            "Entender la distribución por etapas del pipeline",
            "Tomar decisiones ejecutivas basadas en datos numéricos duros"
        ],
        firstStep: "Revisá tus KPIs principales y explorá la distribución del negocio.",
        moduleKey: "biMetrics"
    },
    configuracion: {
        title: "Configuración",
        description: "Personalizá y gestioná las preferencias de tu cuenta.",
        whatIs: "Es el panel central desde donde controlás la experiencia y los parámetros de tu perfil en la plataforma.",
        howItWorks: [
            "Navegá por las distintas pestañas de configuración",
            "Ajustá notificaciones, apariencia y privacidad",
            "Los cambios impactan inmediatamente en tu sesión",
            "Tus preferencias se guardan de forma segura"
        ],
        whatFor: [
            "Adaptar la plataforma a tu forma de trabajo",
            "Controlar qué notificaciones recibís y cuándo",
            "Personalizar el tema y el idioma de la interfaz",
            "Gestionar la privacidad de tu información"
        ],
        firstStep: "Revisá tus preferencias de notificación para mantenerte al día.",
        moduleKey: "configuracion"
    },
    adminGlobal: {
        title: "Matriz Admin Fundacional",
        description: "Monitoreo Global de Activos y Usuarios",
        whatIs: "El panel de control supremo de SevenToop. Desde aquí podés visualizar la salud técnica del sistema, métricas globales financieras, logs de auditoría exhaustivos y acceso a la gestión de todas las entidades.",
        howItWorks: [
            "El sistema recopila datos de todas las organizaciones en tiempo real",
            "Monitorea el estado de los servicios (DB, Storage, Pusher)",
            "Registra cada evento clave en el log de auditoría",
            "Centraliza el acceso a la moderación KYC y gestión de usuarios"
        ],
        whatFor: [
            "Mantener el control absoluto sobre la plataforma",
            "Aprobar o rechazar procesos críticos como KYC",
            "Supervisar el volumen transaccional y nuevos leads globales",
            "Identificar problemas de infraestructura rápidamente"
        ],
        firstStep: "Revisá los indicadores de salud y las métricas destacadas de conversión.",
        moduleKey: "adminGlobal"
    },
    adminUsers: {
        title: "Gestión de Usuarios",
        description: "Administra roles, accesos y estados de cuenta de forma centralizada.",
        whatIs: "Es el directorio centralizado de todas las cuentas registradas en SevenToop. Permite controlar quién tiene acceso a qué módulos.",
        howItWorks: [
            "Buscás usuarios por nombre, rol o estado",
            "Visualizás el estado de verificación de identidad (KYC)",
            "Promovés cuentas a Vendedor o Administrador",
            "Restringís o eliminás accesos si se detectan anomalías"
        ],
        whatFor: [
            "Auditar quién usa la plataforma",
            "Otorgar permisos especiales a miembros del equipo",
            "Identificar cuentas bloqueadas o pendientes de KYC",
            "Resolver problemas técnicos asociados a una cuenta"
        ],
        firstStep: "Usá los filtros para encontrar rápidamente a los vendedores o administradores activos.",
        moduleKey: "adminUsers"
    },
    adminKyc: {
        title: "Revisiones KYC",
        description: "Gestioná las solicitudes de verificación de identidad de Desarrolladores e Inversores.",
        whatIs: "Es el centro de operaciones donde ocurre la Due Diligence. Evaluás quién accede a la plataforma validando pasaportes, DNIs, comprobantes y selfies.",
        howItWorks: [
            "Los usuarios cargan su documentación obligatoria",
            "Se encolan en la vista según su tipo (Desarrollador o Inversor)",
            "Hacés click para desplegar y verificar los adjuntos y datos financieros",
            "Aprobás o rechazás la solicitud según la veracidad del perfil"
        ],
        whatFor: [
            "Evitar el lavado de dinero o crímenes financieros",
            "Asegurar que las empresas que venden proyectos existan",
            "Asegurar que los inversores tengan patrimonio lícito",
            "Mantener el cumplimiento normativo internacional"
        ],
        firstStep: "Revisá las colas activas y aprobá las que tengan la documentación completa.",
        moduleKey: "adminKyc"
    },
    adminPlanes: {
        title: "Suscripciones B2B",
        description: "Creación de tiers y asignación de licencias corporativas.",
        whatIs: "Es el centro de control del modelo SaaS. Te permite crear planes (Free, Pro, Enterprise), ajustar límites de almacenamiento/leads y habilitar features, para luego cobrar o asignar manualmente estos paquetes a las empresas.",
        howItWorks: [
            "Creás un nuevo Plan con nombre descriptivo y precio en USD mensua",
            "Definís los cupos máximos de leads, proyectos y usuarios",
            "Encendés o apagás botones booleanos de Features (CRM, Banners)",
            "En la sección inferior, buscás una org y le asignás el nuevo tier"
        ],
        whatFor: [
            "Crear un nuevo paquete corporativo customizado para un cliente VIP",
            "Revisar qué empresas no tienen plan asignado y contactarlas",
            "Aumentar precios para nuevos clientes",
            "Limitar a los Free users a menos proyectos"
        ],
        firstStep: "Creá un plan 'Starter' de 50USD limitando a 5 usuarios.",
        moduleKey: "adminPlanes"
    },
    adminBlog: {
        title: "Moderación de Blog",
        description: "Control de publicaciones y artículos de la plataforma.",
        whatIs: "Es el panel de administración donde podés aprobar, rechazar, o gestionar todo el contenido publicado por el equipo en el blog de la plataforma.",
        howItWorks: [
            "Visualizás listados de posts con sus estados (BORRADOR, PENDIENTE, APROBADO)",
            "Aprobás o rechazás las publicaciones pendientes",
            "Editás metadatos o eliminás posts inapropiados"
        ],
        whatFor: [
            "Asegurar calidad editorial antes de publicar un artículo",
            "Mantener el contenido de la plataforma fresco y relevante",
            "Eliminar posts obsoletos"
        ],
        firstStep: "Revisá las publicaciones en estado 'PENDIENTE' para aprobarlas.",
        moduleKey: "adminBlog"
    },
    adminPagos: {
        title: "Gestión de Pagos",
        description: "Centro de conciliación y control financiero.",
        whatIs: "Validá y gestioná las transacciones, transferencias y comprobantes que ingresan a la plataforma por proyectos o banners.",
        howItWorks: [
            "Revisás la tabla con todos los movimientos financieros",
            "Visualizás comprobantes adjuntos haciendo click en el ícono del documento",
            "Marcás los pagos como APROBADO o RECHAZADO según corresponda"
        ],
        whatFor: [
            "Validar transferencias bancarias manuales",
            "Llevar un tracking de facturación pendiente",
            "Habilitar servicios (banners) tras confirmar la recepción del dinero"
        ],
        firstStep: "Filtrá por 'PENDIENTE' y revisá los comprobantes adjuntos.",
        moduleKey: "adminPagos"
    },
    adminConfiguracion: {
        title: "Configuración Global",
        description: "Ajustes de infraestructura, mantenimiento y claves maestras.",
        whatIs: "El corazón del panel. Desde acá controlás variables de entorno dinámicas, estado de los servidores y configuración de APIs (ej. WhatsApp).",
        howItWorks: [
            "Monitoreás la salud de BD, Storage y WebSockets",
            "Apagás o encendés el 'Modo Mantenimiento'",
            "Actualizás las API Keys de servicios externos de forma segura",
            "Ajustás textos vitales de la landing page"
        ],
        whatFor: [
            "Pausar el sitio para una actualización grande",
            "Renovar tokens de integraciones que han expirado",
            "Cambiar el CTA principal de la landing sin tocar código"
        ],
        firstStep: "Verificá que la 'Salud de Servicios' esté toda en verde (OK).",
        moduleKey: "adminConfiguracion"
    },
    adminMandatos: {
        title: "Mandatos Pendientes",
        description: "Cola de autorización de comercializadores sobre proyectos.",
        whatIs: "Cuando un desarrollador propone un comercializador (exclusivo o no exclusivo) para un proyecto, ese mandato queda pendiente de aprobación. Desde acá el equipo de SevenToop valida la documentación y autoriza o rechaza el mandato.",
        howItWorks: [
            "El owner del proyecto crea una relación COMERCIALIZADOR_* con estado PENDIENTE",
            "El mandato aparece en esta cola con el documento adjunto y los datos del comercializador",
            "Un admin revisa el documento y aprueba o rechaza con motivo opcional",
            "El comercializador recibe notificación del resultado"
        ],
        whatFor: [
            "Validar que el comercializador tiene autorización real sobre el proyecto",
            "Controlar exclusividades en vigencia",
            "Mantener trazabilidad de quién autorizó cada mandato"
        ],
        firstStep: "Revisá los mandatos en estado PENDIENTE y verificá el documento adjunto antes de aprobar.",
        moduleKey: "adminMandatos"
    },
    adminValidaciones: {
        title: "Validación de Proyectos",
        description: "Cola de revisión de proyectos antes de su aprobación comercial.",
        whatIs: "Cuando un desarrollador envía su proyecto a revisión, entra en esta cola. Desde acá el equipo de SevenToop aprueba, observa o rechaza proyectos antes de que puedan operar en la plataforma.",
        howItWorks: [
            "El owner del proyecto lo envía desde BORRADOR a PENDIENTE_VALIDACION",
            "El admin lo pone EN_REVISION para indicar que está siendo evaluado",
            "Si todo está correcto, se aprueba y el proyecto queda habilitado para operar",
            "Si hay observaciones, se detallan y el owner puede corregir y reenviar"
        ],
        whatFor: [
            "Controlar qué proyectos pueden captar leads, reservas y publicarse",
            "Garantizar documentación legal y técnica en orden antes de operar",
            "Mantener trazabilidad de qué admin aprobó cada proyecto y cuándo"
        ],
        firstStep: "Revisá los proyectos en PENDIENTE_VALIDACION y poné en EN_REVISION los que vas a auditar.",
        moduleKey: "adminValidaciones"
    },
    adminRiesgos: {
        title: "Panel de Riesgos",
        description: "Monitoreo de alertas y señales de riesgo en la plataforma.",
        whatIs: "Es el centro de monitoreo de señales de alerta. Detecta patrones inusuales en transacciones, usuarios y proyectos para ayudarte a tomar acciones preventivas.",
        howItWorks: [
            "El sistema analiza eventos en tiempo real",
            "Clasifica las alertas por nivel de riesgo (alto, medio, bajo)",
            "Muestra un historial de incidentes recientes",
            "Permite tomar acciones directas desde cada alerta"
        ],
        whatFor: [
            "Detectar fraudes o irregularidades tempranamente",
            "Monitorear usuarios o proyectos con comportamientos inusuales",
            "Cumplir con obligaciones de compliance y auditoría",
            "Mantener la integridad de la plataforma"
        ],
        firstStep: "Revisá las alertas de alto riesgo y resolvé las más críticas primero.",
        moduleKey: "adminRiesgos"
    },
    adminTestimonios: {
        title: "Testimonios",
        description: "Gestioná los testimonios que se muestran en la plataforma pública.",
        whatIs: "Es el panel de administración de testimonios de clientes. Podés crear, editar y controlar qué reseñas se publican en el sitio público de SevenToop.",
        howItWorks: [
            "Creás un nuevo testimonio con nombre, cargo y mensaje",
            "Indicás si debe mostrarse en la landing pública",
            "Editás o eliminás los existentes según corresponda",
            "Los cambios se reflejan en tiempo real en el sitio"
        ],
        whatFor: [
            "Generar confianza en nuevos usuarios",
            "Mostrar casos de éxito reales de clientes",
            "Controlar la imagen pública de la plataforma",
            "Mantener el contenido testimonial actualizado"
        ],
        firstStep: "Creá un nuevo testimonio con los datos de un cliente satisfecho.",
        moduleKey: "adminTestimonios"
    },
    investorPortafolio: {
        title: "Mi Portafolio",
        description: "Resumen de tus inversiones y propiedades activas.",
        whatIs: "Es tu panel principal como inversor. Muestra el estado de tus inversiones, el rendimiento acumulado y el acceso rápido a tus propiedades.",
        howItWorks: [
            "El sistema consolida todas tus inversiones activas",
            "Calcula el rendimiento y el valor actual de tu portafolio",
            "Muestra alertas sobre hitos de escrow completados",
            "Te conecta con los proyectos en los que participás"
        ],
        whatFor: [
            "Tener una vista unificada de tu patrimonio invertido",
            "Monitorear la evolución de tus inversiones",
            "Recibir actualizaciones sobre los proyectos en los que participás",
            "Tomar decisiones informadas sobre nuevas inversiones"
        ],
        firstStep: "Revisá el resumen de tu portafolio y explorá el detalle de cada inversión.",
        moduleKey: "investorPortafolio"
    },
    investorPropiedades: {
        title: "Mis Propiedades",
        description: "Unidades y lotes asociados a tu cuenta como inversor.",
        whatIs: "Es la vista de todas las unidades inmobiliarias vinculadas a tus inversiones. Podés ver el detalle de cada lote o propiedad que adquiriste o reservaste.",
        howItWorks: [
            "El sistema muestra las unidades asociadas a tus inversiones",
            "Podés ver el estado de cada unidad (reservada, vendida, disponible)",
            "Accedés a la documentación y planos de cada propiedad",
            "Recibís actualizaciones sobre el avance del desarrollo"
        ],
        whatFor: [
            "Tener registro de las propiedades en tu portafolio",
            "Verificar el estado actual de cada unidad",
            "Acceder a documentación técnica y legal",
            "Monitorear el progreso de construcción o desarrollo"
        ],
        firstStep: "Revisá el detalle de cada propiedad y verificá su estado actual.",
        moduleKey: "investorPropiedades"
    },
    investorKyc: {
        title: "Verificación KYC",
        description: "Completá tu verificación de identidad como inversor.",
        whatIs: "KYC (Know Your Customer) es el proceso de verificación de identidad requerido para operar como inversor en la plataforma. Garantiza la seguridad de todas las transacciones.",
        howItWorks: [
            "Completás tus datos personales y financieros",
            "Subís la documentación requerida (DNI, comprobante de fondos)",
            "El equipo de SevenToop revisa tu perfil",
            "Una vez aprobado, podés invertir en proyectos"
        ],
        whatFor: [
            "Habilitar tu cuenta para realizar inversiones",
            "Cumplir con requisitos regulatorios de inversión",
            "Proteger la seguridad de las transacciones",
            "Acceder a proyectos exclusivos para inversores verificados"
        ],
        firstStep: "Completá todos los campos requeridos y subí tu documentación para comenzar la revisión.",
        moduleKey: "investorKyc"
    },
    investorInversiones: {
        title: "Mis Inversiones",
        description: "Historial y estado de tus inversiones en proyectos.",
        whatIs: "Es el registro detallado de todas las inversiones que realizaste en la plataforma. Muestra el estado, rendimiento y evolución de cada operación.",
        howItWorks: [
            "Explorás los proyectos disponibles en el marketplace",
            "Elegís cuántos m² querés adquirir",
            "La inversión queda en estado ESCROW hasta completarse",
            "Podés seguir el avance de los hitos del proyecto"
        ],
        whatFor: [
            "Diversificar tu portafolio inmobiliario",
            "Generar retornos sobre capital en proyectos verificados",
            "Seguir el ciclo completo de cada inversión",
            "Acceder a rendimientos del sector inmobiliario"
        ],
        firstStep: "Revisá el estado de tus inversiones activas y sus hitos de escrow pendientes.",
        moduleKey: "investorInversiones"
    },
    clientePropiedades: {
        title: "Mis Propiedades",
        description: "Las unidades y lotes asociados a tu cuenta.",
        whatIs: "Es la vista de todas las propiedades vinculadas a tu perfil. Podés ver el detalle de cada unidad que compraste o reservaste en los proyectos de la plataforma.",
        howItWorks: [
            "El sistema muestra las unidades asociadas a tu cuenta",
            "Podés ver el estado de cada propiedad",
            "Accedés a la documentación y planos",
            "Recibís actualizaciones sobre el avance del proyecto"
        ],
        whatFor: [
            "Tener registro de tus propiedades en un solo lugar",
            "Verificar el estado actual de cada unidad",
            "Acceder a documentación técnica y contractual",
            "Monitorear el progreso del desarrollo"
        ],
        firstStep: "Revisá el detalle de tus propiedades y verificá el estado de cada una.",
        moduleKey: "clientePropiedades"
    },
    comercialAdmin: {
        title: "Dashboard Comercial (Admin)",
        description: "Vista global de la performance comercial de toda la plataforma.",
        whatIs: "Es el centro analítico para administradores. Permite monitorear el flujo de leads, el estado de las reservas y la composición del inventario a nivel global.",
        howItWorks: [
            "El sistema consolida datos de todos los proyectos activos",
            "Calcula métricas de conversión de leads a reservas",
            "Muestra un timeline de captación de los últimos 30 días",
            "Permite ver el ranking de proyectos con mejor performance comercial"
        ],
        whatFor: [
            "Tener una visión macro de la salud comercial de la plataforma",
            "Identificar proyectos con alta tracción o necesidades de soporte",
            "Monitorear la velocidad de ventas y disponibilidad de stock",
            "Tomar decisiones estratégicas basadas en datos reales"
        ],
        firstStep: "Explorá las métricas globales y usá el selector de período para ver la tendencia reciente.",
        moduleKey: "comercialAdmin"
    },
    comercialDeveloper: {
        title: "Dashboard Comercial",
        description: "Análisis de performance de tus proyectos asignados.",
        whatIs: "Es tu tablero de control comercial. Muestra exclusivamente los datos de los proyectos donde tenés participación activa o que fueron creados por vos.",
        howItWorks: [
            "Filtra automáticamente leads y reservas por tus proyectos",
            "Muestra la composición de tu inventario (Disponible/Reservado/Vendido)",
            "Trackea tu timeline de captación de leads propio",
            "Calcula tu tasa de conversión específica"
        ],
        whatFor: [
            "Seguir el progreso de tus ventas y reservas en tiempo real",
            "Entender la efectividad de tus canales de captación (leads)",
            "Gestionar tu stock de unidades de forma eficiente",
            "Preparar reportes de avance para inversores o socios"
        ],
        firstStep: "Revisá el estado de tus leads y reservas recientes para priorizar tus acciones.",
        moduleKey: "comercialDeveloper"
    },
    adminCrmLeads: {
        title: "Leads Globales",
        description: "Bandeja de entrada centralizada de leads externos.",
        whatIs: "Es el punto de entrada de todos los contactos captados por canales externos (Facebook, TikTok, Web) que aún no han sido asignados a una organización específica.",
        howItWorks: [
            "El sistema recibe el lead automáticamente desde el canal de origen",
            "El contacto aparece en esta lista como 'Pendiente'",
            "Podés revisar su perfil y origen",
            "Asignás el lead a la organización comercializadora correspondiente"
        ],
        whatFor: [
            "Evitar que los leads queden sin atención",
            "Centralizar la recepción de campañas de marketing masivas",
            "Distribuir carga de trabajo entre distintas desarrolladoras",
            "Mantener trazabilidad del origen de cada contacto"
        ],
        firstStep: "Seleccioná un lead y hacé click en 'Asignar Orga' para derivarlo.",
        moduleKey: "adminCrmLeads"
    },
    adminProyectos: {
        title: "Gestión de Proyectos",
        description: "Monitoreo y administración global de todos los desarrollos.",
        whatIs: "Es la vista consolidada de todos los proyectos creados en la plataforma, permitiendo al admin supervisar su estado técnico y comercial.",
        howItWorks: [
            "Visualizás el listado completo de desarrollos",
            "Ves el estado de unidades (Disponibles, Reservadas, Vendidas) de cada uno",
            "Accedés al detalle para editar parámetros o configuraciones",
            "Controlás la visibilidad y el estado vital de cada proyecto"
        ],
        whatFor: [
            "Supervisar el volumen de inventario en la plataforma",
            "Identificar proyectos inactivos o con problemas",
            "Editar información técnica sensible",
            "Tener un acceso rápido a cualquier desarrollo registrado"
        ],
        firstStep: "Usá el buscador o los filtros para localizar un proyecto específico.",
        moduleKey: "adminProyectos"
    },
    developerMain: {
        title: "Panel de Control",
        description: "Resumen operativo y financiero de tu actividad.",
        whatIs: "Es tu centro de mando. Aquí tenés una visión 360° de tus métricas comerciales, estado de KYC, alertas de uso y actividad reciente de tus proyectos.",
        howItWorks: [
            "Los indicadores (KPIs) se actualizan en tiempo real",
            "El panel financiero muestra ingresos y flujos proyectados",
            "La línea de tiempo muestra cambios recientes en tus unidades",
            "Los accesos rápidos te llevan a los módulos operativos"
        ],
        whatFor: [
            "Entender la salud de tu negocio de un vistazo",
            "Detectar urgencias o hitos completados",
            "Monitorear tu nivel de riesgo y cumplimiento (KYC)",
            "Navegar rápidamente hacia tus leads o proyectos"
        ],
        firstStep: "Revisá las métricas de este mes y el estado de tus próximas tareas.",
        moduleKey: "developerMain"
    },
    developerInventario: {
        title: "Inventario de Unidades",
        description: "Gestión detallada de stock de tus proyectos.",
        whatIs: "Es el catálogo técnico de todas las unidades (lotes, departamentos, cocheras) de los proyectos donde tenés participación.",
        howItWorks: [
            "Filtrás por proyecto o estado (Disponible, Reservado, etc.)",
            "Ves el detalle técnico y precio de lista de cada unidad",
            "Accedés al historial de cambios de cada lote",
            "Sincronizás la disponibilidad con el equipo comercial"
        ],
        whatFor: [
            "Tener control total sobre el stock real",
            "Evitar errores de disponibilidad en ventas",
            "Consultar especificaciones técnicas rápidas",
            "Auditar el movimiento de estados de una unidad"
        ],
        firstStep: "Filtrá por un proyecto para ver su mapa de disponibilidad.",
        moduleKey: "developerInventario"
    },
    pipelineConfig: {
        title: "Configuración de Etapas",
        description: "Personalizá las etapas del proceso comercial de tus leads.",
        whatIs: "Es el panel donde definís las etapas por las que pasan tus leads antes de convertirse en clientes. Cada etapa representa un momento clave en tu proceso de ventas (ej. Nuevo, Contactado, Calificado, Cerrado).",
        howItWorks: [
            "Ves la lista de etapas actuales ordenadas por prioridad",
            "Podés crear nuevas etapas con nombre y color propio",
            "Arrastrás o reordenás para ajustar el flujo comercial",
            "Los cambios se reflejan inmediatamente en el tablero de leads"
        ],
        whatFor: [
            "Adaptar el proceso de ventas a tu metodología",
            "Dar claridad sobre en qué punto está cada lead",
            "Mejorar la tasa de conversión con etapas bien definidas",
            "Tener un pipeline ordenado y fácil de usar"
        ],
        firstStep: "Revisá las etapas actuales y ajustá el nombre o color de las que no representen bien tu proceso.",
        moduleKey: "pipelineConfig"
    },
    adminLogicToop: {
        title: "LogicToop Center",
        description: "Configuración avanzada y optimización lógica del sistema.",
        whatIs: "Es el cerebro de automatización de SevenToop. Permite configurar integraciones, orquestar flujos de datos y monitorear la salud lógica de la plataforma.",
        howItWorks: [
            "Configurás conectores con servicios externos",
            "Definis reglas de orquestación y transformación de datos",
            "Monitoreás la analítica de performance del sistema",
            "Gestionás plantillas y componentes lógicos reutilizables"
        ],
        whatFor: [
            "Extender las capacidades de la plataforma",
            "Optimizar procesos repetitivos",
            "Asegurar la integridad de las integraciones",
            "Escalar la lógica de negocio sin tocar el core del sistema"
        ],
        firstStep: "Explorá el Orchestrator para ver el estado de los flujos activos.",
        moduleKey: "adminLogicToop"
    }
};
