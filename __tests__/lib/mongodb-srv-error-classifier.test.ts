import { describe, expect, it } from "vitest";
import { isMongoConnectionError } from "@/lib/mongodb";

describe("isMongoConnectionError SRV DNS failures", () => {
  it("classifies querySrv ECONNREFUSED as connection error", () => {
    const err = {
      name: "Error",
      code: "ECONNREFUSED",
      syscall: "querySrv",
      hostname: "_mongodb._tcp.cluster0.example.mongodb.net",
      message: "querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net",
    };

    expect(isMongoConnectionError(err)).toBe(true);
  });
});
