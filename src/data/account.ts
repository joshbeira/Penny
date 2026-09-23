export const ACCOUNT = {
  holder: "Gemma",
  label: "Current account",
  balance: 1842.6,
  billsDueThisWeek: [
    { payee: "British Gas", amount: 84.0, dueLabel: "Wednesday" },
  ],
};
export type Health = "steady" | "tight" | "risk";

export function accountHealth(account = ACCOUNT): Health {
  const net =
    account.balance -
    account.billsDueThisWeek.reduce((sum, bill) => sum + bill.amount, 0);
  if (net > 500) return "steady";
  if (net < 0) return "risk";
  return "tight";
}
const GBP_SHORT = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function billPhrases(account = ACCOUNT): string[] {
  return account.billsDueThisWeek.map(
    (bill) =>
      `${bill.payee} ${GBP_SHORT.format(bill.amount)} due ${bill.dueLabel}`,
  );
}

export const HEALTH_WORD: Record<Health, string> = {
  steady: "Steady",
  tight: "Tight",
  risk: "Risk",
};
