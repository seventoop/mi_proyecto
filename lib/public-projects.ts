type PublicProjectWhereOptions = {
    invertible?: boolean;
};

const HIDDEN_PROJECT_STATES = ["SUSPENDIDO", "CANCELADO", "ELIMINADO", "DESACTIVADO"] as const;

export function buildPublicProjectWhere(options: PublicProjectWhereOptions = {}) {
    const where: Record<string, unknown> = {
        deletedAt: null,
        visibilityStatus: { not: "BORRADOR" },
        estado: { notIn: [...HIDDEN_PROJECT_STATES] },
    };

    if (typeof options.invertible === "boolean") {
        where.invertible = options.invertible;
    }

    return where;
}
