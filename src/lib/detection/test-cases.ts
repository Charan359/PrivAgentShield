/**
 * Detection test corpus — one or more cases per category, plus negatives.
 * Runnable in the UI (Detection page) and by `src/lib/detection/engine.test.ts`.
 */

import type { Category } from "@/data/mock";
import type { EntityType } from "./types";

export type DetectionTestCase = {
  id: string;
  group: Category | "NEGATIVE";
  label: string;
  input: string;
  /** Entity types that MUST be present in the result. */
  expect: EntityType[];
  /** Entity types that MUST NOT be present. */
  expectNone?: EntityType[];
};

export const detectionTestCases: DetectionTestCase[] = [
  {
    id: "tc-pii-1",
    group: "PII",
    label: "Email + bank account (spec example)",
    input: "Rahul's email is rahul@gmail.com and his bank account is 1234567890.",
    expect: ["person_name", "email", "bank_account"],
  },
  {
    id: "tc-pii-2",
    group: "PII",
    label: "Phone, address, date of birth",
    input:
      "Dr. Priya Nair lives at 42, Residency Road, Bengaluru; call +91 9812345621. DOB 14/03/1991.",
    expect: ["person_name", "address", "phone", "date_of_birth"],
  },
  {
    id: "tc-pii-3",
    group: "PII",
    label: "Government identifiers",
    input: "Aadhaar 4321 8876 1290 and PAN ABCPD1234E on file; US SSN 123-45-6789.",
    expect: ["government_id"],
  },
  {
    id: "tc-fin-1",
    group: "FINANCIAL",
    label: "Card number passing Luhn",
    input: "Charge card 4539 8832 1145 1234, exp 09/28, cvv 221.",
    expect: ["card_number"],
  },
  {
    id: "tc-fin-2",
    group: "FINANCIAL",
    label: "IBAN + IFSC + transaction reference",
    input:
      "Payroll account DE89 3704 0044 0532 0130 00 via HDFC0001234; invoice INV-88213 for INR 42,000.",
    expect: ["financial_identifier", "transaction_info"],
  },
  {
    id: "tc-cred-1",
    group: "CREDENTIAL",
    label: "Vendor API key",
    input: "Use sk_test_51NcQ2fJk8ZxT0aWbYh3PmR to query the pricing endpoint.",
    expect: ["api_key"],
  },
  {
    id: "tc-cred-2",
    group: "CREDENTIAL",
    label: "Password cue and JWT",
    input:
      "Login password is Hunter2!xQ and the bearer token eyJhbGciOiJIUzI1NiIs.eyJzdWIiOiIxMjM0NSJ9.dBjftJeZ4CVPmB92K27u is still valid.",
    expect: ["password", "access_token"],
  },
  {
    id: "tc-conf-1",
    group: "CONFIDENTIAL",
    label: "Internal roadmap and employee record",
    input:
      "Confidential: the Project Halcyon roadmap in q1-pricing-plan.docx covers EMP-20194's reassignment.",
    expect: ["proprietary_info", "project_codename", "internal_document", "employee_record"],
  },
  {
    id: "tc-neg-1",
    group: "NEGATIVE",
    label: "Benign operational chatter",
    input: "The invoice has been settled and nothing further is owed to the vendor.",
    expect: [],
    expectNone: ["card_number", "api_key", "government_id", "password"],
  },
  {
    id: "tc-neg-2",
    group: "NEGATIVE",
    label: "Digit run that fails Luhn",
    input: "Ticket reference 1234 5678 9012 3456 was closed yesterday.",
    expect: [],
    expectNone: ["card_number"],
  },
];

