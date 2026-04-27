export const FIREBASE_RT_URL = "https://deadclanbb-1f05e-default-rtdb.firebaseio.com";

export type BankLogFields = {
  _?: string | number;
  action?: string;
  currency?: string;
  time?: string;
  username?: string;
};

export type RawBankLogEntry = {
  fields?: BankLogFields;
  ingested_at?: string;
  run_id?: string;
  tab?: string;
  pagina?: number;
};

export type RawBankRun = {
  bank?: Record<string, RawBankLogEntry> | RawBankLogEntry[];
};

export type BankLogsMeta = {
  ingested_at?: string;
  run_id?: string;
  tabs?: {
    bank?: {
      last_seen_before_run?: string | number;
      newest_row_id?: string | number;
      total_registros_novos?: number;
      total_paginas?: number;
    };
  };
};

export type NormalizedBankLogEntry = {
  id: string;
  legacyId: string;
  rowId: string;
  runId: string;
  entryId: string;
  username: string;
  usernameKey: string;
  action: string;
  currency: string;
  amount: number;
  isCredit: boolean;
  time: string;
  ingestedAt: string;
  ingestedTs: number;
  raw: RawBankLogEntry;
};

export function parseAmountFromCurrency(currency: string): number {
  const digits = (currency || "").replace(/\D/g, "");
  return Number(digits || 0);
}

export function normalizeBankUsername(value: string): string {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function formatBankDateTime(timestampMs: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return "Indisponivel";
  return new Date(timestampMs).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBankPairs(run: RawBankRun): Array<[string, RawBankLogEntry]> {
  const bank = run?.bank;
  if (!bank) return [];
  if (Array.isArray(bank)) {
    return bank.map((entry, index) => [String(index), entry]);
  }
  return Object.entries(bank);
}

export function normalizeBankRuns(runsData: Record<string, RawBankRun> | null | undefined): NormalizedBankLogEntry[] {
  const entries: NormalizedBankLogEntry[] = [];

  Object.entries(runsData || {}).forEach(([runId, run]) => {
    getBankPairs(run).forEach(([entryId, rawEntry]) => {
      const fields = rawEntry?.fields || {};
      const rowId = String(fields._ ?? entryId).trim();
      const username = String(fields.username || "").trim();
      const currency = String(fields.currency || "");
      const action = String(fields.action || "").trim().toLowerCase();
      const ingestedAt = typeof rawEntry?.ingested_at === "string" ? rawEntry.ingested_at : "";
      const ingestedTs = ingestedAt ? Date.parse(ingestedAt) : 0;

      entries.push({
        id: rowId ? `bank_${rowId}` : `${runId}_${entryId}`,
        legacyId: `${runId}_${entryId}`,
        rowId,
        runId,
        entryId,
        username,
        usernameKey: normalizeBankUsername(username),
        action,
        currency,
        amount: parseAmountFromCurrency(currency),
        isCredit: currency.toLowerCase().includes("credit"),
        time: String(fields.time || ""),
        ingestedAt,
        ingestedTs: Number.isFinite(ingestedTs) ? ingestedTs : 0,
        raw: rawEntry,
      });
    });
  });

  return entries;
}

export function isDonationExcluded(entry: NormalizedBankLogEntry, exclusionMap: Record<string, boolean>): boolean {
  return Boolean(exclusionMap[entry.id] || exclusionMap[entry.legacyId]);
}

export function getLatestBankRunLabel(meta: BankLogsMeta | null | undefined, entries: NormalizedBankLogEntry[]): string {
  const metaTs = meta?.ingested_at ? Date.parse(meta.ingested_at) : 0;
  if (Number.isFinite(metaTs) && metaTs > 0) return formatBankDateTime(metaTs);

  const maxEntryTs = entries.reduce((max, entry) => Math.max(max, entry.ingestedTs || 0), 0);
  return formatBankDateTime(maxEntryTs);
}

export function getLatestBankRowId(meta: BankLogsMeta | null | undefined, entries: NormalizedBankLogEntry[]): string {
  const metaBank = meta?.tabs?.bank;
  const fromMeta = metaBank?.newest_row_id ?? metaBank?.last_seen_before_run;
  if (fromMeta !== undefined && fromMeta !== null && String(fromMeta).trim()) {
    return String(fromMeta).trim();
  }

  const maxNumeric = entries.reduce((max, entry) => {
    const n = Number(entry.rowId);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);

  return maxNumeric > 0 ? String(maxNumeric) : "";
}
