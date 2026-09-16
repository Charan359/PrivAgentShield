import type { EntityType } from "./types";

/** Keep the last `n` characters, mask everything else with `*`. */
function keepLast(value: string, n: number) {
  const visible = value.slice(-n);
  const hidden = value.slice(0, Math.max(0, value.length - n)).replace(/\S/g, "*");
  return hidden + visible;
}

function maskEmail(value: string) {
  const [user = "", domain = ""] = value.split("@");
  const u = user.length <= 2 ? "*".repeat(user.length) : user[0] + "*".repeat(user.length - 2) + user.slice(-1);
  const dot = domain.lastIndexOf(".");
  const name = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  const d = name.length <= 1 ? "*" : name[0] + "*".repeat(name.length - 1);
  return `${u}@${d}${tld}`;
}

/**
 * Produce a display-safe rendering of a detected span.
 * Nothing in the UI or the audit log should ever print the raw value.
 */
export function maskValue(type: EntityType, value: string): string {
  switch (type) {
    case "email":
      return maskEmail(value);
    case "phone":
    case "bank_account":
    case "card_number":
    case "government_id":
      return keepLast(value, 4);
    case "password":
    case "api_key":
    case "access_token":
    case "auth_secret":
      return `${value.slice(0, 4)}${"*".repeat(Math.max(4, Math.min(16, value.length - 4)))}`;
    case "person_name":
      return value
        .split(/\s+/)
        .map((w) => (w[0] ?? "") + "*".repeat(Math.max(1, w.length - 1)))
        .join(" ");
    case "date_of_birth":
      return "**/**/****";
    case "address":
      return `${value.slice(0, 6)}… [ADDRESS]`;
    default:
      return value.length <= 8 ? "*".repeat(value.length) : `${value.slice(0, 3)}…${"*".repeat(6)}`;
  }
}
