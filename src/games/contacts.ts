// Phone numbers for the printed schedule.
//
// For an adult umpire: their number. For a youth umpire: their own number and
// a parent's or guardian's (the emergency contact on their record), both
// printed. The number shown for someone with an account is the ACCOUNT's
// number, otherwise the one on the umpire record.

export type ContactNumbers = {
  own: string | null; // the umpire's own number (the account's, else the record's)
  parent: string | null; // a youth umpire's emergency contact, normally a parent or guardian
  youth: boolean;
};

// "650-555-1234", or for a youth umpire "Own 650-555-1111 · Parent 408-555-2222".
// An empty text means no lookup was made (the option was off).
export function contactText(contact: ContactNumbers | undefined): string {
  if (!contact) return "";

  if (contact.youth) {
    const parts = [
      contact.own ? `Own ${contact.own}` : "",
      contact.parent ? `Parent ${contact.parent}` : "",
    ].filter(Boolean);

    return parts.length ? parts.join(" \u00b7 ") : "no phone on file";
  }

  return contact.own ?? "no phone on file";
}

// Puts together what was found for each umpire: the account's phone wins over
// the phone on the umpire record.
export function combineContacts(
  umpires: { id: string; profile_id: string | null; phone: string | null; classification: string }[],
  accountPhones: Map<string, string | null>,
  parentPhones: Map<string, string | null>
): Map<string, ContactNumbers> {
  const result = new Map<string, ContactNumbers>();

  for (const umpire of umpires) {
    const account = umpire.profile_id ? accountPhones.get(umpire.profile_id) : null;
    const youth = umpire.classification === "youth";

    result.set(umpire.id, {
      own: clean(account) ?? clean(umpire.phone),
      parent: youth ? clean(parentPhones.get(umpire.id)) : null,
      youth,
    });
  }

  return result;
}

function clean(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return text === "" ? null : text;
}
