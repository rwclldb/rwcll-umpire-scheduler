import { reloadSetup } from "./state";
import { supabase } from "../supabase";

export type DeletableTable =
  | "leagues"
  | "seasons"
  | "divisions"
  | "locations"
  | "teams";

// Shared by every Delete button. Asks for confirmation, deletes the
// record, and explains clearly if the database refuses because other
// records still use it.
export function wireDeleteButton(
  container: HTMLElement,
  options: {
    buttonId: string;
    table: DeletableTable;
    noun: string;
    getId: () => string | null;
    inUseMessage: string;
    onDeleted: () => void;
  },
): void {
  const button = container.querySelector<HTMLButtonElement>(options.buttonId);
  if (!button) return;

  button.addEventListener("click", async () => {
    const recordId = options.getId();
    if (!recordId) return;

    const message = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    const recordName = button.closest("form")
      ?.querySelector<HTMLInputElement>('[name="name"]')?.defaultValue ?? "";

    const confirmed = window.confirm(
      `Delete the ${options.noun} "${recordName}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    const originalLabel = button.textContent ?? "Delete";
    button.disabled = true;
    button.textContent = "Deleting…";

    const { data: deleted, error } = await supabase
      .from(options.table)
      .delete()
      .eq("id", recordId)
      .select("id");

    if (error || !deleted || deleted.length === 0) {
      if (message) {
        message.textContent = error?.code === "23503"
          ? options.inUseMessage
          : error
            ? `Could not delete ${options.noun}: ${error.message}`
            : `The ${options.noun} was not deleted. You may not have ` +
              `permission, or it was already removed.`;
        message.className = "message error";
      }
      button.disabled = false;
      button.textContent = originalLabel;
      return;
    }

    options.onDeleted();
    await reloadSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent =
        `${options.noun.charAt(0).toUpperCase()}${options.noun.slice(1)} deleted.`;
      successMessage.className = "message success";
    }
  });
}
