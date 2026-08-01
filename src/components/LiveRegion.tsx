import { useSyncExternalStore } from "react";
import { getAnnouncement, getLiveBusy, subscribeAnnouncement, subscribeLiveBusy } from "../lib/audio";

const EMPTY = { text: "", seq: 0 };

// SPEC 15: one singleton live region, and the SOLE announcement channel — no
// other element carries a live role, so nothing is ever announced twice.
// SPEC 6.3 step 1 mirrors every spoken string here in every mode, and
// SPEC 7.1/7.2 post their completion lines here directly (routing those through
// speak() would speak them).
//
// The queue itself lives in lib/audio.ts beside announce(); this renders it.
// Messages arrive one at a time with SPEC 15's minimum gap, so a burst is heard
// in full instead of collapsing to whichever line wrote last.
//
// The text sits in a keyed inner <span> so an identical string announces again:
// replaying the Glance must not go silent for a screen reader just because the
// wording has not changed. The aria-live container itself never remounts —
// remounting it would break the live region entirely.
//
// `data-live-busy` is SPEC 15's drain signal and SPEC 16's wait condition: it
// reads "true" from the first queued message until the last one has rendered
// and its gap has elapsed, so check.mjs can snapshot on a settled tree instead
// of guessing with a fixed sleep. A data attribute is invisible to
// ariaSnapshot(), which captures the accessibility tree, so it adds nothing to
// the Layout Lock baseline.
export default function LiveRegion() {
  const announcement = useSyncExternalStore(subscribeAnnouncement, getAnnouncement, () => EMPTY);
  const busy = useSyncExternalStore(subscribeLiveBusy, getLiveBusy, () => false);

  return (
    <div aria-live="polite" role="status" className="sr-only" data-live-busy={busy ? "true" : "false"}>
      <span key={announcement.seq}>{announcement.text}</span>
    </div>
  );
}
