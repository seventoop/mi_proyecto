import Image from "next/image";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex bg-slate-950">
            {/* Left panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
                <div className="relative z-10 flex flex-col justify-center items-center px-16 text-center -mt-[115px] ml-[76px]">
                    <div className="mb-0">
                        <Image
                            src="/logo.png"
                            alt="SevenToop"
                            width={340}
                            height={100}
                            className="object-contain drop-shadow-[0_0_30px_rgba(249,115,22,0.35)]"
                            priority
                        />
                    </div>
                    <h1 className="text-5xl font-bold text-white leading-tight mb-3 -mt-[86px]">
                        Gestión inmobiliaria
                        <br />
                        <span className="gradient-text">inteligente</span>
                    </h1>
                    <p className="text-lg text-slate-300 max-w-md">
                        Controla tus desarrollos, leads, ventas y reservas desde una
                        plataforma unificada y moderna.
                    </p>

                    {/* Decorative elements */}
                    <div className="mt-8 flex gap-4">
                        {["Proyectos", "Leads", "Masterplan", "Reservas"].map((item) => (
                            <div
                                key={item}
                                className="px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-sm text-slate-300"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Floating shapes */}
                <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-brand-500/10 blur-3xl" />
                <div className="absolute top-20 -right-10 w-40 h-40 rounded-full bg-brand-400/5 blur-2xl" />
            </div>

            {/* Right panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">{children}</div>
            </div>
        </div>
    );
}
