import { test } from "node:test";
import assert from "node:assert/strict";
import { checkForSecrets, looksLikeSecret } from "./secret-check.ts";

// Every number below is made up. None is a real identifier.

test("refuses Social Security number shapes", () => {
  for (const t of [
    "His number is 123-45-6789 if you need it",
    "123 45 6789",
    "it's 123.45.6789",
    "Dad's SSN 123456789",
    "social security number: 123456789",
  ]) assert.deepEqual(checkForSecrets(t), { ok: false, reason: "ssn" }, t);
});

test("refuses 13 to 19 digit card-like and account-like runs", () => {
  for (const t of [
    "the card is 4111 1111 1111 1111",
    "4111-1111-1111-1111 exp next year",
    "use 4111111111111111",
    "account 1234567890123",            // 13 digits
    "1234567890123456789",              // 19 digits
  ]) assert.equal(checkForSecrets(t).ok, false, t);
  assert.deepEqual(checkForSecrets("4111 1111 1111 1111"), { ok: false, reason: "card_or_account_number" });
});

test("refuses credential phrases", () => {
  for (const t of [
    "The password is bluebird42",
    "my Password: bluebird42",
    "PIN is 4821",
    "the pin number is four eight two one",
    "the account number is 55512",
    "What is the routing number for the credit union?",
    "the security code is 311",
    "recovery code: ABCD-EFGH",
  ]) assert.deepEqual(checkForSecrets(t), { ok: false, reason: "credential_phrase" }, t);
});

test("refuses a date of birth", () => {
  assert.deepEqual(checkForSecrets("Her date of birth is 4/12/1941"), { ok: false, reason: "date_of_birth" });
  assert.deepEqual(checkForSecrets("DOB: 1941-04-12"), { ok: false, reason: "date_of_birth" });
});

test("ordinary family questions pass", () => {
  for (const t of [
    "When is my next doctor appointment?",
    "What time is the VA exam on November 6?",
    "Who should we call first if Dad goes to the hospital?",
    "When does Social Security pay this month?",
    "Where do we keep the Medicare card?",
    "Which account pays the electric bill? The one ending in 4412?",
    "Karmel's new phone number is (555) 010-0701.",
    "Please call 555-010-0701 or 555-010-0702",
    "Our anniversary is June 14, 1962 and the party is at 2:30.",
    "The plumber charged $1,250.00 on 11/03/2026.",
    "Where is the password vault and who can open it?",
    "I forgot my password. Who can help me reset it?",
    "Diana's birthday is coming up. What did we do last year?",
    "The zip code is 86403 and the house number is 2210.",
    "Is the pinball machine going to David?",
    "We spin the wheel at family night, and the spin is always Rich's job.",
  ]) assert.deepEqual(checkForSecrets(t), { ok: true }, t);
});

test("looksLikeSecret mirrors the check, and empty text is fine", () => {
  assert.equal(looksLikeSecret("PIN is 1234"), true);
  assert.equal(looksLikeSecret("What's for dinner on Sunday?"), false);
  assert.equal(looksLikeSecret(""), false);
});
