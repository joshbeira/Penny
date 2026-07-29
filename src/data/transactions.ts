// SPEC 5.2 — exact fixture.
export type Tx = { id: string; date: string; merchant: string;
  category: "groceries" | "transport" | "bills" | "income" | "other";
  amount: number; isAnomaly?: boolean };

export const WEEK: Tx[] = [
  { id: "t1", date: "2026-07-06", merchant: "Tesco",           category: "groceries", amount: -42.30 },
  { id: "t2", date: "2026-07-06", merchant: "ASOS refund",     category: "income",    amount:  12.00 },
  { id: "t3", date: "2026-07-07", merchant: "WM Bus",          category: "transport", amount:  -4.20 },
  { id: "t4", date: "2026-07-07", merchant: "Caffè Nero",      category: "other",     amount:  -3.40 },
  { id: "t5", date: "2026-07-08", merchant: "British Gas",     category: "bills",     amount: -84.00 },
  { id: "t6", date: "2026-07-09", merchant: "Vets4Pets",       category: "other",     amount: -180.00 },
  { id: "t7", date: "2026-07-10", merchant: "Tesco",           category: "groceries", amount: -28.75 },
  { id: "t8", date: "2026-07-11", merchant: "TicketPoint Ltd", category: "other",     amount: -68.20, isAnomaly: true },
  { id: "t9", date: "2026-07-12", merchant: "From savings",    category: "income",    amount: 150.00 },
];
