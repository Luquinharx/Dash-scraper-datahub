import { useState, useEffect } from 'react';
import { useClanData } from './useClanData';

export interface ClanMemberStat {
  username: string;
  rank: string;
  donatedCash: number;
  donatedCredits: number;
  baseLoot: number;
  scraperLoot: number;
  totalLoot: number;
  dailyLoot: number;
  weeklyLoot: number;
  clanWeeklyLoot: number;
}

type ExclusionMap = Record<string, boolean>;

interface BankLogFields {
  action?: string;
  currency?: string;
  time?: string;
  username?: string;
}

interface BankLogEntry {
  fields?: BankLogFields;
  ingested_at?: string;
}

interface BankRun {
  bank?: Record<string, BankLogEntry> | BankLogEntry[];
}

function parseAmountFromCurrency(currency: string): number {
  const digits = (currency || '').replace(/\D/g, '');
  return Number(digits || 0);
}

function toPtBrDateTime(timestampMs: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return 'Indisponivel';
  return new Date(timestampMs).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBankEntries(run: BankRun): Array<[string, BankLogEntry]> {
  const bank = run?.bank;
  if (!bank) return [];
  if (Array.isArray(bank)) {
    return bank.map((entry, index) => [String(index), entry]);
  }
  return Object.entries(bank);
}

export function useAllClanStats() {
  const [stats, setStats] = useState<ClanMemberStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedUrl, setLastUpdatedUrl] = useState<string>('');
  const { data: scraperData, loading: scraperLoading } = useClanData();
  const [bankData, setBankData] = useState<Record<string, BankRun> | null>(null);
  const [exclusionMap, setExclusionMap] = useState<ExclusionMap>({});

  useEffect(() => {
    let mounted = true;

    async function loadBankAndExclusions() {
      try {
        const [runsRes, exclusionsRes] = await Promise.all([
          fetch('https://deadclanbb-1f05e-default-rtdb.firebaseio.com/clan_logs/runs.json'),
          fetch('https://deadclanbb-1f05e-default-rtdb.firebaseio.com/config/donation_exclusions.json'),
        ]);

        const runsJson = runsRes.ok ? await runsRes.json() : {};
        const exclusionsJson = exclusionsRes.ok ? await exclusionsRes.json() : {};

        if (!mounted) return;
        setBankData((runsJson || {}) as Record<string, BankRun>);
        setExclusionMap((exclusionsJson || {}) as ExclusionMap);
      } catch (error) {
        console.error('Failed to load bank logs:', error);
        if (!mounted) return;
        setBankData({});
        setExclusionMap({});
      }
    }

    loadBankAndExclusions();
    const interval = setInterval(loadBankAndExclusions, 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    async function fetchStats() {
      if (scraperLoading || !bankData) return;
      setLoading(true);
      try {
        const donatedCashMap: Record<string, number> = {};
        const donatedCreditsMap: Record<string, number> = {};
        let maxTimestamp = 0;

        Object.entries(bankData).forEach(([runId, run]) => {
          getBankEntries(run).forEach(([entryId, entry]) => {
            const fields = entry?.fields;
            if (!fields) return;

            const ts = entry?.ingested_at ? Date.parse(entry.ingested_at) : NaN;
            if (Number.isFinite(ts) && ts > maxTimestamp) {
              maxTimestamp = ts;
            }

            const action = String(fields.action || '').toLowerCase();
            if (action !== 'give') return;

            const username = String(fields.username || '').trim();
            if (!username) return;

            const currency = String(fields.currency || '');
            const amount = parseAmountFromCurrency(currency);
            const isCredit = currency.toLowerCase().includes('credit');

            const donationId = `${runId}_${entryId}`;
            if (exclusionMap[donationId]) return;

            const usernameKey = username.toLowerCase();
            if (isCredit) {
              donatedCreditsMap[usernameKey] = (donatedCreditsMap[usernameKey] || 0) + amount;
            } else {
              donatedCashMap[usernameKey] = (donatedCashMap[usernameKey] || 0) + amount;
            }
          });
        });

        setLastUpdatedUrl(toPtBrDateTime(maxTimestamp));

        const mergedStats: ClanMemberStat[] = scraperData.map((scUser) => {
          const usernameKey = scUser.username.toLowerCase();
          return {
            username: scUser.username,
            rank: scUser.rank || 'Street Cleaner',
            donatedCash: donatedCashMap[usernameKey] || 0,
            donatedCredits: donatedCreditsMap[usernameKey] || 0,
            baseLoot: 0,
            scraperLoot: scUser.clanAllTime,
            totalLoot: scUser.clanAllTime,
            dailyLoot: scUser.dailyLoot,
            weeklyLoot: scUser.weeklyToDate,
            clanWeeklyLoot: scUser.clanWeeklyLoot,
          };
        });

        mergedStats.sort((a, b) => b.totalLoot - a.totalLoot);
        setStats(mergedStats);
      } catch (error) {
        console.error('Error fetching all clan stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [scraperData, scraperLoading, bankData, exclusionMap]);

  return { stats, loading, lastUpdated: lastUpdatedUrl };
}
