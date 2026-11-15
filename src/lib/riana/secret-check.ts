/**
 * Ask Riana never carries secrets. Before a family message is stored, sent to
 * Riana's webhook, or an answer from Riana is stored or shown, it goes through
 * this check. It refuses the plain cases: a Social Security number, a card or
 * full account number, and "the password is …" style sentences.
 *
 * It is deliberately narrow about ordinary words. "When does Social Security
 * pay?" and "Where is the Medicare card?" are family questions and must pass.
 * The database has a smaller backstop (app.riana_looks_secret).
 */

export type SecretReason = "ssn" | "card_or_account_number" | "credential_phrase" | "date_of_birth";
export type SecretCheck = { ok: true } | { ok: false; reason: SecretReason };

/** What the family sees when a message is refused. */
export const VAULT_WARNING =
  "That looks like a password, a Social Security number or a full account number, so it was not sent. Those stay in the password vault. Please ask again without it.";

// 123-45-6789, 123 45 6789, 123.45.6789
const SSN = /(?<!\d)\d{3}[-\s.]\d{2}[-\s.]\d{4}(?!\d)/;
// "SSN" or "Social Security" followed closely by a run of digits (covers a bare 9-digit number and "last four … 1234" is allowed: under 5 digits).
const SSN_WORDS = /\b(ssn|social\s+security(\s+(number|no\.?|#))?)\b[^\d\n]{0,25}\d[\d\s.-]{3,}\d/i;
// 13 to 19 digits, alone or in groups split by single spaces or dashes: card numbers and full account numbers.
const LONG_DIGITS = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/;
// "password is hunter2", "PIN: 1234", "my passcode = …"
const CREDENTIAL_IS = /\b(pass\s?word|passcode|pass\s?phrase|pin(\s+(number|code))?|security\s+code|cvv|cvc|(access|recovery|verification|backup)\s+code|account\s+(number|no\.?|#)|card\s+(number|no\.?|#)|ssn|social\s+security\s+(number|no\.?|#))\s*(is|was|are|=|:)/i;
// A routing number is never needed in a chat.
const ROUTING = /\brouting\s+(number|no\.?|#)/i;
// "date of birth is 4/12/1941", "DOB: 1941-04-12"
const DOB = /\b(date\s+of\s+birth|dob|d\.o\.b\.?)\b[^\d\n]{0,12}\d/i;

/** Does this text look like it carries a secret? */
export function checkForSecrets(text: string): SecretCheck {
  const t = String(text ?? "");
  if (SSN.test(t) || SSN_WORDS.test(t)) return { ok: false, reason: "ssn" };
  if (LONG_DIGITS.test(t)) return { ok: false, reason: "card_or_account_number" };
  if (CREDENTIAL_IS.test(t) || ROUTING.test(t)) return { ok: false, reason: "credential_phrase" };
  if (DOB.test(t)) return { ok: false, reason: "date_of_birth" };
  return { ok: true };
}

export const looksLikeSecret = (text: string) => !checkForSecrets(text).ok;
