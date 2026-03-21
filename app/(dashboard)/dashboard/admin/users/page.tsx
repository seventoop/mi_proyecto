import { getUsers } from "@/lib/actions/user-actions";
import UsersTable from "./users-table";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default async function AdminUsersPage({
    searchParams
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const page = Number(searchParams?.page) || 1;
    const search = typeof searchParams?.search === "string" ? searchParams.search : undefined;
    const role = typeof searchParams?.role === "string" ? searchParams.role : undefined;
    const kyc = typeof searchParams?.kyc === "string" ? searchParams.kyc : undefined;

    const res = await getUsers(page, 10, search, role, kyc);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <ModuleHelp content={MODULE_HELP_CONTENT.adminUsers} />

            <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            }>
                <UsersTable
                    users={res.success ? res.data?.users || [] : []}
                    metadata={res.success ? res.data?.metadata || { total: 0, page: 1, totalPages: 1 } : { total: 0, page: 1, totalPages: 1 }}
                />
            </Suspense>
        </div>
    );
}
