export type CanvasBackgroundMode = "plain" | "grid" | "dot";

export type CommentsViewMode = "all" | "element" | "mentions";

export type MentionInboxState = {
  unreadCount: number;
  latestMentionCommentId: string | null;
  latestMentionElementId: string | null;
};

export type PresenceSource = "live" | "cache" | "stale" | "none";

export type MathTemplateId =
  | "coord-plane"
  | "number-line"
  | "table"
  | "proof";

export type RoomActivity = {
  unresolvedComments: number;
  onlineCount: number | null;
  onlineCountSampledAt: string | null;
  onlineCountSource: PresenceSource;
};
