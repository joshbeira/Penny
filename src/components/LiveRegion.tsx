import { useSyncExternalStore } from "react";
import { getAnnouncement, subscribeAnnouncement } from "../lib/audio";

const EMPTY = { text: "", seq: 0 };

// SPEC 15: one singleton live region. SPEC 6.3 step 1 mirrors every spoken
// string here in every mode, and SPEC 7.1/7.2 post their completion lines here
// directly (routing those through speak() would speak them).
//
// The text sits in a keyed inner <span> so an identical string announces again:
// replaying the Glance must not go silent for a screen reader just because the
// wording has not changed. The aria-live container itself never remounts —
// remounting it would break the live region entirely.
export default function LiveRegion() {
  const announcement = useSyncExternalStore(subscribeAnnouncement, getAnnouncement, () => EMPTY);

  return (
    <div aria-live="polite" role="status" className="sr-only">
      <span key={announcement.seq}>{announcement.text}</span>
    </div>
  );
}
