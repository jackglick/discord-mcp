import { describe, test, expect } from "bun:test";
import {
  resolvePermissionNames,
  buildPermissionBitfield,
} from "../../src/discord/permissions.ts";

describe("resolvePermissionNames", () => {
  test("single permission: '8' resolves to Administrator", () => {
    expect(resolvePermissionNames("8")).toEqual(["Administrator"]);
  });

  test("multiple permissions: '3072' resolves to ViewChannel + SendMessages", () => {
    expect(resolvePermissionNames("3072")).toEqual([
      "ViewChannel",
      "SendMessages",
    ]);
  });

  test("'0' returns empty array", () => {
    expect(resolvePermissionNames("0")).toEqual([]);
  });

  test("large bitfield with bits above 40 resolves correctly", () => {
    // UseSoundboard is 1n << 42n = 4398046511104
    const bitfield = (1n << 42n).toString();
    expect(resolvePermissionNames(bitfield)).toEqual(["UseSoundboard"]);
  });
});

describe("buildPermissionBitfield", () => {
  test("single permission: Administrator produces '8'", () => {
    expect(buildPermissionBitfield(["Administrator"])).toBe("8");
  });

  test("multiple permissions: ViewChannel + SendMessages produces '3072'", () => {
    expect(buildPermissionBitfield(["ViewChannel", "SendMessages"])).toBe(
      "3072",
    );
  });

  test("empty array produces '0'", () => {
    expect(buildPermissionBitfield([])).toBe("0");
  });

  test("throws on unknown permission name", () => {
    expect(() =>
      buildPermissionBitfield(["NotARealPermission" as any]),
    ).toThrow("Unknown permission: NotARealPermission");
  });
});

describe("roundtrip", () => {
  test("buildPermissionBitfield(resolvePermissionNames(x)) === x", () => {
    const bitfield = "3072";
    const names = resolvePermissionNames(bitfield);
    expect(buildPermissionBitfield(names)).toBe(bitfield);
  });
});
