import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import DashboardContainer from "@/components/dashboard/dashboard-container";
import SessionSyncHandler from "@/components/dashboard/session-sync-handler";
import { getEffectiveRolePermissions } from "@/lib/auth/permissions";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Resolve effective permissions on the server so the sidebar can hide modules
    // the user is not allowed to access. Falls back to an empty map if the session
    // is not yet established — the sidebar itself handles the loading state.
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;
    const effectivePermissions = role
        ? await getEffectiveRolePermissions(role)
        : null;

    return (
        <div className="min-h-screen bg-white dark:bg-[#0A0A0C] selection:bg-brand-500/30">
            <SessionSyncHandler />
            <Sidebar effectivePermissions={effectivePermissions} />
            <DashboardContainer>
                <Header />
                <main className="p-3 sm:p-4 lg:p-6 xl:p-8 w-full overflow-x-hidden pt-6">
                    {children}
                </main>
            </DashboardContainer>
        </div>
    );
}