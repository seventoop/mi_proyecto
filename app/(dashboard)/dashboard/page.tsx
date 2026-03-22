import { redirect } from "next/navigation";

// Role-based redirect is handled at middleware level (middleware.ts).
// This page is only reached if middleware lets an authenticated user through
// without a matching role — redirect to login as a safe fallback.
export default async function DashboardPage() {
    redirect("/login");
}
