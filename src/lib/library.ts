export type SavedLetter = {
  id: string;
  title: string;
  text: string;
  savedAt: string;
  favourite: boolean;
};

export function validateLibrary(value: unknown): SavedLetter[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new Error("The saved library could not be read.");
  const ids = new Set<string>();
  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      item.title.length > 100 ||
      typeof item.text !== "string" ||
      !item.text.trim() ||
      item.text.length > 16000 ||
      typeof item.savedAt !== "string" ||
      !Number.isFinite(Date.parse(item.savedAt)) ||
      typeof item.favourite !== "boolean"
    )
      throw new Error(
        "The saved library could not be read. Export a recovery copy before resetting it.",
      );
    ids.add(item.id);
  }
  return value;
}

export function newLetter(title: string, text: string): SavedLetter {
  const entry = {
    id: crypto.randomUUID(),
    title: title.trim().slice(0, 100) || "Untitled letter",
    text: text.trim(),
    savedAt: new Date().toISOString(),
    favourite: false,
  };
  return validateLibrary([entry])[0];
}
