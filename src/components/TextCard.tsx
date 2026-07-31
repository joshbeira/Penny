import { useEffect, useSyncExternalStore } from "react";
import { dismissCard, getCards, subscribeCards } from "../lib/audio";
import type { TextCardEntry } from "../lib/audio";

// SPEC 11.3's TextCard: "--surface-raised, 22px text, role="status", stacks
// above the TabBar, auto-dismiss 6s or on tap."
//
// This is the visible half of the argument SPEC 1 makes about Quiet Mode: the
// speech is replaced, not deleted. Everything non-speech — the Glance, playWeek,
// vibration, the haptic fallback blips — keeps playing, because none of it
// comes through speak() (SPEC 11.3's matrix).
//
// SPEC 6.3 step 1 mirrors the same string into the live region in every mode, so
// a screen reader hears it from LiveRegion.tsx whether or not this card's own
// role="status" fires. That redundancy is SPEC 11.3 and SPEC 6.3 both taken
// literally; SPEC 15's TalkBack pass is where it gets judged on the device.

const EMPTY: TextCardEntry[] = [];

// SPEC 11.3: "auto-dismiss 6s".
const DISMISS_MS = 6_000;

function Card({ card }: { card: TextCardEntry }) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismissCard(card.id), DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [card.id]);

  // A role="status" div rather than a button: SPEC 11.3 pins the role, and the
  // two cannot both sit on one element. It stays out of the tab order in
  // consequence — the 6s timer means nothing depends on dismissing it by hand,
  // so no control goes unreachable (SPEC 15).
  return (
    <div
      role="status"
      onPointerDown={() => dismissCard(card.id)}
      className="rounded-2xl bg-surface-raised p-4 text-card"
    >
      {card.text}
    </div>
  );
}

// SPEC 11.3: "stacks above the TabBar". Oldest first, so the reading order down
// the stack is the order the lines would have been spoken in.
//
// Empty renders nothing at all — not an empty container. SPEC 16 walks every
// route with no speech pending, so the Layout Lock baseline must not carry a
// wrapper that only ever appears in Quiet Mode.
export default function TextCards() {
  const cards = useSyncExternalStore(subscribeCards, getCards, () => EMPTY);
  if (cards.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-[48px] z-20 flex flex-col gap-2 px-4 pb-2">
      {cards.map((card) => (
        <Card key={card.id} card={card} />
      ))}
    </div>
  );
}
