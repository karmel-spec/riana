// Amortization for the StarLar notes (and any loan with a fixed payment).
// Pure functions, no dates library: months are counted from first_payment_on.

export type NoteTerms = {
  principal: number;
  annualRatePct: number;
  /** Payment actually made each month. If omitted, the level payment for term_months is used. */
  monthlyPayment?: number | null;
  termMonths?: number | null;
  firstPaymentOn: string;   // YYYY-MM-DD
};

export type ScheduleRow = { n: number; date: string; payment: number; interest: number; principal: number; balance: number };

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Standard level payment for a fully amortizing loan. */
export function levelPayment(principal: number, annualRatePct: number, termMonths: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** Full schedule until paid off (capped at 600 rows). */
export function schedule(t: NoteTerms): ScheduleRow[] {
  const r = t.annualRatePct / 100 / 12;
  const payment = t.monthlyPayment ?? levelPayment(t.principal, t.annualRatePct, t.termMonths ?? 360);
  if (payment <= t.principal * r && r > 0) throw new Error("Payment does not cover interest; the balance would grow forever.");
  const rows: ScheduleRow[] = [];
  let balance = t.principal;
  for (let n = 1; n <= 600 && balance > 0.005; n++) {
    const interest = r2(balance * r);
    let principal = r2(payment - interest);
    let pay = payment;
    if (principal >= balance) { principal = r2(balance); pay = r2(principal + interest); }   // final payment
    balance = r2(balance - principal);
    rows.push({ n, date: addMonths(t.firstPaymentOn, n - 1), payment: r2(pay), interest, principal, balance });
  }
  return rows;
}

/** Balance after the last payment on or before `asOf`. Before the first payment: the full principal. */
export function balanceOn(t: NoteTerms, asOf: string): { balance: number; paymentsMade: number; nextPaymentOn: string | null; paidOff: boolean } {
  const rows = schedule(t);
  const made = rows.filter((row) => row.date <= asOf);
  const last = made[made.length - 1];
  const balance = last ? last.balance : t.principal;
  const next = rows.find((row) => row.date > asOf);
  return { balance, paymentsMade: made.length, nextPaymentOn: next?.date ?? null, paidOff: balance <= 0.005 };
}

export function payoffDate(t: NoteTerms): string {
  const rows = schedule(t);
  return rows[rows.length - 1].date;
}

export function totalInterest(t: NoteTerms): number {
  return r2(schedule(t).reduce((s, row) => s + row.interest, 0));
}
