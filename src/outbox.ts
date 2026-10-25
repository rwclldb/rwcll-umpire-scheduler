import { supabase } from "./supabase";
import { escapeHtml } from "./ui";

type OutboxRow = {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  body: string;
  status: string;
  sent_via: string | null;
  created_at: string;
  sent_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Waiting",
  sent: "Sent",
  failed: "Failed",
  skipped: "Skipped",
};

const KIND_LABEL: Record<string, string> = {
  invitation: "Invitation",
  assignment: "Assignment",
  schedule_change: "Schedule change",
  reminder: "Reminder",
  broadcast: "Announcement",
  other: "Message",
};

// Remembered between reloads so the filter is not lost after an action.
let showEverything = false;

// Messages the system wants to send. Automatic sending is not switched on
// yet, so an administrator copies each one, sends it by hand, and marks it.
export async function renderOutbox(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <p class="directory-description">Loading the outbox&hellip;</p>
  `;

  const { data, error } = await supabase
    .from("email_outbox")
    .select("id, kind, to_email, subject, body, status, sent_via, created_at, sent_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    container.innerHTML = `
      <p class="message error">
        Unable to load the outbox. Refresh and try again.
      </p>
    `;
    console.error("Outbox load failed:", error.message);
    return;
  }

  const rows = (data ?? []) as OutboxRow[];
  const waiting = rows.filter(
    (row) => row.status === "queued" || row.status === "failed",
  );
  const visible = showEverything ? rows : waiting;

  container.innerHTML = `
    <section class="outbox" id="outbox-root">
      <p class="directory-description">
        Email sending is not set up yet, so messages wait here. Open a
        message, copy it, send it yourself, then press
        <strong>Mark as sent</strong>. When automatic sending is switched
        on later, waiting messages will go out by themselves.
      </p>

      <label for="outbox-filter">Show</label>
      <div class="role-add">
        <select id="outbox-filter">
          <option value="waiting" ${showEverything ? "" : "selected"}>
            Waiting only (${waiting.length})
          </option>
          <option value="all" ${showEverything ? "selected" : ""}>
            Everything (${rows.length})
          </option>
        </select>
        <button id="outbox-refresh" class="secondary-button"
          type="button">Refresh</button>
      </div>

      <p id="outbox-message" class="message" role="status"
        aria-live="polite"></p>

      ${visible.length
        ? `<ul class="role-list">${visible.map((row) => `
            <li class="role-account" data-message-id="${escapeHtml(row.id)}">
              <span class="role-account-name">${escapeHtml(row.subject)}</span>
              <span class="role-account-email">To: ${escapeHtml(row.to_email)}</span>
              <span class="role-account-contact">
                ${escapeHtml(KIND_LABEL[row.kind] ?? row.kind)}
                &middot; ${escapeHtml(STATUS_LABEL[row.status] ?? row.status)}
                &middot; ${escapeHtml(row.created_at.slice(0, 10))}
                ${row.sent_at
                  ? `&middot; sent ${escapeHtml(row.sent_at.slice(0, 10))}${row.sent_via === "manual" ? " by hand" : ""}`
                  : ""}
              </span>

              <details class="outbox-body">
                <summary>Show message</summary>
                <textarea readonly rows="8">${escapeHtml(row.body)}</textarea>
                <button type="button" class="secondary-button"
                  data-copy="${escapeHtml(row.id)}">Copy message</button>
              </details>

              ${row.status === "queued" || row.status === "failed"
                ? `<div class="account-actions">
                    <button type="button" class="primary-button"
                      data-sent="${escapeHtml(row.id)}">Mark as sent</button>
                    <button type="button" class="secondary-button"
                      data-skip="${escapeHtml(row.id)}">Skip</button>
                  </div>`
                : ""}
            </li>
          `).join("")}</ul>`
        : `<p class="directory-empty">
            ${showEverything
              ? "The outbox is empty."
              : "No messages are waiting to be sent."}
          </p>`}
    </section>
  `;

  const root = container.querySelector<HTMLElement>("#outbox-root");
  if (!root) return;

  const show = (text: string, kind: "error" | "success") => {
    const element = root.querySelector<HTMLElement>("#outbox-message");
    if (element) {
      element.textContent = text;
      element.className = `message ${kind}`;
    }
  };

  const reloadWithMessage = async (text: string) => {
    await renderOutbox(container);
    const element = container.querySelector<HTMLElement>("#outbox-message");
    if (element) {
      element.textContent = text;
      element.className = "message success";
    }
  };

  root.querySelector("#outbox-refresh")?.addEventListener("click", () => {
    void renderOutbox(container);
  });

  root.querySelector("#outbox-filter")?.addEventListener("change", (event) => {
    showEverything = (event.target as HTMLSelectElement).value === "all";
    void renderOutbox(container);
  });

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const copy = target.closest<HTMLButtonElement>("[data-copy]");
    if (copy) {
      const box = copy.parentElement?.querySelector("textarea");
      if (!box) return;
      void (async () => {
        try {
          await navigator.clipboard.writeText(box.value);
          show("Message copied.", "success");
        } catch {
          box.select();
          show("Press Ctrl+C to copy the selected message.", "success");
        }
      })();
      return;
    }

    const sent = target.closest<HTMLButtonElement>("[data-sent]");
    if (sent) {
      const id = sent.dataset.sent ?? "";
      sent.disabled = true;
      void (async () => {
        const { error: rpcError } = await supabase.rpc("mark_email_sent", {
          p_id: id,
        });
        if (rpcError) {
          show(`Could not update the message: ${rpcError.message}`, "error");
          sent.disabled = false;
          return;
        }
        await reloadWithMessage("Marked as sent.");
      })();
      return;
    }

    const skip = target.closest<HTMLButtonElement>("[data-skip]");
    if (skip) {
      const id = skip.dataset.skip ?? "";
      if (
        !window.confirm(
          "Skip this message? It will not be sent, but a record of it is kept.",
        )
      ) {
        return;
      }
      skip.disabled = true;
      void (async () => {
        const { error: rpcError } = await supabase.rpc("skip_email", {
          p_id: id,
        });
        if (rpcError) {
          show(`Could not update the message: ${rpcError.message}`, "error");
          skip.disabled = false;
          return;
        }
        await reloadWithMessage("Skipped.");
      })();
    }
  });
}
