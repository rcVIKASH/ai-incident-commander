const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "password",
  "secret",
  "credit_card",
  "card_number",
  "cvv",
  "token",
  "api_key",
  "access_token",
  "refresh_token",
  "auth",
  "private_key",
]);

/**
 * Recursively redacts sensitive keys from an attributes map or JSON object before persistence.
 */
export function sanitizeAttributes(
  attributes?: Record<string, any> | null
): Record<string, any> | null | undefined {
  if (!attributes || typeof attributes !== "object") return attributes;

  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(attributes)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes("password") || lowerKey.includes("secret")) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizeAttributes(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}
