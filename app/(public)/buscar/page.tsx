import { redirect } from "next/navigation";

// /buscar was a mock-only page. Real search is handled by /proyectos with ProjectsFilter.
export default function BuscarPage() {
    redirect("/proyectos");
}
