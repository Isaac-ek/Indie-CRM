"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { quickUpdateLeadAction } from "@/lib/lead-actions";
import type { InboxLead } from "@/lib/lead-inbox";

type KanbanLead = {
  id: string;
  title: string;
  stage: InboxLead["stage"];
  priority: InboxLead["priority"];
  contactName: string;
  company?: string | null;
  tags: string[];
  lastContactAt?: string | null;
};

type KanbanBoardProps = {
  workspaceSlug: string;
  leads: KanbanLead[];
  canEdit: boolean;
};

const STAGES: { id: InboxLead["stage"]; label: string; badgeBg: string }[] = [
  { id: "New", label: "New Leads", badgeBg: "bg-blue-500/10 text-blue-700 border-blue-200" },
  { id: "Qualified", label: "Qualified", badgeBg: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { id: "Proposal", label: "Proposal", badgeBg: "bg-amber-500/10 text-amber-700 border-amber-200" },
  { id: "Follow-up", label: "Follow-up", badgeBg: "bg-violet-500/10 text-violet-700 border-violet-200" },
  { id: "Won", label: "Deal Won", badgeBg: "bg-teal-500/10 text-teal-700 border-teal-200" },
  { id: "Lost", label: "Lost", badgeBg: "bg-slate-500/10 text-slate-700 border-slate-200" },
];

export function KanbanBoard({ workspaceSlug, leads, canEdit }: KanbanBoardProps) {
  const [isPending, startTransition] = useTransition();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const moveLeadToStage = (leadId: string, newStage: string) => {
    if (!canEdit || isPending || !STAGES.some((stage) => stage.id === newStage)) return;
    const formData = new FormData();
    formData.append("workspaceSlug", workspaceSlug);
    formData.append("leadId", leadId);
    formData.append("action", "set-stage");
    formData.append("stage", newStage);
    formData.append("layout", "kanban");

    startTransition(async () => {
      await quickUpdateLeadAction(formData);
    });
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId;
    if (leadId) {
      moveLeadToStage(leadId, targetStage);
    }
    setDraggedLeadId(null);
  };

  return (
    <div className="mt-6 overflow-x-auto pb-4">
      <div className="grid min-w-[1200px] grid-cols-6 gap-4">
        {STAGES.map((stage) => {
          const columnLeads = leads.filter((lead) => lead.stage === stage.id);
          const isTargetOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              role="region"
              aria-label={`${stage.label} pipeline`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex flex-col rounded-3xl border p-4 transition-all ${
                isTargetOver
                  ? "border-emerald-500 bg-emerald-50/50 shadow-lg ring-2 ring-emerald-400/20"
                  : "border-slate-200/80 bg-slate-50/60"
              }`}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stage.badgeBg}`}>
                    {stage.label}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{columnLeads.length}</span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex flex-1 flex-col gap-3 min-h-[350px]">
                {columnLeads.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    Drop leads here
                  </div>
                ) : (
                  columnLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={canEdit && !isPending}
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={`group relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-emerald-300 ${
                        draggedLeadId === lead.id ? "opacity-40" : ""
                      } ${isPending ? "pointer-events-none opacity-60" : "cursor-grab active:cursor-grabbing"}`}
                    >
                      {/* Priority */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            lead.priority === "Urgent"
                              ? "bg-rose-100 text-rose-800"
                              : lead.priority === "High"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </div>

                      {/* Title & Contact */}
                      <Link
                        href={`/w/${workspaceSlug}/leads/${lead.id}`}
                        className="mt-2 block font-medium text-slate-900 group-hover:text-emerald-800 line-clamp-1"
                      >
                        {lead.title}
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {lead.contactName} {lead.company ? `• ${lead.company}` : ""}
                      </p>

                      {/* Tags */}
                      {lead.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {lead.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                          {lead.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{lead.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Stage Move Dropdown for Quick Access */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <label htmlFor={`move-${lead.id}`} className="text-[10px] text-slate-400">Move:</label>
                        <select
                          id={`move-${lead.id}`}
                          aria-label={`Move ${lead.contactName} to stage`}
                          disabled={!canEdit || isPending}
                          value={lead.stage}
                          onChange={(e) => moveLeadToStage(lead.id, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 outline-none hover:bg-white"
                        >
                          {STAGES.map((option) => <option key={option.id} value={option.id}>{option.id}</option>)}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
