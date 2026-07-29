"use client";

import { useState } from "react";
import {
  WorkflowRule,
  WorkflowTriggerType,
  WorkflowActionType,
  evaluateWorkflowRules,
} from "@/lib/workflows";

type WorkflowBuilderProps = {
  workspaceSlug: string;
};

const DEFAULT_RULES: WorkflowRule[] = [
  {
    id: "rule_1",
    tenantId: "demo",
    name: "Auto-escalate High Score Leads to URGENT",
    trigger: "ON_HIGH_SCORE",
    minScore: 75,
    action: "AUTO_SET_PRIORITY",
    actionPayload: { priority: "URGENT" },
    enabled: true,
  },
  {
    id: "rule_2",
    tenantId: "demo",
    name: "Schedule 2-Day Follow-Up on Proposal Stage",
    trigger: "ON_STAGE_CHANGE",
    targetStage: "PROPOSAL" as const,
    action: "AUTO_SCHEDULE_FOLLOWUP",
    actionPayload: { days: 2 },
    enabled: true,
  },
  {
    id: "rule_3",
    tenantId: "demo",
    name: "Tag VIP Lead when Score >= 85",
    trigger: "ON_LEAD_CREATED",
    minScore: 85,
    action: "TAG_LEAD",
    actionPayload: { tag: "VIP" },
    enabled: false,
  },
];

