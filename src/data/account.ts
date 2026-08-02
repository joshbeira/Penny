// SPEC 5.1 — exact fixture.
export const ACCOUNT = {
  holder: "Gemma",
  label: "Current account",
  balance: 1842.60,
  billsDueThisWeek: [{ payee: "British Gas", amount: 84.00, dueLabel: "Wednesday" }],
};

// SPEC 7.1's health calculation. It lives beside the data rather than in
// earcons.ts because Home needs the health word in P1 (SPEC 10) and earcons.ts
// arrives in P2 — glance() then imports this instead of re-deriving it.
//
// With the fixtures: 1842.60 − 84.00 = 1758.60 → "steady".
export type Health = "steady" | "tight" | "risk";

export function accountHealth(account = ACCOUNT): Health {
  const net =
    account.balance - account.billsDueThisWeek.reduce((sum, bill) => sum + bill.amount, 0);
  if (net > 500) return "steady";
  if (net < 0) return "risk";
  return "tight";
}

// SPEC 10 renders the bill as "British Gas £84 due Wednesday", and SPEC 11.7's
// `bills` intent speaks the same fixture. One composition, for the same reason
// accountHealth() is here rather than in earcons.ts: Home and the voice surface
// must not be able to disagree about what is due. The trailing .00 is dropped
// because SPEC 10's own rendering does.
const GBP_SHORT = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function billPhrases(account = ACCOUNT): string[] {
  return account.billsDueThisWeek.map(
    (bill) => `${bill.payee} ${GBP_SHORT.format(bill.amount)} due ${bill.dueLabel}`,
  );
}

export const HEALTH_WORD: Record<Health, string> = {
  steady: "Steady",
  tight: "Tight",
  risk: "Risk",
};
