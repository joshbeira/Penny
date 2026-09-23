import { useEffect, useSyncExternalStore } from "react";
import { dismissCard, getCards, subscribeCards } from "../lib/audio";
import type { TextCardEntry } from "../lib/audio";

const EMPTY: TextCardEntry[] = [];
const DISMISS_MS = 6_000;

function Card({ card }: { card: TextCardEntry }) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismissCard(card.id), DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [card.id]);
  return (
    <div
      onPointerDown={() => dismissCard(card.id)}
      className="rounded-2xl bg-surface-raised p-4 text-card"
    >
      {card.text}
    </div>
  );
}
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
