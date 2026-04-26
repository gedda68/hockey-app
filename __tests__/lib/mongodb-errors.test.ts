import { describe, expect, it } from "vitest";
import { isMongoAuthError, isMongoConnectionError } from "@/lib/mongodb";

describe("mongo error classifiers", () => {
  it("classifies Atlas bad auth (code 8000) as auth error", () => {
    const err = {
      name: "MongoServerError",
      code: 8000,
      codeName: "AtlasError",
      message: "bad auth : authentication failed",
    };

    expect(isMongoAuthError(err)).toBe(true);
  });

  it("does not classify bad auth as connection error", () => {
    const err = {
      name: "MongoServerError",
      code: 8000,
      codeName: "AtlasError",
      message: "bad auth : authentication failed",
    };

    expect(isMongoConnectionError(err)).toBe(false);
  });

  it("classifies selection timeout as connection error", () => {
    const err = {
      name: "MongoServerSelectionError",
      message: "connect ECONNREFUSED 127.0.0.1:27017",
    };

    expect(isMongoConnectionError(err)).toBe(true);
  });
});
