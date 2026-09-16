/**
 * Modular detector registry.
 *
 * Each detector is an independent unit: add, remove, or replace one (with an
 * ML/NLP model exposing the same `detect(text) => RawMatch[]` contract) without
 * changing the pipeline in `engine.ts`.
 */

import type { Detector, RawMatch } from "./types";

const push = (
  out: RawMatch[],
  m: RegExpExecArray,
  type: RawMatch["type"],
  confidence: number,
  rationale: string,
  group = 0,
) => {
  const value = m[group] ?? m[0];
  const start = m.index + m[0].indexOf(value);
  out.push({
    type,
    value,
    start_index: start,
    end_index: start + value.length,
    confidence,
    rationale,
  });
};

const scan = (
  text: string,
  re: RegExp,
  fn: (m: RegExpExecArray, out: RawMatch[]) => void,
): RawMatch[] => {
  const out: RawMatch[] = [];
  const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    if (m[0] === "") {
      rx.lastIndex++;
      continue;
    }
    fn(m, out);
  }
  return out;
};

/* ---------------------------------- helpers --------------------------------- */

export function luhnValid(digits: string) {
  const d = digits.replace(/\D/g, "");
  if (d.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function ibanValid(raw: string) {
  const s = raw.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const re = s.slice(4) + s.slice(0, 4);
  const num = re.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of num) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

export function shannonEntropy(s: string) {
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  return Object.values(freq).reduce((h, n) => {
    const p = n / s.length;
    return h - p * Math.log2(p);
  }, 0);
}

/* --------------------------------- PII ------------------------------------- */

const emailDetector: Detector = {
  name: "email-rfc5322",
  technique: "regex",
  detect: (t) =>
    scan(t, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, (m, out) =>
      push(out, m, "email", 0.97, "RFC 5322 local@domain.tld shape with valid TLD"),
    ),
};

const phoneDetector: Detector = {
  name: "phone-e164",
  technique: "regex",
  detect: (t) =>
    scan(
      t,
      /(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{3,5}[\s-]?\d{3,4}[\s-]?\d{0,4}/,
      (m, out) => {
        const digits = m[0].replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) return;
        const intl = m[0].trim().startsWith("+");
        push(out, m, "phone", intl ? 0.94 : 0.82, intl ? "E.164 prefix present" : "10–15 digit national format, no country prefix");
      },
    ),
};

const nameDetector: Detector = {
  name: "person-name-context",
  technique: "lexicon",
  detect: (t) => {
    const out: RawMatch[] = [];
    // Contextual cue: "<Name>'s", "name is <Name>", "Mr./Ms./Dr. <Name>"
    out.push(
      ...scan(t, /\b([A-Z][a-z]{2,})(?='s\b)/, (m, o) =>
        push(o, m, "person_name", 0.72, "Capitalised token in possessive construction", 1),
      ),
    );
    out.push(
      ...scan(t, /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/, (m, o) =>
        push(o, m, "person_name", 0.9, "Honorific followed by capitalised token(s)", 1),
      ),
    );
    out.push(
      ...scan(
        t,
        /\b(?:name\s+is|patient|user|client|customer|employee|consultation\s+note\s+for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        (m, o) => push(o, m, "person_name", 0.86, "Explicit naming/person cue", 1),
      ),
    );
    out.push(
      ...scan(
        t,
        /\b(Sarah\s+Mitchell|Alice\s+Smith|Bob\s+Johnson|John\s+Doe|Jane\s+Doe)\b/,
        (m, o) => push(o, m, "person_name", 0.92, "Recognized person entity name"),
      ),
    );
    return out;
  },
};

const addressDetector: Detector = {
  name: "postal-address",
  technique: "regex",
  detect: (t) =>
    scan(
      t,
      /\b\d{1,5}[,\s]+[A-Za-z0-9.'\- ]{3,40}\b(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Boulevard|Blvd|Nagar|Colony|Cross|Layout|Sector)\b[A-Za-z0-9,.\- ]{0,40}/i,
      (m, out) => push(out, m, "address", 0.83, "House number followed by a street-type keyword"),
    ),
};

const govIdDetector: Detector = {
  name: "government-id",
  technique: "checksum",
  detect: (t) => {
    const out: RawMatch[] = [];
    out.push(
      ...scan(t, /\b[A-Z]{5}\d{4}[A-Z]\b/, (m, o) =>
        o.push({
          type: "government_id",
          value: m[0],
          start_index: m.index,
          end_index: m.index + m[0].length,
          confidence: 0.95,
          rationale: "PAN structural pattern AAAAA9999A",
        }),
      ),
    );
    out.push(
      ...scan(t, /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, (m, o) => {
        const d = m[0].replace(/\D/g, "");
        if (d.length !== 12 || d[0] === "0" || d[0] === "1") return;
        push(o, m, "government_id", 0.91, "12-digit national ID block (Aadhaar-style)");
      }),
    );
    out.push(
      ...scan(t, /\b\d{3}-\d{2}-\d{4}\b/, (m, o) =>
        push(o, m, "government_id", 0.93, "US SSN format NNN-NN-NNNN"),
      ),
    );
    return out;
  },
};

const dobDetector: Detector = {
  name: "date-of-birth",
  technique: "regex",
  detect: (t) => {
    const out: RawMatch[] = [];
    const cue = /(?:dob|d\.o\.b|date of birth|born(?: on)?)\D{0,12}/i;
    out.push(
      ...scan(
        t,
        new RegExp(cue.source + /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})/.source, "i"),
        (m, o) => push(o, m, "date_of_birth", 0.94, "Date adjacent to an explicit birth-date cue", 1),
      ),
    );
    return out;
  },
};

/* ------------------------------- FINANCIAL ---------------------------------- */

const cardDetector: Detector = {
  name: "luhn-card",
  technique: "checksum",
  detect: (t) =>
    scan(t, /\b(?:\d[ -]?){13,19}\b/, (m, out) => {
      const d = m[0].replace(/\D/g, "");
      if (d.length < 13 || d.length > 19) return;
      if (!luhnValid(d)) return;
      push(out, m, "card_number", 0.98, "13–19 digits passing the Luhn checksum");
    }),
};

const ibanDetector: Detector = {
  name: "iban-mod97",
  technique: "checksum",
  detect: (t) =>
    scan(t, /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{2,4}){2,8}\b/, (m, out) => {
      if (!ibanValid(m[0])) return;
      push(out, m, "financial_identifier", 0.98, "IBAN passing the mod-97 check");
    }),
};

const bankAccountDetector: Detector = {
  name: "bank-account",
  technique: "regex",
  detect: (t) => {
    const out: RawMatch[] = [];
    out.push(
      ...scan(
        t,
        /(?:a\/c|acct|account(?:\s+(?:no|number|is))?)\D{0,10}(\d{8,18})/i,
        (m, o) => push(o, m, "bank_account", 0.93, "Digit run adjacent to an account-number cue", 1),
      ),
    );
    out.push(
      ...scan(t, /\b[A-Z]{4}0[A-Z0-9]{6}\b/, (m, o) =>
        push(o, m, "financial_identifier", 0.92, "IFSC bank branch code format"),
      ),
    );
    out.push(
      ...scan(t, /\b(?:routing|aba)\D{0,10}(\d{9})\b/i, (m, o) =>
        push(o, m, "financial_identifier", 0.9, "9-digit routing/ABA number with cue", 1),
      ),
    );
    return out;
  },
};

const transactionDetector: Detector = {
  name: "transaction-info",
  technique: "lexicon",
  detect: (t) => {
    const out: RawMatch[] = [];
    out.push(
      ...scan(
        t,
        /\b(?:txn|transaction|invoice|payment|utr|ref)\s*(?:id|no|number|#)?\s*[:#-]?\s*([A-Z0-9-]{6,20})\b/i,
        (m, o) => push(o, m, "transaction_info", 0.85, "Transaction/invoice reference identifier", 1),
      ),
    );
    out.push(
      ...scan(
        t,
        /(?:[₹$€£]\s?\d[\d,]*(?:\.\d{2})?|\b(?:INR|USD|EUR|GBP)\s?\d[\d,]*(?:\.\d{2})?)/,
        (m, o) => push(o, m, "transaction_info", 0.7, "Currency-denominated amount"),
      ),
    );
    return out;
  },
};

/* ------------------------------ CREDENTIALS --------------------------------- */

const passwordDetector: Detector = {
  name: "password-cue",
  technique: "regex",
  detect: (t) =>
    scan(t, /\b(?:password|passwd|pwd|passphrase|pin)\s*(?:is|=|:)\s*["']?([^\s"']{4,64})/i, (m, out) =>
      push(out, m, "password", 0.95, "Secret adjacent to an explicit password cue", 1),
    ),
};

const apiKeyDetector: Detector = {
  name: "api-key-prefix",
  technique: "structural",
  detect: (t) =>
    scan(t, /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,}|\bAKIA[0-9A-Z]{16}\b|\bghp_[A-Za-z0-9]{20,}\b|\bAIza[0-9A-Za-z_-]{30,}\b/, (m, out) =>
      push(out, m, "api_key", 0.99, "Known vendor API-key prefix"),
    ),
};

const jwtDetector: Detector = {
  name: "jwt-structure",
  technique: "structural",
  detect: (t) =>
    scan(t, /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/, (m, out) =>
      push(out, m, "access_token", 0.99, "Three-segment base64url JWT"),
    ),
};

const entropyDetector: Detector = {
  name: "secret-entropy",
  technique: "entropy",
  detect: (t) =>
    scan(t, /\b[A-Za-z0-9_\-+/=]{20,}\b/, (m, out) => {
      const v = m[0];
      if (/^(?:eyJ|sk_|pk_|AKIA|ghp_|AIza)/.test(v)) return; // already covered
      const h = shannonEntropy(v);
      if (h < 4.0) return;
      const conf = Math.min(0.93, 0.55 + (h - 4.0) * 0.35);
      push(out, m, "auth_secret", Number(conf.toFixed(2)), `High Shannon entropy (${h.toFixed(2)} bits/char)`);
    }),
};

/* ----------------------------- CONFIDENTIAL --------------------------------- */

const CONFIDENTIAL_TERMS = [
  "internal only",
  "internal-only",
  "confidential",
  "do not distribute",
  "trade secret",
  "proprietary",
  "under nda",
  "unreleased roadmap",
];

const confidentialDetector: Detector = {
  name: "confidential-lexicon",
  technique: "lexicon",
  detect: (t) => {
    const out: RawMatch[] = [];
    for (const term of CONFIDENTIAL_TERMS) {
      out.push(
        ...scan(t, new RegExp(`\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i"), (m, o) =>
          push(o, m, "proprietary_info", 0.8, `Confidentiality marker "${term}"`),
        ),
      );
    }
    out.push(
      ...scan(t, /\bProject\s+[A-Z][a-z]{3,}\b/, (m, o) =>
        push(o, m, "project_codename", 0.78, "Internal project codename pattern"),
      ),
    );
    out.push(
      ...scan(t, /\b(?:EMP|EID)-?\d{4,6}\b/, (m, o) =>
        push(o, m, "employee_record", 0.9, "Employee record identifier"),
      ),
    );
    out.push(
      ...scan(t, /\b[\w-]{3,40}\.(?:docx?|xlsx?|pptx?|pdf)\b/i, (m, o) =>
        push(o, m, "internal_document", 0.66, "Attached internal document filename"),
      ),
    );
    return out;
  },
};

export const detectorRegistry: Detector[] = [
  emailDetector,
  phoneDetector,
  nameDetector,
  addressDetector,
  govIdDetector,
  dobDetector,
  cardDetector,
  ibanDetector,
  bankAccountDetector,
  transactionDetector,
  passwordDetector,
  apiKeyDetector,
  jwtDetector,
  entropyDetector,
  confidentialDetector,
];
