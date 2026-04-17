type RoleMeta = {
    label: string;
    badgeClassName: string;
    capabilities: string[];
};

const DEFAULT_ROLE: RoleMeta = {
    label: "Invitado",
    badgeClassName: "bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300",
    capabilities: [
        "Ver secciones publicas de la plataforma.",
        "Iniciar sesion para acceder a funcionalidades privadas.",
    ],
};

const ROLE_META: Record<string, RoleMeta> = {
    SUPERADMIN: {
        label: "Super Admin",
        badgeClassName: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
        capabilities: [
            "Gestionar configuracion global y organizaciones.",
            "Administrar usuarios, roles, KYC y validaciones.",
            "Acceder a paneles operativos de toda la plataforma.",
        ],
    },
    ADMIN: {
        label: "Admin",
        badgeClassName: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
        capabilities: [
            "Administrar usuarios, KYC, contenido y operaciones.",
            "Ver y gestionar proyectos y reservas a nivel plataforma.",
            "Acceder a paneles de control y auditoria.",
        ],
    },
    DESARROLLADOR: {
        label: "Desarrollador",
        badgeClassName: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
        capabilities: [
            "Crear y gestionar proyectos propios.",
            "Operar comercialmente en proyectos habilitados.",
            "Trabajar con leads, reservas y documentacion del proyecto.",
        ],
    },
    VENDEDOR: {
        label: "Vendedor",
        badgeClassName: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
        capabilities: [
            "Gestionar leads y oportunidades asignadas.",
            "Crear y seguir reservas sobre proyectos habilitados.",
            "Actualizar tareas y seguimiento comercial diario.",
        ],
    },
    INVERSOR: {
        label: "Inversor",
        badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        capabilities: [
            "Ver portafolio e inversiones en m2.",
            "Acceder a oportunidades de inversion disponibles.",
            "Consultar movimientos y resumen financiero.",
        ],
    },
    CLIENTE: {
        label: "Cliente",
        badgeClassName: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
        capabilities: [
            "Ver propiedades y estado de su cuenta.",
            "Explorar proyectos disponibles en marketplace.",
            "Solicitar upgrade de perfil a Inversor.",
        ],
    },
};

function getRoleMeta(role: string | null | undefined): RoleMeta {
    if (!role) return DEFAULT_ROLE;
    return ROLE_META[role] ?? {
        label: role,
        badgeClassName: DEFAULT_ROLE.badgeClassName,
        capabilities: ["Acceso basico segun permisos actuales de la cuenta."],
    };
}

export default function RoleCapabilitiesCard({ role }: { role: string | null | undefined }) {
    const meta = getRoleMeta(role);

    return (
        <section className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0C] p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Tu rol</p>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">{meta.label}</h3>
                </div>
                <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${meta.badgeClassName}`}
                >
                    {role ?? "INVITADO"}
                </span>
            </div>

            <div className="mt-5">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Podes hacer:</p>
                <ul className="space-y-2">
                    {meta.capabilities.map((capability) => (
                        <li key={capability} className="text-sm text-slate-600 dark:text-slate-300">
                            - {capability}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
