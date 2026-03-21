/**
 * lib/project-access/index.ts — public API
 *
 * Usage in server actions:
 *
 *   import { getProjectAccess, assertPermission, ProjectPermission } from "@/lib/project-access";
 *
 *   const user = await requireAuth();
 *   const ctx  = await getProjectAccess(user, proyectoId);
 *   assertPermission(ctx, ProjectPermission.EDITAR_PROYECTO);
 */

export { ProjectPermission, isBlockingState, BLOCKING_STATES } from "./types";
export type {
    ProjectAccessContext,
    ProjectSnapshot,
    ProjectRelation,
    BlockReason,
    EstadoValidacionProyecto,
    TransitionOptions,
} from "./types";

export { getProjectAccess } from "./get-project-access";

export { assertPermission, assertPermissions, resolveBlockReason } from "./assert-permission";

export { syncOperationalFlags, overrideFlags, flagsFromEstado } from "./sync-flags";

export {
    transitionProyectoState,
    isValidTransition,
} from "./transition-state";
