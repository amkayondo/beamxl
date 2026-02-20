import { beforeAll, describe, expect, it } from "vitest";

let assertRole: typeof import("@/lib/rbac").assertRole;
let hasRequiredRole: typeof import("@/lib/rbac").hasRequiredRole;

describe("rbac view-only constraints", () => {
  beforeAll(async () => {
    const mod = await import("@/lib/rbac");
    assertRole = mod.assertRole;
    hasRequiredRole = mod.hasRequiredRole;
  });

  it("denies write-level permissions for VIEW_ONLY", () => {
    expect(hasRequiredRole("VIEW_ONLY", "MEMBER")).toBe(false);
    expect(() => assertRole("VIEW_ONLY", "MEMBER")).toThrow("Requires MEMBER role");
  });

  it("allows higher roles for the same action", () => {
    expect(hasRequiredRole("ADMIN", "MEMBER")).toBe(true);
    expect(() => assertRole("OWNER", "ADMIN")).not.toThrow();
  });
});