export function WorkflowBuilder({ workspaceSlug }: WorkflowBuilderProps) {
  const [rules, setRules] = useState<WorkflowRule[]>(DEFAULT_RULES);
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);

  // New rule form state
  const [ruleName, setRuleName] = useState("");
  const [trigger, setTrigger] = useState<WorkflowTriggerType>("ON_STAGE_CHANGE");
  const [targetStage, setTargetStage] = useState("QUALIFIED");
  const [minScore, setMinScore] = useState(70);
  const [action, setAction] = useState<WorkflowActionType>("AUTO_SET_PRIORITY");
  const [actionValue, setActionValue] = useState("HIGH");

  // Tester state
  const [testStage, setTestStage] = useState("QUALIFIED");
  const [testScore, setTestScore] = useState(80);
  const [testTrigger, setTestTrigger] = useState<WorkflowTriggerType>("ON_STAGE_CHANGE");
  const [testResults, setTestResults] = useState<Array<{ ruleId: string; action: string; payload: Record<string, unknown> }> | null>(null);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const newRule: WorkflowRule = {
      id: `rule_${Date.now()}`,
      tenantId: "demo",
      name: ruleName.trim(),
      trigger,
      targetStage: trigger === "ON_STAGE_CHANGE" ? (targetStage as any) : undefined,
      minScore: trigger === "ON_HIGH_SCORE" ? minScore : undefined,
      action,
      actionPayload:
        action === "AUTO_SET_PRIORITY"
          ? { priority: actionValue }
          : action === "AUTO_SCHEDULE_FOLLOWUP"
          ? { days: parseInt(actionValue, 10) || 2 }
          : { tag: actionValue },
      enabled: true,
    };

    setRules((prev) => [...prev, newRule]);
    setRuleName("");
    setShowNewRuleModal(false);
  };

  const runRuleTest = () => {
    const context = {
      leadId: "lead_simulated",
      tenantId: "demo",
      stage: testStage as any,
      score: testScore,
      priority: "MEDIUM" as const,
    };
    const results = evaluateWorkflowRules(rules, context, testTrigger);
    setTestResults(results);
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Rule Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-teal-700">Automation Engine</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">Visual Workflow Rules</h3>
          <p className="mt-1 text-sm text-slate-600">
            Define automated triggers and actions when lead stage, priority, or AI scores change.
          </p>
        </div>
        <button
          onClick={() => setShowNewRuleModal(true)}
          className="rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:scale-[1.01]"
        >
          + Add Workflow Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-2xl border p-4 transition ${
              rule.enabled ? "border-slate-200 bg-white" : "border-slate-200/60 bg-slate-50/70 opacity-75"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      rule.enabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                    }`}
                  />
                  <h4 className="font-semibold text-slate-900">{rule.name}</h4>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">
                    Trigger: {rule.trigger}
                  </span>
                  {rule.targetStage && (
                    <span className="rounded-md bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5">
                      Stage: {rule.targetStage}
                    </span>
                  )}
                  {rule.minScore !== undefined && (
                    <span className="rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5">
                      Min Score: {rule.minScore}+
                    </span>
                  )}
                  <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5">
                    Action: {rule.action} ({JSON.stringify(rule.actionPayload)})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    rule.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {rule.enabled ? "Active" : "Disabled"}
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Rule Tester */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5">
        <h4 className="font-semibold text-slate-900">🧪 Interactive Rule Evaluator</h4>
        <p className="mt-1 text-xs text-slate-600">
          Simulate a lead update to test which of your active rules will be executed.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Event Trigger</label>
            <select
              value={testTrigger}
              onChange={(e) => setTestTrigger(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs"
            >
              <option value="ON_STAGE_CHANGE">ON_STAGE_CHANGE</option>
              <option value="ON_HIGH_SCORE">ON_HIGH_SCORE</option>
              <option value="ON_LEAD_CREATED">ON_LEAD_CREATED</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Lead Stage</label>
            <select
              value={testStage}
              onChange={(e) => setTestStage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs"
            >
              <option value="NEW">NEW</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="PROPOSAL">PROPOSAL</option>
              <option value="WON">WON</option>
              <option value="LOST">LOST</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Lead Score (0-100)</label>
            <input
              type="number"
              value={testScore}
              onChange={(e) => setTestScore(parseInt(e.target.value, 10) || 0)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runRuleTest}
              className="w-full rounded-xl bg-teal-800 p-2 text-xs font-semibold text-white shadow hover:bg-teal-900"
            >
              Run Evaluation Test
            </button>
          </div>
        </div>

        {testResults !== null && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <p className="font-semibold text-slate-900">
              Evaluation Results: {testResults.length} Action{testResults.length === 1 ? "" : "s"} Triggered
            </p>
            {testResults.length === 0 ? (
              <p className="mt-1 text-slate-500">No active rules matched these lead criteria.</p>
            ) : (
              <div className="mt-2 space-y-1">
                {testResults.map((r, i) => {
                  const ruleObj = rules.find((rl) => rl.id === r.ruleId);
                  return (
                    <div key={i} className="flex items-center gap-2 text-emerald-800">
                      <span>✓</span>
                      <span className="font-semibold">{ruleObj?.name}</span> ➔ {r.action} (
                      {JSON.stringify(r.payload)})
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Rule Modal */}
      {showNewRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddRule}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-semibold text-slate-900">Create Workflow Rule</h3>

            <div>
              <label className="text-xs font-semibold text-slate-700">Rule Name</label>
              <input
                type="text"
                required
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Set Urgent Priority on Qualified Stage"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Trigger</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                >
                  <option value="ON_STAGE_CHANGE">ON_STAGE_CHANGE</option>
                  <option value="ON_HIGH_SCORE">ON_HIGH_SCORE</option>
                  <option value="ON_LEAD_CREATED">ON_LEAD_CREATED</option>
                </select>
              </div>

              {trigger === "ON_STAGE_CHANGE" ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700">Target Stage</label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  >
                    <option value="NEW">NEW</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROPOSAL">PROPOSAL</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              ) : trigger === "ON_HIGH_SCORE" ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700">Min Score</label>
                  <input
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                >
                  <option value="AUTO_SET_PRIORITY">AUTO_SET_PRIORITY</option>
                  <option value="AUTO_SCHEDULE_FOLLOWUP">AUTO_SCHEDULE_FOLLOWUP</option>
                  <option value="TAG_LEAD">TAG_LEAD</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Action Value</label>
                <input
                  type="text"
                  required
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder={action === "AUTO_SET_PRIORITY" ? "HIGH / URGENT" : action === "AUTO_SCHEDULE_FOLLOWUP" ? "2 (days)" : "VIP"}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewRuleModal(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-teal-900"
              >
                Save Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
