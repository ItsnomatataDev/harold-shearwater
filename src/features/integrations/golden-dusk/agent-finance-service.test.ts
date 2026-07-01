import { describe, expect, it } from "vitest";
import { parseAgencyFinanceBalance } from "./agent-finance-balance-parser";

describe("parseAgencyFinanceBalance", () => {
  it("normalizes a single balance object", () => {
    const result = parseAgencyFinanceBalance({
      currencyCode: "USD",
      creditLimit: 10000,
      outstanding: 3500,
      available: 6500,
      hasCreditFacility: true,
    });

    expect(result.primary).toEqual({
      currencyId: null,
      currencyCode: "USD",
      creditLimit: 10000,
      outstanding: 3500,
      available: 6500,
      hasCreditFacility: true,
    });
  });

  it("normalizes an array of balance lines", () => {
    const result = parseAgencyFinanceBalance([
      {
        CurrencyCode: "USD",
        CreditLimit: 5000,
        Outstanding: 5000,
        Available: 0,
        HasCreditFacility: true,
      },
    ]);

    expect(result.lines).toHaveLength(1);
    expect(result.primary?.available).toBe(0);
    expect(result.primary?.currencyCode).toBe("USD");
  });
});
