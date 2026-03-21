"use client";

import { CheckCircle2, Clock, Plus } from "lucide-react";
import { useState } from "react";
import { Tarea } from "@prisma/client"; // Assumes Tarea is available in type generation
import { format } from "date-fns";
import { es } from "date-fns/locale";
import NewTaskModal from "./new-task-modal";

interface TaskListProps {
    tasks: Tarea[];
}

export default function TaskList({ tasks: initialTasks }: TaskListProps) {
    const [tasks, setTasks] = useState(initialTasks);

    // Filter mainly pending tasks
    //   const pendingTasks = tasks.filter(t => t.estado === "PENDIENTE");

    return (
        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-brand-400" />
                    Mis Tareas
                </h3>
                <NewTaskModal>
                    <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <Plus className="w-4 h-4" />
                    </button>
                </NewTaskModal>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {tasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-500 text-sm">
                        No tienes tareas pendientes.
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="p-3 bg-slate-950/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                            <div className="flex items-start gap-3">
                                <button className="mt-1 w-4 h-4 rounded border border-slate-600 hover:border-brand-500 hover:bg-brand-500/20 transition-all flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white group-hover:text-brand-300 transition-colors">
                                        {task.titulo}
                                    </p>
                                    {task.descripcion && (
                                        <p className="text-xs text-slate-600 dark:text-slate-500 line-clamp-1">{task.descripcion}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="flex items-center gap-1 text-xs text-slate-900 dark:text-slate-400 font-bold bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(task.fechaVencimiento), "d MMM", { locale: es })}
                                        </span>
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${task.prioridad === 'ALTA' ? 'bg-red-500/20 text-red-400' :
                                            task.prioridad === 'MEDIA' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-slate-700 text-slate-400'
                                            }`}>
                                            {task.prioridad}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
