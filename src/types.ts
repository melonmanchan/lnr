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

// The index here corresponds to the priority level of the issue according to Linear docs
export const issuePriorities = ["none", "urgent", "high", "normal", "low"];

export type IssuePriority = (typeof issuePriorities)[number];

export const outputFormats = ["table", "json"] as const;

export type OutputFormat = (typeof outputFormats)[number];
