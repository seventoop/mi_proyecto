"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  ExternalLink,
  Shield,
  Plus
} from "lucide-react";
import { 
  getGoogleCalendarConfig, 
  updateGoogleCalendarConfig, 
  disconnectGoogleCalendar 
} from "@/lib/actions/google-calendar-actions";
import { toast } from "sonner";

interface IntegrationsClientProps {
  orgs: { id: string; nombre: string }[];
}

export function IntegrationsClient({ orgs }: IntegrationsClientProps) {
  const [activeOrgId, setActiveOrgId] = useState<string>(orgs[0]?.id || "");
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [refreshToken, setRefreshToken] = useState("");
  const [calendarId, setCalendarId] = useState("primary");

  useEffect(() => {
    if (activeOrgId) {
      loadConfig();
    }
  }, [activeOrgId]);

  async function loadConfig() {
    setLoading(true);
    try {
      const resp = await getGoogleCalendarConfig(activeOrgId);
      if (resp.success) {
        setConfig(resp.data);
        if (resp.data) {
          setCalendarId(resp.data.calendarId || "primary");
        }
      }
    } catch (error) {
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }

  const handleUpdate = () => {
    if (!refreshToken && !config?.hasRefreshToken) {
      toast.error("Refresh Token es requerido");
      return;
    }

    startTransition(async () => {
      const resp = await updateGoogleCalendarConfig(activeOrgId, {
        refreshToken: refreshToken || undefined, // Only send if updating
        calendarId
      });

      if (resp.success) {
        toast.success("Configuración actualizada");
        loadConfig();
        setRefreshToken("");
      } else {
        toast.error((resp as any).error || "Error al actualizar");
      }
    });
  };

  const handleDisconnect = () => {
    if (!confirm("¿Estás seguro de desconectar Google Calendar?")) return;

    startTransition(async () => {
      const resp = await disconnectGoogleCalendar(activeOrgId);
      if (resp.success) {
        toast.success("Desconectado correctamente");
        loadConfig();
      } else {
        toast.error((resp as any).error || "Error al desconectar");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">
          Seleccionar Organización
        </label>
        <select
          value={activeOrgId}
          onChange={(e) => setActiveOrgId(e.target.value)}
          className="w-full bg-slate-100 border-none rounded-lg p-3 font-bold text-sm focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
        >
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Google Calendar Integration Card */}
        <div className="glass-card overflow-hidden group">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-100 text-brand-600 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tighter">Google Calendar</h3>
                <div className="flex items-center gap-2 mt-1">
                   {config?.status === "ACTIVE" ? (
                      <span className="flex items-center gap-1 text-xs font-black uppercase py-0.5 px-2 bg-green-100 text-green-600 rounded-full border border-green-200">
                        <CheckCircle2 size={10} /> Conectado
                      </span>
                   ) : (
                      <span className="flex items-center gap-1 text-xs font-black uppercase py-0.5 px-2 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                        <XCircle size={10} /> No Configurado
                      </span>
                   )}
                </div>
              </div>
            </div>
            {config && (
              <button 
                onClick={loadConfig}
                className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-brand-500"
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              Permite que LogicToop cree eventos, verifique disponibilidad y gestione reuniones automáticamente.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-black uppercase text-slate-400 mb-1.5 block tracking-widest">
                  Refresh Token {config?.hasRefreshToken && "(Ya configurado)"}
                </label>
                <input 
                  type="password"
                  placeholder={config?.hasRefreshToken ? "••••••••••••••••" : "Ingrese el Refresh Token de Google"}
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg p-2.5 text-xs font-bold focus:border-brand-500 transition-all"
                />
                {!config?.hasRefreshToken && (
                  <p className="text-xs text-slate-400 mt-1 font-bold italic">
                    * Requerido para conectar la cuenta por primera vez.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400 mb-1.5 block tracking-widest">
                  Calendar ID (Default: primary)
                </label>
                <input 
                  type="text"
                  placeholder="primary"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg p-2.5 text-xs font-bold focus:border-brand-500 transition-all"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdate}
                  disabled={isPending || loading}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-lg font-black uppercase italic text-xs transition-all flex items-center justify-center gap-2 group shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                  {config ? "Actualizar Configuración" : "Conectar Calendario"}
                </button>
                
                {config && (
                  <button
                    onClick={handleDisconnect}
                    disabled={isPending}
                    className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all border border-red-100"
                  >
                    <XCircle size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-slate-400" />
              <span className="text-xs font-black uppercase text-slate-400 tracking-tighter">Tenant Scoped Isolation Active</span>
            </div>
            <a href="#" className="text-xs font-black uppercase text-brand-500 hover:underline flex items-center gap-1">
              Guía de Configuración <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Placeholder for future integrations */}
        <div className="glass-card p-8 border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed group">
          <div className="p-4 bg-slate-100 text-slate-400 rounded-full mb-4 group-hover:scale-110 transition-transform">
            <Plus size={32} />
          </div>
          <h3 className="font-black uppercase italic text-slate-400 tracking-tighter">Más Integraciones</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Drive, Sheets y WhatsApp (Próximamente)
          </p>
        </div>
      </div>
    </div>
  );
}
