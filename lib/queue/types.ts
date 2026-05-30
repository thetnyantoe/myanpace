export type TicketStatus =
  | "PENDING"
  | "NOTIFIED"
  | "SERVING"
  | "COMPLETED"
  | "NOSHOW";

/** Tickets still occupying the queue / service flow */
export const ACTIVE_QUEUE_STATUSES: TicketStatus[] = [
  "PENDING",
  "NOTIFIED",
  "SERVING",
];

/** Tickets that are finished or removed from the queue */
export const TERMINAL_STATUSES: TicketStatus[] = ["COMPLETED", "NOSHOW"];

export function isActiveQueueStatus(status: string): boolean {
  return ACTIVE_QUEUE_STATUSES.includes(status as TicketStatus);
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status as TicketStatus);
}

export interface QueueTicket {
  id: string;
  shopId: string;
  ticketNo: number;
  status: TicketStatus;
  createdAt: string;
  notifiedAt: string | null;
  servedAt: string | null;
  personCount: number;
  subscription: PushSubscriptionJSON | null;
}

export type StaffFilter = TicketStatus | "all";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: "Waiting",
  NOTIFIED: "Called",
  SERVING: "Serving",
  COMPLETED: "Completed",
  NOSHOW: "No Show",
};
