import { supabase } from "./supabase";
import { escapeHtml } from "./ui";

// "Account approved on Thursday, November 5, 2026 at 3:12 PM by Pat Admin." for an administrator looking at one umpire.
// (Every way of approving someone records who and when. Accounts made before that was recorded say so.)

export type ApprovalInfo = {
  hasAccount: boolean;            // is a sign-in account linked to this umpire?
  status: string | null;          // approved, pending or rejected
  approvedAt: string | null;
  approverName: string | null;    // null when it was not recorded
};

function when(iso: string): string {
  return new Date(iso)
    .toLocaleString("en-US", { timeZone: "America/Los_Angeles", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
    .replace(/\u202f/g, " ")
    .replace(" at ", " at ");
}

export function approvalNoteText(info: ApprovalInfo): string {
  if (!info.hasAccount) {
    return "No sign-in account is linked to this umpire yet (they have not signed up, or an administrator created the record).";
  }

  const by = info.approverName ? ` by ${info.approverName}` : "";

  switch (info.status) {
    case "approved":
      if (info.approvedAt) {
        return `Account approved on ${when(info.approvedAt)}${by}.${info.approverName ? "" : " Who approved it was not recorded."}`;
      }
      return `Account approved${by}. (When it was approved was not recorded.)`;

    case "pending":
      return "Account waiting for approval.";

    case "rejected":
      return `Registration refused${by}.`;

    default:
      return `Account status: ${info.status ?? "unknown"}.`;
  }
}

export function approvalNoteHtml(info: ApprovalInfo): string {
  return `<p class="directory-description umpire-approval">${escapeHtml(approvalNoteText(info))}</p>`;
}

// Looks it up. null if it cannot be read (the note is then simply left out).
export async function loadApprovalInfo(profileId: string | null): Promise<ApprovalInfo | null> {
  if (!profileId) return { hasAccount: false, status: null, approvedAt: null, approverName: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("account_status, approved_at, approved_by")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { account_status: string | null; approved_at: string | null; approved_by: string | null };
  let approverName: string | null = null;

  if (row.approved_by) {
    const approver = await supabase.from("profiles").select("display_name").eq("id", row.approved_by).maybeSingle();
    const name = (approver.data as { display_name: string | null } | null)?.display_name?.trim();
    approverName = name ? name : null;
  }

  return { hasAccount: true, status: row.account_status, approvedAt: row.approved_at, approverName };
}
