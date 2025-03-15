export const issueStatuses = [
  "canceled",
  "completed",
  "started",
  "unstarted",
  "backlog",
  "triage",
];

export type IssueStatus = (typeof issueStatuses)[number];

export const cycleStates = ["active", "previous", "next"];

export type CycleState = (typeof issueStatuses)[number];
