import { useEffect, useState } from "react";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export default function InstallPenny() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [message, setMessage] = useState("");
  const [installed, setInstalled] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches,
  );
  useEffect(() => {
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
      setMessage("Penny is installed on this device.");
    };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return (
    <section className="product-card">
      <h3 className="text-card">Keep Penny within reach.</h3>
      <p className="mt-3 text-text-dim">
        Add the web app to your home screen. After a completed first online
        load, the reader and saved letters work offline.
      </p>
      {prompt && !installed && (
        <button
          className="reader-button mt-4"
          onClick={async () => {
            try {
              await prompt.prompt();
              const choice = await prompt.userChoice;
              setMessage(
                choice.outcome === "accepted"
                  ? "Installation requested. Follow your browser’s instructions."
                  : "You can install Penny later from your browser menu.",
              );
            } catch {
              setMessage("Use your browser menu to install Penny.");
            }
            setPrompt(null);
          }}
        >
          Install Penny
        </button>
      )}
      <details className="mt-3">
        <summary className="feedback-link">Installation help</summary>
        <p className="mt-3 text-text-dim">
          On iPhone or iPad, open Penny in Safari, choose Share, then Add to
          Home Screen. In Chrome or Edge, use the browser menu’s Install app or
          Add to Home Screen option. You can also keep using this browser tab.
        </p>
      </details>
      {message && (
        <p className="mt-3" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
