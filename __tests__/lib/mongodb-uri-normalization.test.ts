import { describe, expect, it } from "vitest";
import { normalizeMongoUriCredentials } from "@/lib/mongodb";

describe("normalizeMongoUriCredentials", () => {
  it("encodes unescaped special characters in credentials", () => {
    const uri =
      "mongodb+srv://my.user:p@ss:w/rd@cluster0.example.mongodb.net/hockey-app?retryWrites=true&w=majority";

    const normalized = normalizeMongoUriCredentials(uri);

    expect(normalized).toBe(
      "mongodb+srv://my.user:p%40ss%3Aw%2Frd@cluster0.example.mongodb.net/hockey-app?retryWrites=true&w=majority",
    );
  });

  it("preserves already-encoded credentials", () => {
    const uri =
      "mongodb+srv://my.user:p%40ss%3Aw%2Frd@cluster0.example.mongodb.net/hockey-app";

    const normalized = normalizeMongoUriCredentials(uri);

    expect(normalized).toBe(uri);
  });

  it("leaves URIs without credentials unchanged", () => {
    const uri = "mongodb://127.0.0.1:27017/hockey-app";

    const normalized = normalizeMongoUriCredentials(uri);

    expect(normalized).toBe(uri);
  });
});
