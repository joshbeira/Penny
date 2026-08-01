import { useCallback, useEffect, useRef, useState } from "react";
import { ACCOUNT, HEALTH_WORD, accountHealth } from "../data/account";
import { WEEK } from "../data/transactions";
import type { Tx } from "../data/transactions";
import { glance, playWeek } from "../lib/earcons";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

// SPEC 10 renders the bill as "British Gas £84 due Wednesday", so a trailing
// .00 is dropped.
const GBP_SHORT = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Parsed at local midnight so the weekday never shifts by timezone: t8 has to
// read Saturday (SPEC 7.2's "unusual payment on Saturday").
function dayShortName(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" });
}

function signedAmount(amount: number): string {
  return `${amount > 0 ? "+" : "-"}${GBP.format(Math.abs(amount))}`;
}

// SPEC 4: sentence case everywhere.
function categoryLabel(category: Tx["category"]): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

const PILL =
  "flex min-h-[48px] items-center justify-center rounded-full border border-amber px-6 text-body text-amber";

// SPEC 10's Journey: "Implement as an `era` prop on Home selecting one of three
// preset class sets; default era "2026" behaves as the normal Home (no visual
// difference at scale 1.0 — the presets only apply inside Journey's preview)."
//
// The prop is therefore OPTIONAL, and absent is what the router renders: the
// full Home, unstyled by any preset. That is the only reading under which 2026
// can both name a reduced preview (balance + buttons + anomaly row) and leave
// the real screen untouched. Journey always passes an era explicitly.
export type Era = "2019" | "2026" | "2030";

// SPEC 10 order: balance region · the two pill buttons · the "This week" list.
// That order is the Layout Lock baseline (SPEC 16) — never reorder.
export default function Home({ era }: { era?: Era }) {
  const bills = ACCOUNT.billsDueThisWeek
    .map((bill) => `${bill.payee} ${GBP_SHORT.format(bill.amount)} due ${bill.dueLabel}`)
    .join(" · ");

  // SPEC 7.2's row-sync callback: playWeek calls onNote at each note's onset and
  // the row carries a 400ms amber left border. A set rather than a single id, so
  // two transactions on the same day (0.12s apart) each get their full flash.
  const [flashing, setFlashing] = useState<ReadonlySet<string>>(() => new Set());
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
    <button key="glance" type="button" className={PILL} onClick={() => void glance()}>
      Play the Glance
    </button>
  );
  const weekButton = (
    <button key="week" type="button" className={PILL} onClick={() => void playWeek(WEEK, flash)}>
      Play my week
    </button>
  );

  // SPEC 10 / 16: this swap exists ONLY to demo the CI gate failing.
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
        {tx.isAnomaly && <span className="shrink-0 text-caption text-amber">Unusual</span>}
        <span className={`shrink-0 ${tx.amount > 0 ? "text-amber" : ""}`}>{amount}</span>
      </li>
    );
  };

  const balance = (
    <section aria-label="Current account balance" className="rounded-2xl bg-surface p-4">
      <p className="text-caption text-text-dim">{ACCOUNT.label}</p>
      <p className="text-amount">{GBP.format(ACCOUNT.balance)}</p>
      <p className="text-card text-amber">{HEALTH_WORD[accountHealth()]}</p>
      <p className="text-caption text-text-dim">{bills}</p>
    </section>
  );

  // SPEC 10's 2030 preview: "only the health word at 64px + one 96px round amber
  // button labelled Glance (replays glance()) + caption 'Sound and touch only'".
  // The button is the single interactive element in any preview, which is why
  // Journey leaves this era alone rather than marking it inert.
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

  // SPEC 10's 2026 preview: "only balance region + the two buttons + the anomaly
  // row; chip 'Speech-first'".
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

  // No era (the router's Home) and SPEC 10's 2019 preview ("full UI") render the
  // same tree; 2019 differs only by its preset class set on the wrapper.
  return (
    <>
      {balance}

      <div className="mt-4 flex flex-col gap-3">{buttons}</div>

      <h2 className="mt-6 text-card">This week</h2>
      <ul className="mt-2">{WEEK.map(row)}</ul>
    </>
  );
}
