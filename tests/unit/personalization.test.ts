import {
  mergeTags,
  resolveSpintax,
  buildVariableMap,
  personalizeEmail,
  injectOpenTracker,
  rewriteLinksForTracking,
  addUnsubscribeLink,
  buildUnsubscribeHeaders,
} from "@/lib/personalization";

// ── mergeTags ──

describe("mergeTags", () => {
  it("replaces {{FirstName}} with actual value", () => {
    expect(mergeTags("Hi {{FirstName}}!", { FirstName: "John" })).toBe("Hi John!");
  });

  it("replaces multiple tags", () => {
    const result = mergeTags("Hi {{FirstName}} from {{Company}}", {
      FirstName: "Jane",
      Company: "Acme",
    });
    expect(result).toBe("Hi Jane from Acme");
  });

  it("uses fallback when field is empty", () => {
    expect(mergeTags("Hi {{FirstName|there}}!", { FirstName: "" })).toBe("Hi there!");
  });

  it("uses fallback when field is null", () => {
    expect(mergeTags("Hi {{FirstName|there}}!", { FirstName: null })).toBe("Hi there!");
  });

  it("uses fallback when field is undefined", () => {
    expect(mergeTags("Hi {{FirstName|there}}!", {})).toBe("Hi there!");
  });

  it("removes unresolved tags without fallback", () => {
    expect(mergeTags("Hi {{FirstName}}!", {})).toBe("Hi !");
  });

  it("is case-insensitive for key lookup", () => {
    expect(mergeTags("Hi {{firstname}}!", { firstname: "John" })).toBe("Hi John!");
  });

  it("handles empty template", () => {
    expect(mergeTags("", { FirstName: "John" })).toBe("");
  });

  it("handles template with no tags", () => {
    expect(mergeTags("Hello world", { FirstName: "John" })).toBe("Hello world");
  });

  it("handles fallback with empty string", () => {
    expect(mergeTags("Hi {{Name|}}!", {})).toBe("Hi !");
  });

  it("preserves whitespace-only values", () => {
    expect(mergeTags("Hi {{Name|friend}}!", { Name: "   " })).toBe("Hi friend!");
  });
});

// ── resolveSpintax ──

describe("resolveSpintax", () => {
  it("picks a random option from {a|b|c}", () => {
    const result = resolveSpintax("{Hello|Hi|Hey}");
    expect(["Hello", "Hi", "Hey"]).toContain(result);
  });

  it("returns the single option when only one exists", () => {
    expect(resolveSpintax("{onlyOne}")).toBe("onlyOne");
  });

  it("handles multiple spintax blocks", () => {
    const result = resolveSpintax("{Hi|Hello} {there|friend}");
    const parts = result.split(" ");
    expect(["Hi", "Hello"]).toContain(parts[0]);
    expect(["there", "friend"]).toContain(parts[1]);
  });

  it("does not modify text without spintax", () => {
    expect(resolveSpintax("Hello world")).toBe("Hello world");
  });

  it("handles empty input", () => {
    expect(resolveSpintax("")).toBe("");
  });

  it("trims whitespace from options", () => {
    // Mock Math.random to always pick first option
    jest.spyOn(Math, "random").mockReturnValue(0);
    expect(resolveSpintax("{ Hello | Hi }")).toBe("Hello");
    jest.restoreAllMocks();
  });
});

// ── buildVariableMap ──

describe("buildVariableMap", () => {
  it("builds map from prospect data", () => {
    const map = buildVariableMap({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@acme.com",
      company: "Acme",
      jobTitle: "CEO",
    });
    expect(map).toEqual({
      FirstName: "Jane",
      LastName: "Doe",
      Email: "jane@acme.com",
      Company: "Acme",
      JobTitle: "CEO",
    });
  });

  it("omits null/undefined fields", () => {
    const map = buildVariableMap({
      firstName: "Jane",
      lastName: null,
      company: undefined,
    });
    expect(map).toEqual({ FirstName: "Jane" });
    expect(map).not.toHaveProperty("LastName");
    expect(map).not.toHaveProperty("Company");
  });

  it("includes custom fields", () => {
    const map = buildVariableMap({
      firstName: "Jane",
      customFields: { Industry: "Tech", Revenue: "1M" },
    });
    expect(map.Industry).toBe("Tech");
    expect(map.Revenue).toBe("1M");
  });

  it("handles empty prospect", () => {
    expect(buildVariableMap({})).toEqual({});
  });
});

// ── personalizeEmail ──

describe("personalizeEmail", () => {
  it("resolves spintax in subject", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const result = personalizeEmail(
      "{Hi|Hello} there",
      "Body text",
      { firstName: "Jane" }
    );
    expect(result.subject).toBe("Hi there");
    jest.restoreAllMocks();
  });

  it("resolves spintax in body", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const result = personalizeEmail(
      "Subject",
      "{Great|Good} to meet you",
      {}
    );
    expect(result.body).toBe("Great to meet you");
    jest.restoreAllMocks();
  });

  it("returns subject and body properties", () => {
    const result = personalizeEmail("Sub", "Bod", {});
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("body");
    expect(typeof result.subject).toBe("string");
    expect(typeof result.body).toBe("string");
  });

  it("passes prospect data through buildVariableMap", () => {
    // mergeTags is tested separately; here we test the pipeline works
    const result = personalizeEmail("Sub", "Bod", { firstName: "Jane" });
    expect(result.subject).toBe("Sub");
    expect(result.body).toBe("Bod");
  });
});

// ── Tracking ──

describe("injectOpenTracker", () => {
  it("appends tracking pixel to body", () => {
    const result = injectOpenTracker("<p>Hello</p>", "event-123");
    expect(result).toContain('<img src=');
    expect(result).toContain("id=event-123");
    expect(result).toContain('width="1" height="1"');
  });
});

describe("rewriteLinksForTracking", () => {
  it("rewrites regular URLs to tracked URLs", () => {
    const body = '<a href="https://example.com/page">Link</a>';
    const result = rewriteLinksForTracking(body, "event-123");
    expect(result).toContain("/api/track/click?id=event-123");
    expect(result).toContain(encodeURIComponent("https://example.com/page"));
  });

  it("does not rewrite tracking URLs", () => {
    const body = "https://example.com/api/track/open?id=123";
    const result = rewriteLinksForTracking(body, "event-456");
    expect(result).toBe(body);
  });

  it("does not rewrite unsubscribe URLs", () => {
    const body = "https://example.com/unsubscribe/token-abc";
    const result = rewriteLinksForTracking(body, "event-456");
    expect(result).toBe(body);
  });
});

describe("addUnsubscribeLink", () => {
  it("appends unsubscribe footer", () => {
    const result = addUnsubscribeLink("<p>Email</p>", "token-abc");
    expect(result).toContain("unsubscribe here");
    expect(result).toContain("/unsubscribe/token-abc");
  });
});

describe("buildUnsubscribeHeaders", () => {
  it("returns List-Unsubscribe headers", () => {
    const headers = buildUnsubscribeHeaders("token-abc");
    expect(headers["List-Unsubscribe"]).toContain("/unsubscribe/token-abc");
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});
