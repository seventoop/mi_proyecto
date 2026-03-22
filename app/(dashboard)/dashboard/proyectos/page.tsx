import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function ProyectosPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user) {
        redirect("/login");
    }

    if (role === "ADMIN" || role === "SUPERADMIN") {
        redirect("/dashboard/admin/proyectos");
    }

    if (role === "DESARROLLADOR" || role === "VENDEDOR") {
        redirect("/dashboard/developer/proyectos");
    }

    if (role === "CLIENTE" || role === "INVERSOR") {
        redirect("/dashboard/portafolio/marketplace");
    }

    redirect("/proyectos");
}
