export interface GoldenDuskEnvelope<T> {
  isSuccess: boolean;
  message: string | null;
  time: string;
  data: T;
}

export interface GoldenDuskAgentLoginResult {
  status: string | null;
  mfaChallengeToken: string | null;
  factors: string[] | null;
  message: string | null;
}

export type GoldenDuskLoginNextStep = "mfa_verify" | "mfa_setup";

export interface GoldenDuskActivationTokenValidation {
  valid: boolean;
  expired?: boolean;
  email?: string | null;
  agencyName?: string | null;
  consultantName?: string | null;
}

export interface GoldenDuskMfaSetupResult {
  secret: string | null;
  otpAuthUri: string | null;
  issuer: string | null;
  account: string | null;
}

export interface GoldenDuskAgentMe {
  accountId: number;
  email: string | null;
  fullName: string | null;
  agencyId: number;
  agencyName: string | null;
  consultantId: number | null;
  consultantName: string | null;
  currencyId: number;
  currencyCode: string | null;
  mfaEnabled: boolean;
  credit: {
    agencyId: number;
    hasCreditFacility: boolean;
    isCreditAgent: boolean;
    lines: Array<{
      currencyCode: string | null;
      creditLimit: number;
      outstanding: number;
      available: number;
    }> | null;
  } | null;
}

export interface GoldenDuskAgentAuthResult {
  accountId: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  agencyId: number;
  agencyName: string | null;
  consultantId: number | null;
  consultantName: string | null;
  mfaEnabled: boolean;
  jwtToken: string | null;
  recoveryCodes: string[] | null;
}

export interface GoldenDuskAgentConnectionRow {
  membership_id: string;
  organization_id: string;
  golden_dusk_account_id: number;
  golden_dusk_agency_id: number;
  golden_dusk_consultant_id: number | null;
  connected_email: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  agency_name: string | null;
  consultant_name: string | null;
}

export interface GoldenDuskActivityQuoteLine {
  productId: number;
  productName: string;
  dateOfActivity: string;
  quantity: number;
  childQuantity?: number;
}

export interface GoldenDuskActivityQuoteResult {
  totalAmount: number;
  amountDue: number | null;
  currencyCode: string | null;
  message: string | null;
  raw: Record<string, unknown>;
}
