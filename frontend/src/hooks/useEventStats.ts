import { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { useClanData } from './useClanData';

export interface EventMemberStat {
  username: string;
  rank: string;
  donatedCash: number;
  donatedCredits: number;
}

function normalizeUsername(value: string): string {
  return (value || '').trim().toLowerCase();
}

function formatTimestampPtBr(timestampMs: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return '';
  return new Date(timestampMs).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function useEventStats() {
  const [stats, setStats] = useState<EventMemberStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedUrl, setLastUpdatedUrl] = useState<string>('');
  const { data: scraperData, loading: scraperLoading } = useClanData();
  const [bankData, setBankData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const runsRef = ref(rtdb, 'clan_logs/runs');
    const unsubscribe = onValue(
      runsRef,
      (snapshot) => {
        setBankData((snapshot.val() || {}) as Record<string, any>);
      },
      (error) => {
        console.error('Error listening clan_logs/runs:', error);
        setBankData({});
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function fetchStats() {
      if (scraperLoading || bankData === null) return;
      setLoading(true);
      try {
        const donatedCashMap: Record<string, number> = {};
        const donatedCreditsMap: Record<string, number> = {};
        const allLogs: any[] = [];
        let maxIngestedTimestamp = 0;

        if (bankData && typeof bankData === 'object') {
          Object.values(bankData).forEach((run: any) => {
            if (!run?.bank) return;
            const entries = Array.isArray(run.bank) ? run.bank : Object.values(run.bank);
            entries.forEach((v: any) => {
              if (v?.fields) {
                allLogs.push(v.fields);
              }

              const parsed = v?.ingested_at ? Date.parse(v.ingested_at) : NaN;
              if (Number.isFinite(parsed) && parsed > maxIngestedTimestamp) {
                maxIngestedTimestamp = parsed;
              }
            });
          });
        }

        setLastUpdatedUrl(formatTimestampPtBr(maxIngestedTimestamp));

        const isDateInEventRange = (timeStr: string) => {
          if (!timeStr) return false;
          const parts = timeStr.split(' ');
          if (parts.length === 0) return false;
          const dateParts = parts[0].split('/');
          if (dateParts.length < 3) return false;

          const month = parseInt(dateParts[0], 10);
          const day = parseInt(dateParts[1], 10);
          const year = parseInt(dateParts[2], 10);
          if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) return false;

          return year === 2026 && month === 4 && day >= 9 && day <= 12;
        };

        allLogs.forEach((fields) => {
          if (fields.action !== 'give' || !fields.username || !isDateInEventRange(fields.time)) return;
          const curr = String(fields.currency || '').toLowerCase();
          const amount = Number(curr.replace(/[^0-9]/g, '')) || 0;
          const usernameKey = normalizeUsername(String(fields.username));
          if (!usernameKey) return;

          if (curr.includes('credit')) {
            donatedCreditsMap[usernameKey] = (donatedCreditsMap[usernameKey] || 0) + amount;
          } else {
            donatedCashMap[usernameKey] = (donatedCashMap[usernameKey] || 0) + amount;
          }
        });

        const mergedStats: EventMemberStat[] = scraperData.map((scUser) => {
          const usernameKey = normalizeUsername(scUser.username);
          return {
            username: scUser.username,
            rank: scUser.rank || 'Street Cleaner',
            donatedCash: donatedCashMap[usernameKey] || 0,
            donatedCredits: donatedCreditsMap[usernameKey] || 0,
          };
        });

        setStats(mergedStats);
      } catch (error) {
        console.error('Error fetching event stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [scraperData, scraperLoading, bankData]);

  return { stats, loading, lastUpdated: lastUpdatedUrl };
}
