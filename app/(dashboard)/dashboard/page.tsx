import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    // Redirect based on role
    if (userRole === "ADMIN") {
        redirect("/dashboard/admin");
    } else if (userRole === "VENDEDOR" || userRole === "DESARROLLADOR") {
        redirect("/dashboard/developer");
    } else if (userRole === "INVERSOR") {
        redirect("/dashboard/portafolio");
    } else if (userRole === "CLIENTE") {
        redirect("/dashboard/cliente");
    }

    // Fallback for unauthenticated or unknown roles
    redirect("/login");
}
