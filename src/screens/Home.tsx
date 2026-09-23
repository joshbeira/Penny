import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACCOUNT,
  HEALTH_WORD,
  accountHealth,
  billPhrases,
} from "../data/account";
import { WEEK } from "../data/transactions";
import type { Tx } from "../data/transactions";
import { glance, playWeek } from "../lib/earcons";

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});
function dayShortName(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
  });
}

function signedAmount(amount: number): string {
  return `${amount > 0 ? "+" : "-"}${GBP.format(Math.abs(amount))}`;
}
function categoryLabel(category: Tx["category"]): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

const PILL =
  "flex min-h-[48px] items-center justify-center rounded-full border border-amber px-6 text-body text-amber";
export type Era = "2019" | "2026" | "2030";
export default function Home({ era }: { era?: Era }) {
  const bills = billPhrases().join(" · ");
  const [flashing, setFlashing] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const flash = useCallback((id: string) => {
    setFlashing((current) => new Set(current).add(id));
    timers.current.push(
      window.setTimeout(() => {
        setFlashing((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }, 400),
    );
  }, []);

  const glanceButton = (
    <button
      key="glance"
      type="button"
      className={PILL}
      onClick={() => void glance()}
    >
      Play the Glance
    </button>
  );
  const weekButton = (
    <button
      key="week"
      type="button"
      className={PILL}
      onClick={() => void playWeek(WEEK, flash)}
    >
      Play my week
    </button>
  );
  const buttons =
    import.meta.env.VITE_BREAK_LAYOUT === "1"
      ? [weekButton, glanceButton]
      : [glanceButton, weekButton];

  const row = (tx: Tx) => {
    const day = dayShortName(tx.date);
    const category = categoryLabel(tx.category);
    const amount = signedAmount(tx.amount);

    return (
      <li
        key={tx.id}
        aria-label={`${day}, ${tx.merchant}, ${category}, ${amount}${
          tx.isAnomaly ? ", unusual payment" : ""
        }`}
        className={`flex items-center gap-2 border-b border-hairline py-3 ${
          tx.isAnomaly ? "border-l-[3px] border-l-amber pl-2" : ""
        }${flashing.has(tx.id) ? " row-flash" : ""}`}
      >
        <span className="shrink-0 text-caption text-text-dim">{day}</span>
        <span className="min-w-0 flex-1 truncate">{tx.merchant}</span>
        <span className="shrink-0 text-caption text-text-dim">{category}</span>
        {tx.isAnomaly && (
          <span className="shrink-0 text-caption text-amber">Unusual</span>
        )}
        <span className={`shrink-0 ${tx.amount > 0 ? "text-amber" : ""}`}>
          {amount}
        </span>
      </li>
    );
  };

  const balance = (
    <section
      aria-label="Current account balance"
      className="rounded-2xl bg-surface p-4"
    >
      <p className="text-caption text-text-dim">{ACCOUNT.label}</p>
      <p className="text-amount">{GBP.format(ACCOUNT.balance)}</p>
      <p className="text-card text-amber">{HEALTH_WORD[accountHealth()]}</p>
      <p className="text-caption text-text-dim">{bills}</p>
    </section>
  );
  if (era === "2030") {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <p className="text-health text-amber">{HEALTH_WORD[accountHealth()]}</p>
        <button
          type="button"
          onClick={() => void glance()}
          className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-amber text-body text-bg"
        >
          Glance
        </button>
        <p className="text-caption text-text-dim">Sound and touch only</p>
      </div>
    );
  }
  if (era === "2026") {
    return (
      <>
        {balance}
        <div className="mt-4 flex flex-col gap-3">{buttons}</div>
        <ul className="mt-6">{WEEK.filter((tx) => tx.isAnomaly).map(row)}</ul>
        <p className="mt-4 inline-block rounded-full border border-hairline px-3 py-1 text-caption text-text-dim">
          Speech-first
        </p>
      </>
    );
  }
  return (
    <>
      {!era && (
        <section className="home-intro">
          <p className="eyebrow">Penny · Public beta</p>
          <h2 className="reader-title">
            A little clarity.
            <br />A lot more independence.
          </h2>
          <p className="text-text-dim">
            Read everyday letters with your eyes, your ears, or both. Private
            on-device reading, designed around your pace.
          </p>
          <Link className="primary-link" to="/postbox">
            Read a letter <span aria-hidden="true">↗</span>
          </Link>
          <div className="feature-strip">
            <span>No account</span>
            <span>On-device OCR</span>
            <span>Voice + text</span>
          </div>
          <a
            className="feedback-link"
            href="https://github.com/joshbeira/Penny/issues/new?template=feedback.yml"
          >
            Help shape Penny — share your experience
          </a>
          <h2 className="mt-8 text-card">Explore accessible banking</h2>
          <p className="text-caption text-text-dim">
            The account below is a sandbox with sample data. Payments and card
            orders are simulations.
          </p>
        </section>
      )}
      {balance}

      <div className="mt-4 flex flex-col gap-3">{buttons}</div>

      <h2 className="mt-6 text-card">This week</h2>
      <ul className="mt-2">{WEEK.map(row)}</ul>
    </>
  );
}
