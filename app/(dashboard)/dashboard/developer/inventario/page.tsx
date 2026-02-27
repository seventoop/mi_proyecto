import { getAllUnidades } from "@/lib/actions/unidades";
import InventarioView from "@/components/dashboard/inventario/inventario-view";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function InventarioPage({
    searchParams
}: {
    searchParams: { estado?: string }
}) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const { data: unidades } = await getAllUnidades({
        estado: searchParams.estado,
        creadoPorId: userId
    });

    return (
        <div className="p-6 animate-fade-in">
            <InventarioView data={unidades || []} />
        </div>
    );
}
