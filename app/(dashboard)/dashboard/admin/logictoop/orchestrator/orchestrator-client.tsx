"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  triggerOrchestratorAnalysis, 
  generateDraftAction, 
  updateRecommendationStatusAction,
  parseIntentAction,
  generateDraftFromIntentAction
} from "@/lib/actions/orchestrator";
import { 
  BrainCircuit, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Activity,
  ChevronRight,
  Sparkles,
  Search,
  Plus,
  MessageSquare,
  Wand2,
  Clock,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  initialData: any;
  orgs: any[];
  activeOrgId: string | null;
  initialTab?: "overview" | "recommendations" | "generator" | "health" | "intent" | "optimizations";
}

export function OrchestratorClient({ initialData, orgs, activeOrgId, initialTab = "overview" }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "recommendations" | "generator" | "health" | "intent" | "optimizations">(initialTab);
  const [isPending, startTransition] = useTransition();
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  
  // Intent State
  const [rawIntent, setRawIntent] = useState("");
  const [proposal, setProposal] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);

  const router = useRouter();

  const recommendations = initialData?.recommendations || [];
  const optimizations = initialData?.optimizations || [];

  const handleAnalyze = () => {
    if (!activeOrgId) return;
    startTransition(async () => {
      const res = await triggerOrchestratorAnalysis(activeOrgId);
      if (res.success) {
        alert(`Analysis complete! Found ${res.count} new recommendations.`);
        router.refresh();
      }
    });
  };

  const handleParseIntent = async () => {
    if (!activeOrgId || !rawIntent) return;
    setIsParsing(true);
    const res = await parseIntentAction(activeOrgId, rawIntent);
    setIsParsing(false);
    if (res.success) {
      setProposal(res.proposal);
    }
  };

  const handleGenerateDraftFromIntent = () => {
    if (!proposal) return;
    startTransition(async () => {
        const res = await generateDraftFromIntentAction(proposal);
        if (res.success) {
            alert("Draft created successfully!");
            router.push(`/dashboard/admin/logictoop/builder/${res.flowId}`);
        }
    });
  };

  const handleGenerateDraft = (recId: string) => {
    startTransition(async () => {
      const res = await generateDraftAction(recId);
      if (res.success) {
        alert("Draft created! You can now edit it in the Canvas.");
        router.push(`/dashboard/admin/logictoop/builder/${res.flowId}`);
      }
    });
  };

  const selectedRecommendation = recommendations.find((r: any) => r.id === selectedRecId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 space-y-4">
        <div className="glass-card p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Organización</label>
            <select 
              value={activeOrgId || ""} 
              onChange={(e) => router.push(`/dashboard/admin/logictoop/orchestrator?orgId=${e.target.value}`)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {orgs.map(org => (
                <option key={org.id} value={org.id}>{org.nombre}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={isPending || !activeOrgId}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black py-3 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
          >
            <Zap className="w-4 h-4 fill-current" />
            ANALYZE CRM NOW
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {[
            { id: "overview", label: "Overview", icon: BrainCircuit },
            { id: "recommendations", label: "Recommendations", icon: CheckCircle2 },
            { id: "intent", label: "Intent-to-Workflow", icon: Wand2 },
            { id: "optimizations", label: "Optimizations", icon: Zap },
            { id: "generator", label: "Generator", icon: Sparkles },
            { id: "health", label: "System Health", icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg font-black uppercase text-xs tracking-tighter transition-all italic",
                activeTab === tab.id 
                  ? "bg-brand-500/10 text-brand-500 border border-brand-500/20" 
                  : "text-slate-500 hover:bg-white/5"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-3 space-y-6">
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Active Signals" value={recommendations.length} sub="Pending review" icon={Zap} color="text-yellow-500" />
              <StatCard title="Drafts Created" value={recommendations.filter((r:any) => r.status === "APPLIED").length} sub="Ready for review" icon={Plus} color="text-brand-500" />
              <StatCard title="Automation Health" value="84%" sub="System wide" icon={Activity} color="text-green-500" />
            </div>

            <div className="glass-card p-6">
              <h2 className="text-xl font-black italic uppercase tracking-tighter mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-brand-500" />
                Priority Findings
              </h2>
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((rec: any) => (
                  <div key={rec.id} className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-700/30 rounded-xl hover:border-brand-500/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg bg-slate-800", rec.severity === "CRITICAL" ? "text-red-500" : "text-brand-500")}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black italic uppercase text-sm">{rec.title}</h3>
                        <p className="text-xs text-slate-400 font-bold">{rec.type} • Confidence: {(rec.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedRecId(rec.id); setActiveTab("recommendations"); }}
                      className="opacity-0 group-hover:opacity-100 transition-all text-xs font-black text-brand-500 flex items-center gap-1 uppercase italic"
                    >
                      View <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "recommendations" && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-slate-400 mb-2 px-1">Active Queue</h2>
              {recommendations.map((rec: any) => (
                <button
                  key={rec.id}
                  onClick={() => setSelectedRecId(rec.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden",
                    selectedRecId === rec.id
                      ? "bg-brand-500/10 border-brand-500/50 shadow-lg shadow-brand-500/10"
                      : "bg-slate-900/40 border-slate-700/30 hover:border-slate-600"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn("text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-widest", 
                      rec.status === "NEW" ? "bg-brand-500 text-white" : "bg-slate-700 text-slate-300"
                    )}>
                      {rec.status}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-black uppercase italic text-sm truncate">{rec.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-brand-500 h-full" style={{ width: `${rec.confidence * 100}%` }} />
                    </div>
                    <span className="text-xs font-black text-brand-500">{(rec.confidence * 100).toFixed(0)}%</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="md:col-span-3">
              {selectedRecommendation ? (
                <div className="glass-card p-8 space-y-8 sticky top-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                      {selectedRecommendation.title}
                    </h2>
                    <p className="text-slate-400 font-bold text-sm uppercase">
                      Recommendation Details • <span className="text-brand-500">{selectedRecommendation.type}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoBox label="Problem" content={selectedRecommendation.problemDetected} />
                    <InfoBox label="Solution" content={selectedRecommendation.proposedSolution} />
                    <InfoBox label="Severity" content={selectedRecommendation.severity} />
                    <InfoBox label="Impact" content={selectedRecommendation.expectedImpact} />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-700/50 pb-2">Technical Rationale (Explainability)</h4>
                    <pre className="text-xs bg-slate-950 p-4 rounded-lg font-mono text-slate-300 overflow-auto border border-slate-800 shadow-inner max-h-40">
                      {JSON.stringify(selectedRecommendation.explanation, null, 2)}
                    </pre>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleGenerateDraft(selectedRecommendation.id)}
                      className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-500/20"
                    >
                      <Sparkles className="w-5 h-5" />
                      GENERATE DRAFT FLOW
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 glass-card opacity-50 border-dashed">
                  <BrainCircuit className="w-16 h-16 text-slate-700 mb-4" />
                  <p className="font-black uppercase italic text-slate-500">Select a recommendation to view deep analysis</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "health" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-brand-500">System Optimization Center</h2>
            <div className="grid grid-cols-1 gap-4">
              {optimizations.map((opt: any, idx: number) => (
                <div key={idx} className="glass-card p-6 border-l-4 border-l-brand-600 group">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-800 text-brand-500 text-xs font-black px-2 py-0.5 rounded uppercase tracking-widest">
                          {opt.type}
                        </span>
                        <h3 className="font-black uppercase italic text-lg">{opt.flowName}</h3>
                      </div>
                      <p className="text-slate-400 text-sm font-bold mt-2 max-w-2xl">{opt.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-500 uppercase">Automation ID</p>
                      <p className="text-xs font-mono text-slate-400">{opt.flowId}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 gap-8 border-t border-slate-700/30 pt-4">
                    <div>
                      <span className="text-xs font-black text-slate-500 uppercase block mb-1">Current State</span>
                      <p className="text-xs font-bold text-slate-300">{opt.currentValue}</p>
                    </div>
                    <div>
                      <span className="text-xs font-black text-brand-500 uppercase block mb-1">AI Recommendation</span>
                      <p className="text-xs font-bold text-white flex items-center gap-2">
                        <Zap className="w-3 h-3 fill-brand-500 text-brand-500" />
                        {opt.suggestedValue}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {optimizations.length === 0 && (
                <div className="glass-card p-12 text-center">
                  <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-black italic uppercase italic">Systems Optimal</h3>
                  <p className="text-slate-500 font-bold text-sm">No critical performance deviations detected in active automations.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "intent" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                  <Wand2 className="w-6 h-6 text-brand-500" />
                  What do you want to automate?
                </h2>
                <p className="text-slate-400 font-bold text-sm uppercase">Describe your goal in natural language</p>
              </div>

              <div className="space-y-4">
                <textarea 
                  value={rawIntent}
                  onChange={(e) => setRawIntent(e.target.value)}
                  placeholder="e.g. Follow up stale leads after 24 hours with an AI Agent..."
                  className="w-full h-32 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-700"
                />
                
                <div className="flex flex-wrap gap-2">
                   {[
                    "Improve Meta lead conversion with auto-reply",
                    "Notify VIP investors when a new project is published",
                    "Follow up stale leads after 24 hours",
                    "Remind clients 3 days before payment due date"
                   ].map(hint => (
                     <button 
                        key={hint}
                        onClick={() => setRawIntent(hint)}
                        className="text-xs font-black uppercase tracking-tight bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full hover:bg-slate-700 transition-all border border-transparent hover:border-slate-600"
                     >
                       + {hint}
                     </button>
                   ))}
                </div>

                <button 
                  onClick={handleParseIntent}
                  disabled={isParsing || !rawIntent || !activeOrgId}
                  className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] shadow-xl shadow-brand-500/10"
                >
                  {isParsing ? (
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 animate-spin" />
                        PARSING INTENT...
                    </div>
                  ) : (
                    <>
                      <BrainCircuit className="w-5 h-5" />
                      ANALYZE & PROPOSE WORKFLOW
                    </>
                  )}
                </button>
              </div>
            </div>

            {proposal && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="md:col-span-2 space-y-6">
                  <div className="glass-card p-6 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <div className={cn(
                            "text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5",
                            proposal.confidence > 0.8 ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                        )}>
                            <ShieldCheck className="w-3 h-3" />
                            {(proposal.confidence * 100).toFixed(0)}% Confidence
                        </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">Business Goal</h3>
                        <p className="text-xl font-black italic uppercase italic text-brand-500">{proposal.businessGoal}</p>
                      </div>

                      <div className="flex gap-8 border-y border-slate-700/30 py-4">
                        <div>
                          <span className="text-xs font-black text-slate-500 uppercase block mb-1">Trigger</span>
                          <div className="flex items-center gap-2 text-white font-black italic text-sm">
                            <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {proposal.inferredTrigger}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-500 uppercase block mb-1">Target Entity</span>
                          <div className="flex items-center gap-2 text-white font-black italic text-sm">
                            <Layers className="w-4 h-4 text-brand-500" />
                            {proposal.targetEntity || 'System'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Proposed Action Sequence</h3>
                        <div className="space-y-3">
                            {proposal.inferredActions?.map((action: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-4 group">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-black text-xs border border-slate-700 group-hover:border-brand-500 transition-all">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 bg-slate-900/40 border border-slate-700/30 rounded-xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-brand-500" />
                                            <span className="font-black italic text-xs uppercase text-slate-200">{action.type}</span>
                                        </div>
                                        {action.config?.duration && (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase">
                                                <Clock className="w-3 h-3" />
                                                {action.config.duration}
                                            </div>
                                        )}
                                    </div>
                                    {idx < proposal.inferredActions.length - 1 && (
                                        <div className="absolute left-[15px] mt-12 w-[2px] h-4 bg-slate-800" />
                                    )}
                                </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-1 space-y-4">
                    <div className="glass-card p-6 bg-brand-500/5 border-brand-500/20">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-700/50 pb-2">AI Rationale</h3>
                        <p className="text-xs font-bold text-slate-300 leading-relaxed italic">
                           "{proposal.explanation}"
                        </p>
                        <div className="mt-6">
                            <button 
                                onClick={handleGenerateDraftFromIntent}
                                disabled={isPending}
                                className="w-full bg-slate-50 hover:bg-white text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-white/5 active:scale-95"
                            >
                                <Sparkles className="w-5 h-5" />
                                GENERATE DRAFT
                            </button>
                            <p className="text-xs text-center text-slate-500 font-bold uppercase mt-3 tracking-tighter">
                                Always generated as DRAFT & INACTIVE for safety.
                            </p>
                        </div>
                    </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "optimizations" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-brand-500">Auto-Optimizationsuggestions</h2>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Inspected {recommendations.filter((r: any) => r.sourceFlowId).length} flows for performance improvements</p>
                </div>
                <button 
                  onClick={handleAnalyze}
                  disabled={isPending || !activeOrgId}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-black px-6 py-2 rounded-xl flex items-center gap-2 transition-all border border-slate-700 text-xs"
                >
                  <Activity className={cn("w-4 h-4", isPending && "animate-spin")} />
                  RERUN ANALYSIS
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {recommendations.filter((r: any) => r.sourceFlowId).map((opt: any) => (
                    <div key={opt.id} className="glass-card p-0 overflow-hidden group">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/20">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                                    opt.severity === "CRITICAL" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                    opt.severity === "WARNING" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                    "bg-brand-500/10 border-brand-500/20 text-brand-500"
                                )}>
                                    <Zap className="w-5 h-5 fill-current" />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase italic text-lg tracking-tight">{opt.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Target Flow:</span>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{opt.sourceFlowId}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Confidence Score</div>
                                <div className="text-xl font-black italic text-brand-500">{(opt.confidence * 100).toFixed(0)}%</div>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Issue Detected</span>
                                    <p className="text-sm font-bold text-slate-300 leading-relaxed italic">"{opt.description}"</p>
                                </div>
                                <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800">
                                    <span className="text-xs font-black text-slate-500 uppercase block mb-2">Metrics Analysis</span>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs font-bold text-slate-600 uppercase block">Recent Failures</span>
                                            <span className="text-xs font-black text-white">{opt.signals?.failuresCount || '> 3'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-slate-600 uppercase block">Response Time</span>
                                            <span className="text-xs font-black text-white">{opt.signals?.responseTime || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4">
                                    <h4 className="text-xs font-black text-brand-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <ArrowRight className="w-3 h-3" />
                                        Proposed Optimization
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Modification</span>
                                            <span className="text-xs font-black text-white bg-brand-600 px-2 py-0.5 rounded uppercase">{opt.type.replace('_OPTIMIZATION', '')}</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-300">
                                            {opt.proposedSolution}
                                        </p>
                                        <div className="pt-2 mt-2 border-t border-brand-500/10">
                                            <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Expected Outcome</span>
                                            <p className="text-xs font-black text-green-500 uppercase italic">
                                                {opt.expectedImpact}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-900/40 border-t border-white/5 flex justify-end gap-3">
                            <button className="text-xs font-black uppercase text-slate-500 hover:text-white px-4 py-2 transition-all">
                                DISMISS
                            </button>
                            <button 
                                onClick={() => handleGenerateDraft(opt.id)}
                                disabled={isPending}
                                className="bg-white text-slate-950 text-xs font-black uppercase px-6 py-2 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2"
                            >
                                <Sparkles className="w-3 h-3" />
                                GENERATE OPTIMIZED DRAFT
                            </button>
                        </div>
                    </div>
                ))}

                {recommendations.filter((r: any) => r.sourceFlowId).length === 0 && (
                    <div className="glass-card p-12 text-center">
                        <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-black italic uppercase italic text-slate-400">No Optimized Drafts Needed</h3>
                        <p className="text-slate-600 font-bold text-sm">Active flows are performing within expected reliability parameters.</p>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* Generator Mock View */}
        {activeTab === "generator" && (
           <div className="glass-card p-12 text-center space-y-6">
              <Sparkles className="w-16 h-16 text-brand-500 mx-auto animate-pulse" />
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-2xl font-black italic uppercase">Workflow Blueprinting</h3>
                <p className="text-slate-400 font-bold text-sm uppercase">
                  Select a recommendation to preview the proposed graph structure before drafting.
                </p>
              </div>
              <button 
                onClick={() => setActiveTab("recommendations")}
                className="bg-white/5 hover:bg-white/10 text-slate-300 font-black px-8 py-3 rounded-xl uppercase italic text-xs border border-white/10 transition-all"
              >
                Browse Active Proposals
              </button>
           </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <div className="glass-card p-6 space-y-1 relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-all duration-700">
            <Icon className="w-24 h-24" />
        </div>
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black tracking-tighter italic">{value}</h3>
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{sub}</p>
    </div>
  );
}

function InfoBox({ label, content }: { label: string, content: string }) {
  return (
    <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/30">
        <span className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-1">{label}</span>
        <p className="text-xs font-bold text-slate-200 line-clamp-2">{content}</p>
    </div>
  );
}
