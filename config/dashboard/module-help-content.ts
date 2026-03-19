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
    }
};
