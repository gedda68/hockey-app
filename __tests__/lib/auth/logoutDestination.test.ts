import { describe, expect, it } from "vitest";
import { logoutDestination } from "@/lib/auth/logoutDestination";

const apexOrigin = "http://localhost:3001";

describe("logoutDestination", () => {
  it("always returns to the top-level site", () => {
    expect(logoutDestination({ target: "home", apexOrigin })).toBe("http://localhost:3001/");
    expect(logoutDestination({ target: "home", apexOrigin: "http://localhost:3001/" })).toBe("http://localhost:3001/");
  });

  it("sign-in page is on the top-level site too", () => {
    expect(logoutDestination({ target: "login", apexOrigin })).toBe("http://localhost:3001/login");
    expect(logoutDestination({ target: "login", apexOrigin, reason: "idle" })).toBe("http://localhost:3001/login?reason=idle");
  });

  it("ignores an unsafe reason", () => {
    expect(logoutDestination({ target: "login", apexOrigin, reason: "x&y=z" })).toBe("http://localhost:3001/login");
  });
});
