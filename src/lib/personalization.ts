/**
 * Personalization engine for email templates.
 *
 * Supports:
 * - Merge tags:   {{FirstName}}, {{Company}}, {{CustomField1}}
 * - Fallbacks:    {{FirstName|there}}  →  "there" if empty
 * - Spintax:      {Hello|Hi|Hey}       →  random pick per send
 */

// ── Merge Tags ─────────────────────────────────────────────────

export function mergeTags(
  template: string,
  data: Record<string, string | null | undefined>
): string {
  // {{Key|fallback}} or {{Key}}
  return template.replace(
    /\{\{(\w+)(?:\|([^}]*))?\}\}/g,
    (_match, key: string, fallback?: string) => {
      const value = data[key] ?? data[key.toLowerCase()];
      if (value && value.trim().length > 0) return value;
      if (fallback !== undefined) return fallback;
      return ""; // remove unresolved tags silently
    }
  );
}

// ── Spintax ────────────────────────────────────────────────────

export function resolveSpintax(text: string): string {
  // {option1|option2|option3}  →  random pick
  return text.replace(/\{([^{}]+)\}/g, (_match, inner: string) => {
    const options = inner.split("|").map((s) => s.trim());
    if (options.length <= 1) return inner;
    return options[Math.floor(Math.random() * options.length)];
  });
}

// ── Full Personalization Pipeline ──────────────────────────────

export interface PersonalizationData {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  customFields?: Record<string, string> | null;
}

export function buildVariableMap(
  prospect: PersonalizationData
): Record<string, string> {
  const map: Record<string, string> = {};

  if (prospect.firstName) map["FirstName"] = prospect.firstName;
  if (prospect.lastName) map["LastName"] = prospect.lastName;
  if (prospect.email) map["Email"] = prospect.email;
  if (prospect.company) map["Company"] = prospect.company;
  if (prospect.jobTitle) map["JobTitle"] = prospect.jobTitle;

  // Flatten custom fields
  if (prospect.customFields) {
    for (const [k, v] of Object.entries(prospect.customFields)) {
      map[k] = v;
    }
  }

  return map;
}

export function personalizeEmail(
  subject: string,
  body: string,
  prospect: PersonalizationData
): { subject: string; body: string } {
  const vars = buildVariableMap(prospect);

  let personalizedSubject = resolveSpintax(subject);
  personalizedSubject = mergeTags(personalizedSubject, vars);

  let personalizedBody = resolveSpintax(body);
  personalizedBody = mergeTags(personalizedBody, vars);

  return {
    subject: personalizedSubject,
    body: personalizedBody,
  };
}

// ── Tracking Injection ─────────────────────────────────────────

const TRACKING_DOMAIN =
  process.env.NEXTAUTH_URL || "http://localhost:3000";

export function injectOpenTracker(body: string, eventId: string): string {
  const pixel = `<img src="${TRACKING_DOMAIN}/api/track/open?id=${eventId}" width="1" height="1" style="display:none" alt="" />`;
  return body + "\n" + pixel;
}

export function rewriteLinksForTracking(
  body: string,
  eventId: string
): string {
  // Rewrite http(s) links to tracked redirect URLs
  return body.replace(
    /https?:\/\/[^\s"'<>]+/g,
    (originalUrl) => {
      // Don't rewrite tracking URLs or unsubscribe links
      if (
        originalUrl.includes("/api/track/") ||
        originalUrl.includes("/unsubscribe/")
      ) {
        return originalUrl;
      }
      const encoded = encodeURIComponent(originalUrl);
      return `${TRACKING_DOMAIN}/api/track/click?id=${eventId}&url=${encoded}`;
    }
  );
}

export function addUnsubscribeLink(
  body: string,
  unsubscribeToken: string
): string {
  const url = `${TRACKING_DOMAIN}/unsubscribe/${unsubscribeToken}`;
  const footer = `\n\n---\nIf you no longer wish to receive these emails, <a href="${url}">unsubscribe here</a>.`;
  return body + footer;
}

export function buildUnsubscribeHeaders(
  unsubscribeToken: string
): Record<string, string> {
  const url = `${TRACKING_DOMAIN}/unsubscribe/${unsubscribeToken}`;
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
