import { describe, expect, it } from "vitest";
import { cleanOverride, sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("mantém a formatação permitida", () => {
    expect(sanitizeHtml('<b>oi</b> <span style="color: #ff0000; font-size: 24px">x</span>')).toBe('<b>oi</b> <span style="color:#ff0000;font-size:24px">x</span>');
    expect(sanitizeHtml('<u>a</u><mark>b</mark><br>c')).toBe("<u>a</u><mark>b</mark><br>c");
    expect(sanitizeHtml('<font color="#123456">x</font>')).toBe('<span style="color:#123456">x</span>');
  });
  it("remove scripts, eventos e links", () => {
    expect(sanitizeHtml('<img src=x onerror="alert(1)">oi')).toBe("oi");
    expect(sanitizeHtml("<script>alert(1)</script>")).toBe("alert(1)");
    expect(sanitizeHtml('<span onclick="x()" style="background:url(javascript:x)">a</span>')).toBe("<span>a</span>");
    expect(sanitizeHtml('<a href="javascript:x">a</a>')).toBe("a");
    expect(sanitizeHtml("a < b & c")).toBe("a &lt; b &amp; c");
  });
  it("valida overrides pelo tipo", () => {
    expect(cleanOverride("link.cta", "javascript:alert(1)")).toBeUndefined();
    expect(cleanOverride("link.cta", "https://wa.me/55")).toBe("https://wa.me/55");
    expect(cleanOverride("theme.gold", "red;}")).toBeUndefined();
    expect(cleanOverride("img.logo", { src: "https://evil.com/x.png" })).toBeUndefined();
    expect(cleanOverride("img.logo", { src: "/api/assets/abc123", zoom: 9 })).toEqual({ src: "/api/assets/abc123", x: 50, y: 50, zoom: 3 });
    expect(cleanOverride("txt.a", "html:<b onmouseover=x>ok</b>")).toBe("html:<b>ok</b>");
  });
});
