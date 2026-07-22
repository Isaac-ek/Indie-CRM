import { LeadPriority, LeadStage } from "@/generated/prisma/client";

export type LeadScoringInput = {
  stage: LeadStage;
  priority: LeadPriority;
  budgetStatus?: string | null;
  lastContactAt?: Date | string | null;
  messageCount?: number;
};

/**
 * Calculates a dynamic predictive lead score between 0 and 100 based on engagement signals.
 */
export function calculateLeadScore(input: LeadScoringInput): number {
  let score = 50; // Neutral baseline

  // Stage weighting
  switch (input.stage) {
    case "WON":
      score += 40;
      break;
    case "PROPOSAL":
      score += 30;
      break;
    case "QUALIFIED":
      score += 20;
      break;
    case "FOLLOW_UP":
      score += 10;
      break;
    case "NEW":
      score += 5;
      break;
    case "LOST":
      return 0;
  }

  // Priority weighting
  switch (input.priority) {
    case "URGENT":
      score += 15;
      break;
    case "HIGH":
      score += 10;
      break;
    case "MEDIUM":
      score += 5;
      break;
    case "LOW":
      score -= 10;
      break;
  }

  // Budget signals
  if (input.budgetStatus && input.budgetStatus.toLowerCase() !== "unknown") {
    score += 10;
  }

  // Message engagement volume
  if (input.messageCount && input.messageCount > 3) {
    score += 10;
  }

  // Inactivity decay
  if (input.lastContactAt) {
    const lastContactDate = new Date(input.lastContactAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 14) {
      score -= 20;
    } else if (diffDays > 7) {
      score -= 10;
    }
  }

  // Bound score between 0 and 100
  return Math.min(100, Math.max(0, score));
}
