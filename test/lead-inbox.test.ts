import test from "node:test";
import assert from "node:assert/strict";
import { filterAndSortInboxLeads } from "@/lib/lead-inbox";

const leads = [
  {
    id: "lead-a",
    name: "Maya Cole",
    company: "Studio Lantern",
    title: "Brand refresh",
    stage: "Qualified" as const,
    priority: "High" as const,
    lastMessage: "Need a rebrand before June.",
    summary: "Timeline-driven brand project.",
    nextAction: "Send discovery recap.",
    followUp: "Today",
    tags: ["branding", "high intent"],
  },
  {
    id: "lead-b",
    name: "Nina Park",
    company: "Park Copy Co.",
    title: "Retainer support",
    stage: "Follow-up" as const,
    priority: "Medium" as const,
    lastMessage: "Still deciding on content support.",
    summary: "Warm but stalled retainer conversation.",
    nextAction: "Offer two package options.",
    followUp: "Apr 14",
    tags: ["follow-up", "copywriting"],
  },
  {
    id: "lead-c",
    name: "David Owusu",
    company: "Signal Health",
    title: "Healthcare rebuild",
    stage: "Won" as const,
    priority: "Urgent" as const,
    lastMessage: "Approve the fixed-price estimate.",
    summary: "Healthcare rebuild with budget confirmed.",
    nextAction: "Send onboarding checklist.",
    followUp: "Tomorrow",
    tags: ["healthcare", "budget confirmed"],
  },
];

test("filters inbox leads by saved view and tag", () => {
  const awaitingReply = filterAndSortInboxLeads({
    leads,
    selectedView: "awaiting-reply",
  });
  assert.deepEqual(awaitingReply.map((lead) => lead.id), ["lead-b"]);

  const tagged = filterAndSortInboxLeads({
    leads,
    selectedTag: "budget confirmed",
  });
  assert.deepEqual(tagged.map((lead) => lead.id), ["lead-c"]);
});

test("searches across title, summary, message, and tags", () => {
  const bySummary = filterAndSortInboxLeads({
    leads,
    searchText: "healthcare rebuild",
  });
  assert.deepEqual(bySummary.map((lead) => lead.id), ["lead-c"]);

  const byTag = filterAndSortInboxLeads({
    leads,
    searchText: "copywriting",
  });
  assert.deepEqual(byTag.map((lead) => lead.id), ["lead-b"]);
});

test("sorts hot and overdue leads predictably", () => {
  const byPriority = filterAndSortInboxLeads({
    leads,
    selectedSort: "priority",
  });
  assert.deepEqual(byPriority.map((lead) => lead.id), ["lead-c", "lead-a", "lead-b"]);

  const overdue = filterAndSortInboxLeads({
    leads,
    selectedView: "overdue",
  });
  assert.deepEqual(overdue.map((lead) => lead.id), ["lead-b"]);
});
