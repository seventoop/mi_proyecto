import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    // Role-based landing policy:
    //   ADMIN / SUPERADMIN → admin console
    //   DESARROLLADOR / VENDEDOR → operational dashboard
    //   INVERSOR → portafolio
    //   CLIENTE → public site root ("/"), no internal dashboard by default
    if (userRole === "ADMIN" || userRole === "SUPERADMIN") {
        redirect("/dashboard/admin");
    } else if (userRole === "DESARROLLADOR" || userRole === "VENDEDOR") {
        redirect("/dashboard/developer");
    } else if (userRole === "INVERSOR") {
        redirect("/dashboard/portafolio");
    } else if (userRole === "CLIENTE") {
        redirect("/");
    }

    // Fallback for unauthenticated or unknown roles
    redirect("/login");
}
