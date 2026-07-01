export type AgencyFinanceBalanceLine = {
  currencyId: number | null;
  currencyCode: string;
  creditLimit: number;
  outstanding: number;
  available: number;
  hasCreditFacility: boolean;
};

export type AgencyFinanceBalance = {
  lines: AgencyFinanceBalanceLine[];
  primary: AgencyFinanceBalanceLine | null;
  source: "finance-balance";
};

export type AgencyFinanceDateRange = {
  from: string;
  to: string;
};

export type AgencyFinanceRecord = {
  id: number | null;
  reference: string | null;
  date: string | null;
  description: string | null;
  amount: number | null;
  currencyCode: string | null;
  status: string | null;
  bookingId: number | null;
  guestName: string | null;
  raw: Record<string, unknown>;
};

export type AgencyFinanceOverview = {
  balance: AgencyFinanceBalance | null;
  invoices: AgencyFinanceRecord[];
  statement: AgencyFinanceRecord[];
  payments: AgencyFinanceRecord[];
  refunds: AgencyFinanceRecord[];
  range: AgencyFinanceDateRange;
};
