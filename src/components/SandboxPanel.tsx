import { useLocation, useNavigate } from "react-router-dom";
import { useDialogSheet } from "./ConfirmSheet";
import { useSandbox } from "../state/sandbox";
import { useReceipts } from "../state/receipts";

function Panel() {
  const navigate = useNavigate();
  const close = () => navigate("/");
  const { sheet, onKeyDown } = useDialogSheet(close);
  function payment(push: "coffee" | "ticketpoint") {
    close();
    useSandbox.getState().pushTap(push);
  }
  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label="Banking sandbox"
      onKeyDown={onKeyDown}
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-surface-raised p-4"
    >
      <h2 className="text-card">Banking sandbox</h2>
      <p className="my-4 text-text-dim">
        Explore accessible confirmations with sample data. No money moves and no
        bank is connected.
      </p>
      <button
        className="primary-link mb-3 w-full"
        onClick={() => payment("coffee")}
      >
        Try a £4.85 sample payment
      </button>
      <button
        className="primary-link mb-3 w-full"
        onClick={() => payment("ticketpoint")}
      >
        Try an unfamiliar merchant
      </button>
      <button
        className="feedback-link w-full"
        onClick={() => void useReceipts.getState().seedDemo()}
      >
        Add sample receipts
      </button>
      <button className="feedback-link w-full" onClick={close}>
        Close sandbox
      </button>
    </div>
  );
}
export default function SandboxPanel() {
  const { pathname } = useLocation();
  return pathname === "/sandbox" || pathname === "/director" ? <Panel /> : null;
}
