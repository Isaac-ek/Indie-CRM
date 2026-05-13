export type InboxLead = {
  id: string;
  name: string;
  company: string;
  title: string;
  stage: "New" | "Qualified" | "Proposal" | "Follow-up" | "Won" | "Lost";
  priority: "Low" | "Medium" | "High" | "Urgent";
  lastMessage: string;
  summary: string;
  nextAction: string;
  followUp: string;
  tags: string[];
};

export const inboxStageOptions = [
  "All",
  "New",
  "Qualified",
  "Proposal",
  "Follow-up",
  "Won",
  "Lost",
] as const;

export const inboxSortOptions = ["follow-up", "priority", "name", "stage"] as const;
export const inboxViewOptions = ["all", "overdue", "hot", "awaiting-reply", "won"] as const;

export type InboxStageOption = (typeof inboxStageOptions)[number];
export type InboxSortOption = (typeof inboxSortOptions)[number];
export type InboxViewOption = (typeof inboxViewOptions)[number];

type FilterArgs<TLead extends InboxLead> = {
  leads: TLead[];
  searchText?: string;
  selectedStage?: InboxStageOption;
  selectedSort?: InboxSortOption;
  selectedView?: InboxViewOption;
  selectedTag?: string;
};

export function filterAndSortInboxLeads<TLead extends InboxLead>({
  leads,
  searchText = "",
  selectedStage = "All",
  selectedSort = "follow-up",
  selectedView = "all",
  selectedTag = "",
}: FilterArgs<TLead>) {
  const normalizedSearch = searchText.trim().toLowerCase();

  return leads
    .filter((lead) => {
      const matchesStage = selectedStage === "All" || lead.stage === selectedStage;
      const matchesTag = !selectedTag || lead.tags.includes(selectedTag);
      const haystack = [
        lead.name,
        lead.company,
        lead.title,
        lead.lastMessage,
        lead.summary,
        lead.nextAction,
        lead.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const isOverdue =
        lead.followUp !== "Unscheduled" &&
        lead.followUp !== "Today" &&
        lead.followUp !== "Tomorrow";
      const isHot = lead.priority === "High" || lead.priority === "Urgent";
      const isAwaitingReply = lead.stage === "Follow-up" || lead.tags.includes("follow-up");
      const isWon = lead.stage === "Won";

      const matchesView =
        selectedView === "all" ||
        (selectedView === "overdue" && isOverdue) ||
        (selectedView === "hot" && isHot) ||
        (selectedView === "awaiting-reply" && isAwaitingReply) ||
        (selectedView === "won" && isWon);

      return matchesStage && matchesTag && matchesSearch && matchesView;
    })
    .sort((a, b) => {
      if (selectedSort === "priority") {
        const rank = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
        return rank[a.priority] - rank[b.priority] || a.name.localeCompare(b.name);
      }

      if (selectedSort === "name") {
        return a.name.localeCompare(b.name);
      }

      if (selectedSort === "stage") {
        return a.stage.localeCompare(b.stage) || a.name.localeCompare(b.name);
      }

      const followUpRank = { Today: 0, Tomorrow: 1, Unscheduled: 99 };
      const aRank = followUpRank[a.followUp as keyof typeof followUpRank] ?? 50;
      const bRank = followUpRank[b.followUp as keyof typeof followUpRank] ?? 50;
      return aRank - bRank || a.name.localeCompare(b.name);
    });
}
