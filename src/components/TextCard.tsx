import { useEffect, useSyncExternalStore } from "react";
import { dismissCard, getCards, subscribeCards } from "../lib/audio";
import type { TextCardEntry } from "../lib/audio";

// SPEC 11.3's TextCard: "--surface-raised, 22px text, stacks above the TabBar,
// auto-dismiss 6s or on tap."
//
// This is the visible half of the argument SPEC 1 makes about Quiet Mode: the
// speech is replaced, not deleted. Everything non-speech — the Glance, playWeek,
// vibration, the haptic fallback blips — keeps playing, because none of it
// comes through speak() (SPEC 11.3's matrix).
//
// NO role="status" HERE. SPEC 15 makes the live region the sole announcement
// channel, superseding SPEC 11.3's attribute. SPEC 6.3 step 1 already mirrors
// every string into LiveRegion.tsx in every mode, so a card that also announced
// would say each Quiet Mode line to a screen reader twice — the failure
// SPEC 15's TalkBack item 5 exists to catch. The card is a visual surface.

const EMPTY: TextCardEntry[] = [];

// SPEC 11.3: "auto-dismiss 6s".
const DISMISS_MS = 6_000;

function Card({ card }: { card: TextCardEntry }) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismissCard(card.id), DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [card.id]);

  // A plain div, and deliberately not a button: the card announces nothing
  // (SPEC 15 — the live region is the sole channel) and carries no information
  // that is not already spoken or mirrored, so putting it in the tab order
  // would add a control whose only function is to dismiss what a 6s timer
  // dismisses anyway. Tap still works; nothing goes unreachable.
  return (
    <div
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
