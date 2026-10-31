import { escapeHtml } from "../ui";
import { formatDate, formatTime } from "./format";
import type { GameNote } from "./types";

// Day-of notes on a game: the list, and a box to add one. (This file writes the
// HTML; game-notes.ts makes the buttons work.)

export const NOTE_MAX_LENGTH = 1000;

// "Oct 31 \u00b7 9:25 AM"
export function noteWhen(iso: string): string {
  return `${formatDate(iso)} \u00b7 ${formatTime(iso)}`;
}

export function notesHtml(
  gameId: string,
  notes: GameNote[],
  options: { canRemove: boolean }
): string {
  const list = notes.length === 0
    ? ""
    : `
      <h4 class="notes-title">Notes (${notes.length})</h4>
      <ul class="notes-list">
        ${notes.map((note) => `
          <li class="note" data-note="${escapeHtml(note.id)}">
            <span class="note-meta"><strong>${escapeHtml(note.author_name)}</strong> &middot; ${escapeHtml(noteWhen(note.created_at))}${note.admin_only ? ` <span class="board-tag board-tag-warn note-private-tag">Administrators only</span>` : ""}</span>
            <span class="note-body">${escapeHtml(note.body)}</span>
            ${options.canRemove
              ? `<button type="button" class="secondary-button note-remove" data-note-remove="${escapeHtml(note.id)}" aria-label="Remove the note by ${escapeHtml(note.author_name)}">Remove</button>`
              : ""}
          </li>`).join("")}
      </ul>`;

  return `
    <div class="notes" data-notes-for="${escapeHtml(gameId)}">
      ${list}
      <p class="note-message message" role="status" aria-live="polite"></p>
      <details class="note-add">
        <summary>Add a note</summary>
        <form class="note-form" data-game="${escapeHtml(gameId)}">
          <label>Note
            <textarea class="note-text" rows="3" maxlength="${NOTE_MAX_LENGTH}" required
              placeholder="For example: the field is closed, use Field B"></textarea>
          </label>
          <label class="note-private">
            <input type="checkbox" class="note-admin-only" />
            Only administrators can read this note
          </label>
          <p class="note-help">
            Everyone on this game, and the administrators, can read a note unless you tick the box.
            Please do not write medical details: for an injury, say only that one happened (use
            initials, not a full name) and tell an administrator.
          </p>
          <div class="note-actions">
            <button type="submit" class="primary-button">Save note</button>
          </div>
        </form>
      </details>
    </div>`;
}

// The notes on paper: one line per note.
export function notesPrintHtml(notes: GameNote[]): string {
  return notes
    .map((note) => `<div class="print-note"><strong>${escapeHtml(note.author_name)}</strong> (${escapeHtml(noteWhen(note.created_at))}): ${escapeHtml(note.body)}</div>`)
    .join("");
}
