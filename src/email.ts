import { supabase } from "./supabase";

export type EmailKind =
  | "invitation"
  | "assignment"
  | "schedule_change"
  | "reminder"
  | "broadcast"
  | "other";

export type QueueResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// The ONE place the app asks for an email to be sent.
//
// Email sending is not set up yet, so this adds the message to the outbox
// (the email_outbox table). An administrator reviews the queue on the Outbox
// screen, sends each message by hand, and marks it sent. When automatic
// sending is switched on later, a sender will pick up the queued messages
// and every screen that calls this keeps working unchanged.
export async function queueEmail(message: {
  kind: EmailKind;
  toEmail: string;
  subject: string;
  body: string;
  toProfileId?: string | null;
}): Promise<QueueResult> {
  const { data, error } = await supabase.rpc("queue_email", {
    p_kind: message.kind,
    p_to_email: message.toEmail,
    p_subject: message.subject,
    p_body: message.body,
    p_to_profile_id: message.toProfileId ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Tell any open Outbox to reload, so it is never out of date.
  document.dispatchEvent(new CustomEvent("outbox:changed"));

  return { ok: true, id: String(data) };
}
