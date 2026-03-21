import { Suspense } from "react";
import { IntegrationsClient } from "./integrations-client";
import { db } from "@/lib/db";
import { requireAnyRole } from "@/lib/guards";

export default async function IntegrationsPage() {
  await requireAnyRole(["ADMIN", "SUPERADMIN"]);

  const orgs = await db.organization.findMany({
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" }
  });

  return (
    <div className="space-y-8 pb-12 px-4 md:px-0">
      <div>
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">
          External <span className="text-brand-500 underline decoration-4">Integrations</span>
        </h1>
        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">
          Configure multi-tenant connections for LogicToop flows
        </p>
      </div>

      <Suspense fallback={<div className="glass-card p-8 animate-pulse text-center uppercase font-black italic">Cargando Integraciones...</div>}>
        <IntegrationsClient orgs={orgs} />
      </Suspense>
    </div>
  );
}
