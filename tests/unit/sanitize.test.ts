import {
  stripHtml,
  sanitizeText,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeObject,
  sanitizeEmailHtml,
} from "@/lib/security/sanitize";

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("handles string without HTML", () => {
    expect(stripHtml("Hello world")).toBe("Hello world");
  });

  it("removes self-closing tags", () => {
    expect(stripHtml("Hello<br/>world")).toBe("Helloworld");
  });

  it("removes script tags", () => {
    expect(stripHtml('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
  });
});

describe("sanitizeText", () => {
  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("removes null bytes", () => {
    expect(sanitizeText("hello\0world")).toBe("helloworld");
  });

  it("truncates to max length", () => {
    expect(sanitizeText("hello world", 5)).toBe("hello");
  });

  it("uses default max length of 10000", () => {
    const long = "a".repeat(20000);
    expect(sanitizeText(long).length).toBe(10000);
  });
});

describe("sanitizeEmail", () => {
  it("lowercases email", () => {
    expect(sanitizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  it("trims whitespace", () => {
    expect(sanitizeEmail("  user@example.com  ")).toBe("user@example.com");
  });

  it("truncates to 320 chars", () => {
    const long = "a".repeat(400) + "@example.com";
    expect(sanitizeEmail(long).length).toBeLessThanOrEqual(320);
  });
});

describe("sanitizeUrl", () => {
  it("accepts valid https URL", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
  });

  it("accepts valid http URL", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<h1>hi</h1>")).toBeNull();
  });

  it("rejects ftp: protocol", () => {
    expect(sanitizeUrl("ftp://example.com")).toBeNull();
  });

  it("rejects invalid URL", () => {
    expect(sanitizeUrl("not-a-url")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com/");
  });
});

describe("sanitizeObject", () => {
  it("sanitizes string values", () => {
    const result = sanitizeObject({ name: "  hello\0  ", age: 25 });
    expect(result.name).toBe("hello");
    expect(result.age).toBe(25);
  });

  it("sanitizes nested objects", () => {
    const result = sanitizeObject({
      user: { name: "  test\0  " },
    });
    expect((result.user as { name: string }).name).toBe("test");
  });

  it("respects max length", () => {
    const result = sanitizeObject({ name: "hello world" }, 5);
    expect(result.name).toBe("hello");
  });

  it("preserves non-string values", () => {
    const result = sanitizeObject({ count: 42, active: true, items: [1, 2] });
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.items).toEqual([1, 2]);
  });
});

describe("sanitizeEmailHtml", () => {
  it("removes script tags", () => {
    const result = sanitizeEmailHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result).toBe("<p>Hello</p>");
    expect(result).not.toContain("script");
  });

  it("removes event handlers", () => {
    const result = sanitizeEmailHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
  });

  it("removes javascript: URLs in href", () => {
    const result = sanitizeEmailHtml('<a href="javascript:alert(1)">Click</a>');
    expect(result).not.toContain("javascript:");
    expect(result).toContain('href="#"');
  });

  it("removes javascript: URLs in src", () => {
    const result = sanitizeEmailHtml('<img src="javascript:alert(1)">');
    expect(result).not.toContain("javascript:");
  });

  it("removes data: URLs (non-image)", () => {
    const result = sanitizeEmailHtml('<img src="data:text/html,<h1>hi</h1>">');
    expect(result).toContain('src=""');
  });

  it("preserves normal HTML", () => {
    const html = '<p>Hello <a href="https://example.com">world</a></p>';
    expect(sanitizeEmailHtml(html)).toBe(html);
  });

  it("removes onclick handlers", () => {
    const result = sanitizeEmailHtml('<button onclick="alert(1)">Click</button>');
    expect(result).not.toContain("onclick");
  });
});
