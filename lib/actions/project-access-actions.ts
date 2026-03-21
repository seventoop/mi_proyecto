/**
 * lib/actions/project-access-actions.ts — barrel re-export
 *
 * Split into:
 *   - project-relations-actions.ts  (assign/revoke ProyectoUsuario)
 *   - project-state-actions.ts      (adminTransition / submitParaValidacion)
 *
 * This file is kept for backward compatibility of any existing imports.
 */

export {
    assignUserToProject,
    revokeUserFromProject,
} from "@/lib/actions/project-relations-actions";

export {
    adminTransitionProyectoState,
    submitProyectoParaValidacion,
    adminOverrideFlagsAction,
} from "@/lib/actions/project-state-actions";

export {
    createComercializadorRelacion,
    approveMandate,
    rejectMandate,
    getPendingMandates,
} from "@/lib/actions/mandate-actions";
