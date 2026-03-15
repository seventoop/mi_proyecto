import Navbar from "@/components/public/navbar";
import Footer from "@/components/public/footer";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            {children}
            <Footer />
        </div>
    );
}
