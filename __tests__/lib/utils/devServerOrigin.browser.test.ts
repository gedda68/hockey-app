import { afterEach, describe, expect, it, vi } from "vitest";
import { alignLocalOriginPort, localDevHost } from "@/lib/utils/devServerOrigin";

const setURL = (url: string) =>
  (window as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL(url);

afterEach(() => {
  vi.unstubAllEnvs();
  setURL("http://localhost:3000/");
});

describe("devServerOrigin (browser side)", () => {
  it("uses the port in the address bar", () => {
    setURL("http://localhost:3001/clubs");
    expect(localDevHost()).toBe("localhost:3001");
  });

  it("aligns a localhost env value to the address-bar port in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    setURL("http://bha.localhost:3001/");
    expect(alignLocalOriginPort("http://localhost:3000")).toBe("http://localhost:3001");
  });
});
