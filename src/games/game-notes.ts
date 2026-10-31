import { supabase } from "../supabase";
import { demoNowIso } from "../clock";

// Makes the "Add a note" and "Remove" buttons work inside `container`.
// `refresh` redraws the screen afterwards, with a short message.
export function wireNotes(
  container: HTMLElement,
  refresh: (notice: string) => void,
  signal?: AbortSignal
): void {
  container.addEventListener("submit", (event) => {
    const form = (event.target as HTMLElement).closest<HTMLFormElement>("form.note-form");
    if (!form) return;

    event.preventDefault();

    const text = form.querySelector<HTMLTextAreaElement>(".note-text")!;
    const message = form.closest(".notes")!.querySelector<HTMLElement>(".note-message")!;
    const body = text.value.trim();

    if (!body) {
      message.textContent = "Write something first.";
      message.className = "note-message message error";
      return;
    }

    const save = form.querySelector<HTMLButtonElement>("button[type='submit']")!;
    save.disabled = true;

    void (async () => {
      const pretend = demoNowIso();
      const { error } = await supabase.rpc("add_game_note", {
        p_game_id: form.dataset.game,
        p_body: body,
        ...(pretend ? { p_now: pretend } : {}),
      });

      if (error) {
        save.disabled = false;
        message.textContent = `Could not save the note. ${error.message}`;
        message.className = "note-message message error";
        return;
      }

      refresh("Note added.");
    })();
  }, signal ? { signal } : undefined);

  container.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-note-remove]");
    if (!button) return;

    button.disabled = true;

    void (async () => {
      const { error } = await supabase.rpc("delete_game_note", { p_note_id: button.dataset.noteRemove });

      if (error) {
        button.disabled = false;
        const message = button.closest(".notes")?.querySelector<HTMLElement>(".note-message");
        if (message) {
          message.textContent = `Could not remove the note. ${error.message}`;
          message.className = "note-message message error";
        }
        return;
      }

      refresh("Note removed.");
    })();
  }, signal ? { signal } : undefined);
}
