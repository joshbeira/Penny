import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLibrary, LIBRARY_KEY } from "../state/library";
import { downloadText } from "../lib/download";
const BUTTON = "reader-button";

export default function Library() {
  const { letters, error, favourite, remove, clear } = useLibrary();
  const [query, setQuery] = useState("");
  const [favourites, setFavourites] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();
  const matches = letters
    .filter(
      (entry) =>
        (!favourites || entry.favourite) &&
        `${entry.title} ${entry.text}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.favourite) - Number(a.favourite) ||
        b.savedAt.localeCompare(a.savedAt),
    );
  function action(work: () => void, success: string) {
    try {
      work();
      setMessage(success);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Your library could not be updated.",
      );
    }
  }
  return (
    <div className="reader-stack">
      <p className="eyebrow">Your words, kept close</p>
      <h2 className="reader-title">Your letter library</h2>
      <p className="text-text-dim">
        Text you choose to save, kept in this browser. No account, no uploads.
        Clearing browser data removes this library; export a copy to keep it
        elsewhere.
      </p>
      <p role="status">{message || error}</p>
      <label className="field-label">
        Search letters
        <input
          className="text-field"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <button
        className={BUTTON}
        aria-pressed={favourites}
        onClick={() => setFavourites(!favourites)}
      >
        Favourites only
      </button>
      {matches.length === 0 && (
        <section className="reader-result">
          <h3 className="text-card">
            {letters.length
              ? "No matching letters"
              : "Your next letter belongs here."}
          </h3>
          <p className="mt-3 text-text-dim">
            Save a reading to find it again, even without an internet
            connection.
          </p>
          <Link className="feedback-link mt-3" to="/postbox">
            Read a letter
          </Link>
        </section>
      )}
      <ul className="reader-stack" aria-label="Saved letters">
        {matches.map((letter) => (
          <li key={letter.id} className="reader-result">
            <h3 className="text-card">{letter.title}</h3>
            <p className="mt-2 text-caption text-text-dim">
              {letter.favourite ? "Favourite · " : ""}
              {new Date(letter.savedAt).toLocaleDateString(undefined, {
                dateStyle: "medium",
              })}
            </p>
            <p className="letter-excerpt">{letter.text.slice(0, 140)}</p>
            <div className="flex flex-wrap gap-3">
              <button
                className={BUTTON}
                onClick={() =>
                  navigate(`/postbox?letter=${encodeURIComponent(letter.id)}`)
                }
              >
                Open letter
              </button>
              <button
                className={BUTTON}
                aria-pressed={letter.favourite}
                onClick={() =>
                  action(() => favourite(letter.id), "Favourite updated.")
                }
              >
                {letter.favourite ? "Remove favourite" : "Add favourite"}
              </button>
              <button className={BUTTON} onClick={() => setDeleting(letter.id)}>
                Delete letter
              </button>
            </div>
            {deleting === letter.id && (
              <div
                className="mt-4"
                role="group"
                aria-label="Confirm letter deletion"
              >
                <p>
                  Delete “{letter.title}” from this library? Exported copies are
                  unaffected.
                </p>
                <button
                  className={BUTTON}
                  onClick={() => {
                    action(() => remove(letter.id), "Letter deleted.");
                    setDeleting(null);
                  }}
                >
                  Confirm deletion
                </button>
                <button className={BUTTON} onClick={() => setDeleting(null)}>
                  Cancel
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {letters.length > 0 && (
        <button
          className={BUTTON}
          onClick={() =>
            downloadText(
              "penny-library.json",
              JSON.stringify({ version: 1, letters }, null, 2),
            )
          }
        >
          Export library
        </button>
      )}
      {error && (
        <button
          className={BUTTON}
          onClick={() =>
            action(
              () =>
                downloadText(
                  "penny-library-recovery.txt",
                  localStorage.getItem(LIBRARY_KEY) ?? "",
                ),
              "Recovery download started.",
            )
          }
        >
          Download recovery copy
        </button>
      )}
      {(letters.length > 0 || error) && (
        <details>
          <summary className="feedback-link">Delete all saved letters</summary>
          <p className="my-3">
            This cannot be undone. Export your library first if you want to keep
            a copy.
          </p>
          <button
            className={BUTTON}
            onClick={() => action(clear, "Saved letters deleted.")}
          >
            Permanently delete library
          </button>
        </details>
      )}
    </div>
  );
}
