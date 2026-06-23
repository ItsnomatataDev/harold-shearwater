import { describe, expect, it } from "vitest";
import { normalizeHaroldWebhookResponse } from "./harold-webhook-contract";

describe("normalizeHaroldWebhookResponse", () => {
  it("reads the standard n8n output field", () => {
    expect(normalizeHaroldWebhookResponse({ output: "Hello from Harold" })).toEqual({
      reply: "Hello from Harold",
      handover: false,
      handoverReason: null,
    });
  });

  it("reads nested automatic handover instructions", () => {
    expect(
      normalizeHaroldWebhookResponse({
        data: {
          reply: "I am connecting you with the team.",
          action: "handover",
          reason: "Human approval is required",
        },
      }),
    ).toEqual({
      reply: "I am connecting you with the team.",
      handover: true,
      handoverReason: "Human approval is required",
    });
  });

  it("supports the array response shape commonly returned by n8n", () => {
    expect(normalizeHaroldWebhookResponse([{ response: "Array response" }])).toEqual({
      reply: "Array response",
      handover: false,
      handoverReason: null,
    });
  });
});
