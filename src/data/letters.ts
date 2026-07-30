// SPEC 5.3 — four fixtures, exact. Every string here is also the printable prop
// letter (SPEC 5's heading, Appendix A's props list), and the summary_spoken
// values marked in SPEC 5.3 are the same texts SPEC 6.2 records as fixed audio,
// so they must match voice-lines.json character for character.
export type Letter = {
  key: "card" | "nhs" | "scam" | "pin";
  sender: string;
  letter_type: string;
  summary_spoken: string; // fixed-line audio id in SPEC 6.2 where noted
  explain_spoken: string;
  required_action: "none" | "order_card" | "scam_alert";
  sensitive_content: boolean;
  exact_text: string; // 100% of the printable prop letter
};

const CARD: Letter = {
  key: "card",
  sender: "Meridian Bank",
  letter_type: "Card expiry notice",
  summary_spoken:
    "From Meridian Bank. Your debit card ending four four eight two expires at the end of July. A replacement needs ordering.",
  explain_spoken:
    "Your bank card stops working at the end of July. Ordering a free replacement now means the new one arrives before the old one is cut off. Nothing else changes — same account, same PIN.",
  required_action: "order_card",
  sensitive_content: false,
  exact_text:
    "Meridian Bank, 1 Cornhill, London EC3V 3ND. 30 June 2026. Dear Ms G. Harding, Your Meridian debit card ending 4482 expires on 31 July 2026. A replacement has not yet been ordered. To receive your new card before your current one stops working, please order a replacement in the Meridian app, by phone on 0345 000 1122, or in branch. Your account number, sort code and PIN remain unchanged. Yours sincerely, Meridian Bank Card Services.",
};

const NHS: Letter = {
  key: "nhs",
  sender: "City Eye Clinic",
  letter_type: "Appointment letter",
  summary_spoken:
    "From City Eye Clinic. Your appointment is Tuesday the fourth of August at ten a m, with Mr Rahman. Bring your current glasses.",
  explain_spoken:
    "A routine eye clinic appointment. It is on the first floor, Clinic Two. If the date does not work, there is a phone number to rebook — nothing is needed before the day except your glasses and a medication list.",
  required_action: "none",
  sensitive_content: false,
  exact_text:
    "City Eye Clinic, Ophthalmology Outpatients, 14 Bristol Road. 26 June 2026. Dear Ms Harding, Appointment: Tuesday 4 August 2026, 10:00 am, with Mr A. Rahman, Clinic 2, first floor. Please bring your current glasses and a list of any medication. If you cannot attend, call 0121 000 3344 to rebook. City Eye Clinic.",
};

// summary_spoken is "superseded in the UI by the fixed scam_filed line" (SPEC
// 5.3) — SPEC 11.1 step 9 hands scam_alert straight to SPEC 11.4, which is P5.
// The string is still carried verbatim because SPEC 5.3 specifies it.
const SCAM: Letter = {
  key: "scam",
  sender: "International Prize Syndicate",
  letter_type: "Suspected scam",
  summary_spoken:
    "This looks like a prize-draw scam. It asks for a ninety five pound fee to release winnings that do not exist.",
  explain_spoken:
    "Real prize draws never charge a fee to release money. The urgency, the fee, and the payment by bank transfer are classic pressure tactics. Penny has reported it; do not call the number.",
  required_action: "scam_alert",
  sensitive_content: false,
  exact_text:
    "INTERNATIONAL PRIZE SYNDICATE — FINAL NOTICE. Ref UK-77413. Dear Winner, You have been selected to receive £950,000 in the European Postcode Draw. To release your funds you must respond within 7 days and pay a processing fee of £95 by bank transfer. Failure to respond will void your claim. Call +44 900 000 0000 now. Sort code 00-00-00, account 12345678.",
};

// The only sensitive_content fixture. SPEC 5.3: the physical prop is printed
// with a real 4-digit number (e.g. 4821) so the on-device masking has something
// to black out; the fixture stores [hidden].
const PIN: Letter = {
  key: "pin",
  sender: "Meridian Bank",
  letter_type: "PIN notification",
  summary_spoken:
    "That letter contains your PIN. I hid it before reading anything. It never left your phone.",
  explain_spoken:
    "This is the PIN for your new card. Penny masked it on the device itself, before any reading happened. Memorise it somewhere private, then destroy the letter.",
  required_action: "none",
  sensitive_content: true,
  exact_text:
    "Meridian Bank. 2 July 2026. Dear Ms G. Harding, Here is the PIN for your new Meridian debit card. Your PIN: [hidden]. Memorise it, then destroy this letter. Never share your PIN — Meridian will never ask for it by phone, text, or email. Card Services.",
};

// SPEC 5.3: "Also export SCENARIOS ... for the director panel and fallback
// logic" — SPEC 11.1 step 4's fixture fallback and SPEC 12.2's armed radio group.
export const SCENARIOS: Record<Letter["key"], Letter> = {
  card: CARD,
  nhs: NHS,
  scam: SCAM,
  pin: PIN,
};
