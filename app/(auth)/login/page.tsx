"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, Loader2, Info, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type LoginErrorKind = "google_only" | "generic";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [errorKind, setErrorKind] = useState<LoginErrorKind>("generic");
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const savedEmail = localStorage.getItem("rememberedEmail");
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }

        const errorParam = searchParams.get("error");
        if (errorParam) {
            if (errorParam === "CredentialsSignin") {
                setError("Email o contraseña incorrectos");
            } else if (errorParam === "google_pre_registration") {
                setError("No pudimos completar el alta con Google. Volvé a intentarlo.");
            } else if (errorParam === "google_pre_registration_expired") {
                setError("La selección de tipo de cuenta venció. Volvé a ingresar con Google para continuar.");
            } else {
                setError("Se produjo un error durante el inicio de sesión");
            }
        }
    }, [searchParams]);

    const validateForm = () => {
        const errors: { email?: string; password?: string } = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            errors.email = "El email es requerido";
        } else if (!emailRegex.test(email)) {
            errors.email = "Formato de email inválido";
        }

        if (!password) {
            errors.password = "La contraseña es requerida";
        } else if (password.length < 8) {
            errors.password = "La contraseña debe tener al menos 8 caracteres";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setErrorKind("generic");

        if (!validateForm()) return;
        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                if (result.error === "GOOGLE_ONLY_ACCOUNT") {
                    setErrorKind("google_only");
                    setError("Esta cuenta se creó con Google.");
                } else if (result.error === "CredentialsSignin") {
                    setError("Email o contraseña incorrectos");
                } else {
                    setError(result.error);
                }
            } else {
                if (rememberMe) {
                    localStorage.setItem("rememberedEmail", email);
                } else {
                    localStorage.removeItem("rememberedEmail");
                }

                // Obtener sesión para verificar rol (vía next-auth, evita raw fetch)
                const session = await getSession();
                const role = (session?.user as any)?.role;

                // Redirección basada en rol
                switch (role?.toUpperCase()) {
                    case "ADMIN":
                    case "SUPERADMIN":
                        router.push("/dashboard/admin");
                        break;
                    case "DESARROLLADOR":
                    case "VENDEDOR":
                        router.push("/dashboard/developer");
                        break;
                    case "INVERSOR":
                        router.push("/dashboard/portafolio");
                        break;
                    case "CLIENTE":
                        router.push("/dashboard/portafolio");
                        break;
                    default:
                        router.push("/dashboard");
                }
            }
        } catch {
            setError("Error al iniciar sesión. Intenta nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Mobile logo */}
            <div className="mb-8 lg:hidden">
                <Image
                    src="/logo.png"
                    alt="SevenToop"
                    width={200}
                    height={60}
                    className="object-contain"
                    priority
                />
            </div>

            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-brand-400 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Volver al sitio
            </Link>

            <div className="space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-white">Iniciar sesión</h2>
                <p className="text-slate-400">
                    Ingresá tus credenciales para acceder a tu cuenta
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {error && errorKind !== "google_only" && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                        {error}
                    </div>
                )}

                {error && errorKind === "google_only" && (
                    <div
                        role="alert"
                        data-testid="login-google-only-alert"
                        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-sm space-y-3"
                    >
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-300" />
                            <div className="space-y-1">
                                <p className="font-medium text-amber-200">
                                    Esta cuenta se creó con Google
                                </p>
                                <p className="text-amber-100/80">
                                    Iniciá sesión con Google y, si querés también
                                    poder ingresar con email + contraseña, agregá
                                    una desde{" "}
                                    <Link
                                        href="/dashboard/configuracion"
                                        className="underline hover:text-white transition-colors"
                                    >
                                        Configuración
                                    </Link>
                                    .
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                            disabled={isLoading}
                            className="w-full py-2.5 rounded-lg bg-white text-slate-800 font-semibold border border-white/10 hover:bg-slate-100 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                            </svg>
                            Iniciar sesión con Google
                        </button>
                    </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                            }}
                            placeholder="tu@email.com"
                            className={cn(
                                "w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all",
                                fieldErrors.email
                                    ? "border-rose-500 focus:ring-rose-500/20"
                                    : "border-white/10 focus:ring-brand-500/40 focus:border-brand-500"
                            )}
                        />
                    </div>
                    {fieldErrors.email && (
                        <p className="text-xs text-rose-500 mt-1 ml-1">{fieldErrors.email}</p>
                    )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium text-slate-300">
                            Contraseña
                        </label>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                            }}
                            placeholder="••••••••"
                            className={cn(
                                "w-full pl-11 pr-12 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all",
                                fieldErrors.password
                                    ? "border-rose-500 focus:ring-rose-500/20"
                                    : "border-white/10 focus:ring-brand-500/40 focus:border-brand-500"
                            )}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            {showPassword ? (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                            ) : (
                                <Eye className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                    </div>
                    {fieldErrors.password && (
                        <p className="text-xs text-rose-500 mt-1 ml-1">{fieldErrors.password}</p>
                    )}
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500/40 transition-all"
                        />
                        <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">Recordarme</span>
                    </label>
                    <Link
                        href="/forgot-password"
                        className="text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium"
                    >
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl gradient-brand text-white font-semibold shadow-glow hover:shadow-glow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Iniciando sesión...
                        </>
                    ) : (
                        "Ingresar al sistema"
                    )}
                </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-wider text-slate-500">o</span>
                <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Google Sign-In */}
            <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-white text-slate-800 font-semibold border border-white/10 hover:bg-slate-100 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                </svg>
                Continuar con Google
            </button>

            <div className="mt-8 space-y-3">
                <p className="text-center text-sm text-slate-500">
                    ¿No tienes cuenta?{" "}
                    <Link
                        href="/register"
                        className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
                    >
                        Regístrate aquí
                    </Link>
                </p>
                <p className="text-center text-xs text-slate-600">
                    ¿Problemas para acceder?{" "}
                    <a
                        href="mailto:support@seventoop.com"
                        className="text-slate-400 hover:text-slate-300 transition-colors"
                    >
                        Contacta soporte
                    </a>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
