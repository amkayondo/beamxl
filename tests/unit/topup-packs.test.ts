import { describe, expect, it } from "vitest";

import { getTopupPack, TOPUP_PACKS } from "@/server/services/topup-packs";

describe("top-up packs", () => {
  it("exposes three launch packs", () => {
    expect(TOPUP_PACKS.length).toBe(3);
  });

  it("finds pack by code case-insensitively", () => {
    const pack = getTopupPack("mini");
    expect(pack?.code).toBe("MINI");
    expect(pack?.priceMinor).toBe(700);
  });

  it("returns undefined for unknown pack", () => {
    expect(getTopupPack("unknown")).toBeUndefined();
  });
});
