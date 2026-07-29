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

// SPEC 10 order: balance region · the two pill buttons · the "This week" list.
// That order is the Layout Lock baseline (SPEC 16) — never reorder.
export default function Home() {
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

  return (
    <>
      <section aria-label="Current account balance" className="rounded-2xl bg-surface p-4">
        <p className="text-caption text-text-dim">{ACCOUNT.label}</p>
        <p className="text-amount">{GBP.format(ACCOUNT.balance)}</p>
        <p className="text-card text-amber">{HEALTH_WORD[accountHealth()]}</p>
        <p className="text-caption text-text-dim">{bills}</p>
      </section>

      <div className="mt-4 flex flex-col gap-3">{buttons}</div>

      <h2 className="mt-6 text-card">This week</h2>
      <ul className="mt-2">
        {WEEK.map((tx) => {
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
        })}
      </ul>
    </>
  );
}
