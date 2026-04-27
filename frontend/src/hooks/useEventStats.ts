import { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { useClanData } from './useClanData';
import {
  getLatestBankRunLabel,
  normalizeBankRuns,
  normalizeBankUsername,
  type BankLogsMeta,
  type RawBankRun,
} from '../lib/bankLogs';

export interface EventMemberStat {
  username: string;
  rank: string;
  donatedCash: number;
  donatedCredits: number;
}

export function useEventStats() {
  const [stats, setStats] = useState<EventMemberStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedUrl, setLastUpdatedUrl] = useState<string>('');
  const { data: scraperData, loading: scraperLoading } = useClanData();
  const [bankData, setBankData] = useState<Record<string, RawBankRun> | null>(null);
  const [bankMeta, setBankMeta] = useState<BankLogsMeta | null>(null);

  useEffect(() => {
    const unsubscribeRuns = onValue(
      ref(rtdb, 'clan_logs/runs'),
      (snapshot) => {
        setBankData((snapshot.val() || {}) as Record<string, RawBankRun>);
      },
      (error) => {
        console.error('Error listening clan_logs/runs:', error);
        setBankData({});
      }
    );

    const unsubscribeMeta = onValue(
      ref(rtdb, 'clan_logs_meta/latest_run'),
      (snapshot) => {
        setBankMeta(snapshot.val() as BankLogsMeta | null);
      },
      (error) => {
        console.error('Error listening clan_logs_meta/latest_run:', error);
        setBankMeta(null);
      }
    );

    return () => {
      unsubscribeRuns();
      unsubscribeMeta();
    };
  }, []);

  useEffect(() => {
    function fetchStats() {
      if (scraperLoading || bankData === null) return;
      setLoading(true);
      try {
        const donatedCashMap: Record<string, number> = {};
        const donatedCreditsMap: Record<string, number> = {};
        const bankEntries = normalizeBankRuns(bankData);
        setLastUpdatedUrl(getLatestBankRunLabel(bankMeta, bankEntries));

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

        bankEntries.forEach((entry) => {
          if (entry.action !== 'give' || !entry.username || !isDateInEventRange(entry.time)) return;

          if (entry.isCredit) {
            donatedCreditsMap[entry.usernameKey] = (donatedCreditsMap[entry.usernameKey] || 0) + entry.amount;
          } else {
            donatedCashMap[entry.usernameKey] = (donatedCashMap[entry.usernameKey] || 0) + entry.amount;
          }
        });

        const mergedStats: EventMemberStat[] = scraperData.map((scUser) => {
          const usernameKey = normalizeBankUsername(scUser.username);
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
  }, [scraperData, scraperLoading, bankData, bankMeta]);

  return { stats, loading, lastUpdated: lastUpdatedUrl };
}
