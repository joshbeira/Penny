import { create } from "zustand";
import { newLetter, validateLibrary } from "../lib/library";
import type { SavedLetter } from "../lib/library";

export const LIBRARY_KEY = "penny.library.v1";
function read(): { letters: SavedLetter[]; error: string } {
  try {
    return {
      letters: validateLibrary(
        JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? "[]"),
      ),
      error: "",
    };
  } catch {
    return {
      letters: [],
      error:
        "Your library could not be opened. Download a recovery copy before clearing it, or check your browser’s storage settings.",
    };
  }
}
type LibraryState = ReturnType<typeof read> & {
  save: (title: string, text: string) => void;
  favourite: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};
export const useLibrary = create<LibraryState>((set) => {
  function commit(letters: SavedLetter[]) {
    validateLibrary(letters);
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(letters));
    } catch {
      throw new Error(
        "Your browser could not save this change. Free some storage or download the text instead.",
      );
    }
    set({ letters, error: "" });
  }
  function current() {
    const loaded = read();
    if (loaded.error) throw new Error(loaded.error);
    return loaded.letters;
  }
  return {
    ...read(),
    save: (title, text) => {
      const letters = current();
      if (letters.length >= 100)
        throw new Error(
          "Your library holds 100 letters. Export and remove one to make space.",
        );
      commit([newLetter(title, text), ...letters]);
    },
    favourite: (id) =>
      commit(
        current().map((letter) =>
          letter.id === id
            ? { ...letter, favourite: !letter.favourite }
            : letter,
        ),
      ),
    remove: (id) => commit(current().filter((letter) => letter.id !== id)),
    clear: () => {
      localStorage.removeItem(LIBRARY_KEY);
      set({ letters: [], error: "" });
    },
  };
});
window.addEventListener("storage", (event) => {
  if (event.key === LIBRARY_KEY || event.key === null)
    useLibrary.setState(read());
});
