"use client";
import { Star } from "lucide-react";
import TestimonialCarousel from "./TestimonialCarousel";
import TestimonialsActions from "./testimonials-actions";
import ScrollAnimationWrapper from "./scroll-animation-wrapper";
import { Testimonial } from "./TestimonialCard";
import { useLanguage } from "@/components/providers/language-provider";

const mockTestimonials: Testimonial[] = [
    {
        name: "Valeria Santoro",
        role: "Inversora Institucional",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
        quote: "La transparencia de datos y los rendimientos proyectados son impecables. La plataforma 3D de SevenToop nos permitió analizar todo remotamente con total seguridad.",
        property: "Reserva Geodevia V",
        returns: "14.5% TIR",
    },
    {
        name: "Carlos Medina",
        role: "Broker Inmobiliario",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
        quote: "Poder mostrar a mis clientes el Masterplan con disponibilidad en tiempo real cerró tres ventas el mes pasado. Es una ventaja competitiva brutal frente al sistema tradicional.",
        property: "Altos del Lago",
        returns: "Venta Directa",
    },
    {
        name: "Agustina Rivas",
        role: "Directora Comercial",
        image: "https://i.pravatar.cc/150?u=a04258114e29026702d",
        quote: "Desde que digitalizamos nuestro desarrollo con SevenToop, la conversión de leads aumentó un 60%. La experiencia inmersiva vende sola.",
        property: "EcoVillage Canning",
        returns: "+60% Leads",
    },
    {
        name: "Ignacio Ferrer",
        role: "Inversor Privado",
        image: "https://i.pravatar.cc/150?u=a04258a2462d826712d",
        quote: "Acceder a oportunidades en fase Friends & Family desde mi membresía VIP duplicó mi rendimiento anual. La información técnica es exacta.",
        property: "Lomas de la Tahona",
        returns: "18% Anual",
    },
    {
        name: "Mariana Costa",
        role: "Socia Desarrolladora",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026704a",
        quote: "Redujimos nuestros costos de marketing y agilizamos la preventa. SevenToop actúa como nuestro brazo tecnológico para comercialización premium.",
        property: "Zencity Sur",
        returns: "100% Preventa",
    },
    {
        name: "Lucas Perea",
        role: "Analista de Inversiones",
        image: "https://i.pravatar.cc/150?u=a048581f4e29026701d",
        quote: "El rigor técnico en la verificación de m2 y amenidades me da total tranquilidad al recomendar los proyectos en SevenToop a mis clientes corporativos.",
        property: "Madero Center",
        returns: "Validado 100%",
    },
    {
        name: "Florencia Giménez",
        role: "Compradora Particular",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026024b",
        quote: "Compramos nuestro lote desde el exterior guiándonos solo por el tour 360. Cuando viajamos a ver el terreno presencialmente, era exactamente como se veía online.",
        property: "Residencial Bosques",
        returns: "Venta Cerrada",
    },
    {
        name: "Esteban Quiroga",
        role: "CEO Constructora",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026712b",
        quote: "La herramienta de CRM integrada nos permite gestionar los avances de obra y las reservas en un solo lugar. Transformación digital absoluta.",
        property: "Campus Developer",
        returns: "Gestión 360°",
    },
    {
        name: "Sofía Armenta",
        role: "Gerente de Finanzas",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026709a",
        quote: "Encontrar lotes con alto potencial de revalorización es fácil cuando puedes ver el flujo financiero proyectado lado a lado con el máster plan.",
        property: "Valle Escondido",
        returns: "12% TIR",
    },
    {
        name: "Héctor Silva",
        role: "Arquitecto Senior",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026703c",
        quote: "Trabajar con desarrollos listados en SevenToop me da la pauta de que son proyectos serios y respaldados. Excelente curaduría.",
        property: "Partner Tecnológico",
        returns: "Aprobación",
    },
    {
        name: "Daniela Osorio",
        role: "Ejecutiva de Ventas",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026706e",
        quote: "Mandar links del Masterplan a posibles compradores ahorra enormes cantidades de tiempo y preguntas. Entienden todo el entorno visualmente de inmediato.",
        property: "Barrio Joven",
        returns: "Ahorro de Tiempo",
    },
    {
        name: "Miguel Rodríguez",
        role: "Inversionista Semilla",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026708c",
        quote: "El portafolio de preventas exclusivas tiene los mejores tickets de entrada que he visto en los últimos 5 años en la región centro.",
        property: "Torre Innova",
        returns: "Ticket VIP",
    },
    {
        name: "Camila Beltrán",
        role: "Familia Compradora",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026705d",
        quote: "Buscábamos seguridad y un ecosistema que nos diera certezas antes de dar el ahorro de nuestra vida. SevenToop nos transmitió eso y más.",
        property: "Altos del Lago",
        returns: "Confianza",
    },
    {
        name: "Julián Viale",
        role: "Desarrollador Inmobiliario",
        image: "https://i.pravatar.cc/150?u=a042581f4e29026707d",
        quote: "Su motor 360 y la tecnología de renders aplicados al mapa real son de otro planeta. Subió la categoría completa de todo nuestro barrio.",
        property: "Pinares Sur",
        returns: "Premium Tier",
    }
];

export default function TestimonialsSection() {
    const { dictionary: t } = useLanguage();

    const translatedTestimonials = mockTestimonials.map((testimonial, idx) => ({
        ...testimonial,
        ...t.testimonials.mockData[idx]
    }));

    return (
        <section id="testimonios" className="py-10 md:py-16 bg-background relative overflow-hidden border-t border-border">
            {/* Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-brand-orange/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-brand-yellow/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10">
                <ScrollAnimationWrapper className="text-center max-w-3xl mx-auto mb-4 space-y-6 px-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-black uppercase tracking-[0.2em] border border-brand-orange/20">
                        <Star className="w-4 h-4" />
                        {t.testimonials.badge}
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
                        {t.testimonials.title1} <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">{t.testimonials.titleHighlight}</span>
                    </h2>

                    <p className="text-foreground/60 text-lg md:text-xl font-medium leading-relaxed">
                        {t.testimonials.description}
                    </p>

                    <TestimonialsActions />
                </ScrollAnimationWrapper>

                <div className="mt-4 w-full">
                    <TestimonialCarousel testimonials={translatedTestimonials} />
                </div>
            </div>
        </section>
    );
}
