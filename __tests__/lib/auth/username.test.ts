import { describe, it, expect, vi } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateTempPassword,
  generateRandomPassword,
  generateUsername,
} from "@/lib/auth/username";

describe("hashPassword / verifyPassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const plain = "Hockey2026!";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash.startsWith("$2b$")).toBe(true);
    await expect(verifyPassword(plain, hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct");
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
  });

  it("produces different hashes for the same password (salt)", async () => {
    const h1 = await hashPassword("same");
    const h2 = await hashPassword("same");
    expect(h1).not.toBe(h2);
  });
});

describe("generateTempPassword", () => {
  it("returns Hockey{year}! format", () => {
    const pwd = generateTempPassword();
    const year = new Date().getFullYear();
    expect(pwd).toBe(`Hockey${year}!`);
  });
});

describe("generateRandomPassword", () => {
  it("returns a string of the requested length (default 8)", () => {
    expect(generateRandomPassword()).toHaveLength(8);
  });

  it("returns a string of a custom length", () => {
    expect(generateRandomPassword(12)).toHaveLength(12);
  });

  it("only contains characters from the allowed charset (no ambiguous 0/O/I/l)", () => {
    const charset = /^[ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789]+$/;
    for (let i = 0; i < 20; i++) {
      expect(generateRandomPassword(16)).toMatch(charset);
    }
  });

  it("produces different values on each call", () => {
    const passwords = new Set(Array.from({ length: 10 }, () => generateRandomPassword()));
    // Extremely unlikely to get duplicates in 10 random 8-char passwords
    expect(passwords.size).toBeGreaterThan(5);
  });
});

describe("generateUsername", () => {
  it("generates base username when no conflicts exist", async () => {
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any;

    const username = await generateUsername("Sarah", "Johnson", mockDb);
    expect(username).toBe("sjohnson001");
  });

  it("increments counter when base username is taken", async () => {
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { auth: { username: "sjohnson001" } },
            { auth: { username: "sjohnson002" } },
          ]),
        }),
      }),
    } as any;

    const username = await generateUsername("Sarah", "Johnson", mockDb);
    expect(username).toBe("sjohnson003");
  });

  it("handles names with special characters by stripping them", async () => {
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any;

    // "O'Brien" → first initial "o", clean last name "obrien"
    const username = await generateUsername("Sean", "O'Brien", mockDb);
    expect(username).toBe("sobrien001");
  });

  it("handles names with numbers or symbols by stripping them", async () => {
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any;

    const username = await generateUsername("A2b", "Smith3", mockDb);
    expect(username).toBe("asmith001");
  });
});
