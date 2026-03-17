import { buildDefaultWorkCycle, getCycleStatusForYear, shiftDateByYears } from "./work-cycles";

describe("work cycle utilities", () => {
  it("derives the expected status for past, current, and future years", () => {
    const now = new Date("2026-03-17T10:00:00.000Z");

    expect(getCycleStatusForYear(2025, now)).toBe("CLOSED");
    expect(getCycleStatusForYear(2026, now)).toBe("ACTIVE");
    expect(getCycleStatusForYear(2027, now)).toBe("PLANNED");
  });

  it("creates the default workspace scaffold for a year", () => {
    const cycle = buildDefaultWorkCycle(2027);

    expect(cycle).toMatchObject({
      name: "2027 Workspace",
      year: 2027,
      status: "PLANNED",
      billableTarget: 1500,
      efrTarget: 3,
      multiPersonTarget: 1,
    });
  });

  it("shifts dates forward without mutating the original value", () => {
    const originalDate = new Date("2026-03-17T10:00:00.000Z");
    const shiftedDate = shiftDateByYears(originalDate, 1);

    expect(shiftedDate?.toISOString()).toBe("2027-03-17T10:00:00.000Z");
    expect(originalDate.toISOString()).toBe("2026-03-17T10:00:00.000Z");
  });
});
