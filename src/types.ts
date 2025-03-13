export const issueStates = [
  "canceled",
  "completed",
  "started",
  "unstarted",
  "backlog",
  "triage",
];

export type IssueState = (typeof issueStates)[number];

export const cycleStates = ["active", "previous", "next"];

export type CycleState = (typeof issueStates)[number];
