import { redirect } from "next/navigation";
import GoogleRegisterForm from "./google-register-form";
import {
    getPublicGoogleRegistrationRoles,
    verifyGooglePreRegistrationToken,
} from "@/lib/auth/google-pre-registration";

const ROLE_COPY: Record<string, { label: string; description: string; icon: "client" | "investor" | "seller" | "developer" }> = {
    CLIENTE: {
        label: "Cliente",
        description: "Para seguir propiedades, reservas y el estado general de tu cuenta.",
        icon: "client",
    },
    INVERSOR: {
        label: "Inversor",
        description: "Para explorar oportunidades de inversión y operar tu portafolio.",
        icon: "investor",
    },
    VENDEDOR: {
        label: "Vendedor",
        description: "Para trabajar oportunidades comerciales y seguimiento de ventas.",
        icon: "seller",
    },
    DESARROLLADOR: {
        label: "Desarrollador",
        description: "Para quienes gestionan desarrollos, stock y operación inmobiliaria.",
        icon: "developer",
    },
};

export default function GoogleRegisterPage({
    searchParams,
}: {
    searchParams: { token?: string };
}) {
    const token = typeof searchParams.token === "string" ? searchParams.token : "";

    if (!token) {
        redirect("/login?error=google_pre_registration");
    }

    let payload;
    try {
        payload = verifyGooglePreRegistrationToken(token);
    } catch (error) {
        if (error instanceof Error && error.message === "EXPIRED_GOOGLE_PRE_REG_TOKEN") {
            redirect("/login?error=google_pre_registration_expired");
        }
        redirect("/login?error=google_pre_registration");
    }

    const options = getPublicGoogleRegistrationRoles().map((role) => ({
        value: role,
        ...ROLE_COPY[role],
    }));

    return (
        <GoogleRegisterForm
            token={token}
            email={payload.email}
            name={payload.fullName}
            options={options}
        />
    );
}
