import { useSyncExternalStore } from "react";
import {
  getAnnouncement,
  getLiveBusy,
  subscribeAnnouncement,
  subscribeLiveBusy,
} from "../lib/audio";

const EMPTY = { text: "", seq: 0 };
export default function LiveRegion() {
  const announcement = useSyncExternalStore(
    subscribeAnnouncement,
    getAnnouncement,
    () => EMPTY,
  );
  const busy = useSyncExternalStore(
    subscribeLiveBusy,
    getLiveBusy,
    () => false,
  );

  return (
    <div
      aria-live="polite"
      role="status"
      className="sr-only"
      data-live-busy={busy ? "true" : "false"}
    >
      <span key={announcement.seq}>{announcement.text}</span>
    </div>
  );
}
