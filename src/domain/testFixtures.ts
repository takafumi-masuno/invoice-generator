import type { Estimate, Invoice, Issuer, LineItem } from "./schema";

/** テスト用のデータ。必要な項目だけ上書きして使う */

export const issuerFixture = (overrides: Partial<Issuer> = {}): Issuer => ({
  name: "株式会社サンプル",
  registrationNumber: "T1234567890123",
  postalCode: "100-0001",
  address: "東京都千代田区千代田1-1",
  phone: "03-0000-0000",
  email: "info@example.com",
  bankAccount: "サンプル銀行 本店 普通 1234567",
  ...overrides,
});

export const lineItemFixture = (overrides: Partial<LineItem> = {}): LineItem => ({
  id: "item-1",
  description: "Web サイト制作",
  quantity: 1,
  unit: "式",
  unitPrice: 100000,
  taxRate: 10,
  ...overrides,
});

const baseFixture = {
  id: "doc-1",
  number: "2026-0001",
  issueDate: "2026-11-01",
  subject: "Web サイト制作",
  client: { name: "株式会社テスト", honorific: "御中" as const, address: "" },
  issuer: issuerFixture(),
  items: [lineItemFixture()],
  notes: "",
  rounding: { lineAmount: "floor" as const, tax: "floor" as const },
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

export const invoiceFixture = (overrides: Partial<Invoice> = {}): Invoice => ({
  ...baseFixture,
  kind: "invoice",
  transactionDate: "2026-10-31",
  dueDate: "2026-11-30",
  ...overrides,
});

export const estimateFixture = (overrides: Partial<Estimate> = {}): Estimate => ({
  ...baseFixture,
  kind: "estimate",
  validUntil: "2026-11-30",
  ...overrides,
});
