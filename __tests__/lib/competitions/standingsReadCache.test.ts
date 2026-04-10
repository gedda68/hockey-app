import { describe, expect, it, vi } from "vitest";
import {
  getStandingsBundleCached,
  invalidateStandingsBundleCache,
} from "@/lib/competitions/standingsReadCache";

describe("standingsReadCache (E8)", () => {
  it("invalidates all variants for a season competition id", async () => {
    const fetcher = vi.fn().mockResolvedValue({ standings: [] });

    await getStandingsBundleCached(
      "sc-1",
      {
        publishedOnly: true,
        requiresResultApproval: false,
        ladderRules: { pointsWin: 3 },
        includeRollups: false,
      },
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);

    await getStandingsBundleCached(
      "sc-1",
      {
        publishedOnly: true,
        requiresResultApproval: false,
        ladderRules: { pointsWin: 3 },
        includeRollups: false,
      },
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);

    invalidateStandingsBundleCache("sc-1");

    await getStandingsBundleCached(
      "sc-1",
      {
        publishedOnly: true,
        requiresResultApproval: false,
        ladderRules: { pointsWin: 3 },
        includeRollups: false,
      },
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
