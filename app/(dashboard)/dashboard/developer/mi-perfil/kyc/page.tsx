import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserKYC } from "@/lib/actions/kyc";
import { getKycProfile } from "@/lib/actions/kyc-actions";
import KycWizardClient from "./kyc-wizard-client";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
export const dynamic = "force-dynamic";

export default async function KYCPage() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    const role = (session?.user as any)?.role as string | undefined;

    if (!session || !userId) redirect("/login");
    if (role !== "DESARROLLADOR" && role !== "VENDEDOR") redirect("/dashboard");

    const [kycRes, profileRes] = await Promise.all([
        getUserKYC(userId),
        getKycProfile(),
    ]);

    const kycData = kycRes.success ? kycRes.data : null;
    const kycProfile = profileRes.success ? profileRes.data : null;

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">
            <ModuleHelp content={MODULE_HELP_CONTENT.kyc} />
            <KycWizardClient
                userId={userId}
                initialStatus={kycData?.kycStatus || "PENDIENTE"}
                initialDocs={kycData?.documentacion || []}
                initialProfile={kycProfile}
            />
        </div>
    );
}
