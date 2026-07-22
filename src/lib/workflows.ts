import { LeadPriority, LeadStage } from "@/generated/prisma/client";

export type WorkflowTriggerType =
  | "ON_LEAD_CREATED"
  | "ON_STAGE_CHANGE"
  | "ON_HIGH_SCORE";

export type WorkflowActionType =
  | "AUTO_SET_PRIORITY"
  | "AUTO_SCHEDULE_FOLLOWUP"
  | "TAG_LEAD";

export type WorkflowRule = {
  id: string;
  tenantId: string;
  name: string;
  trigger: WorkflowTriggerType;
  targetStage?: LeadStage;
  minScore?: number;
  action: WorkflowActionType;
  actionPayload: Record<string, unknown>;
  enabled: boolean;
};

export type WorkflowEvaluationContext = {
  leadId: string;
  tenantId: string;
  stage: LeadStage;
  score: number;
  priority: LeadPriority;
};

/**
 * Evaluates workflow automation rules against a lead state context and returns triggered actions.
 */
export function evaluateWorkflowRules(
  rules: WorkflowRule[],
  context: WorkflowEvaluationContext,
  trigger: WorkflowTriggerType
): Array<{ ruleId: string; action: WorkflowActionType; payload: Record<string, unknown> }> {
  const triggeredActions: Array<{
    ruleId: string;
    action: WorkflowActionType;
    payload: Record<string, unknown>;
  }> = [];

  for (const rule of rules) {
    if (!rule.enabled || rule.tenantId !== context.tenantId || rule.trigger !== trigger) {
      continue;
    }

    if (rule.targetStage && rule.targetStage !== context.stage) {
      continue;
    }

    if (rule.minScore !== undefined && context.score < rule.minScore) {
      continue;
    }

    triggeredActions.push({
      ruleId: rule.id,
      action: rule.action,
      payload: rule.actionPayload,
    });
  }

  return triggeredActions;
}
