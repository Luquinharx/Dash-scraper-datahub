import { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { useClanData } from './useClanData';
import {
  getLatestBankRunLabel,
  isDonationExcluded,
  normalizeBankRuns,
  normalizeBankUsername,
  type BankLogsMeta,
  type RawBankRun,
} from '../lib/bankLogs';

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
type HiddenUsersMap = Record<string, boolean>;

export function useAllClanStats() {
  const [stats, setStats] = useState<ClanMemberStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedUrl, setLastUpdatedUrl] = useState<string>('');
  const { data: scraperData, loading: scraperLoading } = useClanData();
  const [bankData, setBankData] = useState<Record<string, RawBankRun> | null>(null);
  const [bankMeta, setBankMeta] = useState<BankLogsMeta | null>(null);
  const [exclusionMap, setExclusionMap] = useState<ExclusionMap>({});
  const [hiddenUsersMap, setHiddenUsersMap] = useState<HiddenUsersMap>({});

  useEffect(() => {
    let mounted = true;

    const unsubscribeRuns = onValue(
      ref(rtdb, 'clan_logs/runs'),
      (snapshot) => {
        if (!mounted) return;
        setBankData((snapshot.val() || {}) as Record<string, RawBankRun>);
      },
      (error) => {
        console.error('Failed to listen clan_logs/runs:', error);
        if (!mounted) return;
        setBankData({});
      }
    );

    const unsubscribeMeta = onValue(
      ref(rtdb, 'clan_logs_meta/latest_run'),
      (snapshot) => {
        if (!mounted) return;
        setBankMeta(snapshot.val() as BankLogsMeta | null);
      },
      (error) => {
        console.error('Failed to listen clan_logs_meta/latest_run:', error);
        if (!mounted) return;
        setBankMeta(null);
      }
    );

    const unsubscribeExclusions = onValue(
      ref(rtdb, 'config/donation_exclusions'),
      (snapshot) => {
        if (!mounted) return;
        setExclusionMap((snapshot.val() || {}) as ExclusionMap);
      },
      (error) => {
        console.error('Failed to listen donation exclusions:', error);
        if (!mounted) return;
        setExclusionMap({});
      }
    );

    const unsubscribeHiddenUsers = onValue(
      ref(rtdb, 'config/donation_hidden_users'),
      (snapshot) => {
        if (!mounted) return;
        const hiddenUsersJson = (snapshot.val() || {}) as Record<string, boolean>;
        const normalizedHiddenUsers: HiddenUsersMap = {};
        Object.entries(hiddenUsersJson).forEach(([rawKey, enabled]) => {
          if (!enabled) return;
          let decodedKey = rawKey;
          try {
            decodedKey = decodeURIComponent(rawKey);
          } catch {
            decodedKey = rawKey;
          }
          normalizedHiddenUsers[normalizeBankUsername(decodedKey)] = true;
        });
        setHiddenUsersMap(normalizedHiddenUsers);
      },
      (error) => {
        console.error('Failed to listen hidden users map:', error);
        if (!mounted) return;
        setHiddenUsersMap({});
      }
    );

    return () => {
      mounted = false;
      unsubscribeRuns();
      unsubscribeMeta();
      unsubscribeExclusions();
      unsubscribeHiddenUsers();
    };
  }, []);

  useEffect(() => {
    async function fetchStats() {
      if (scraperLoading || !bankData) return;
      setLoading(true);
      try {
        const donatedCashMap: Record<string, number> = {};
        const donatedCreditsMap: Record<string, number> = {};
        const bankEntries = normalizeBankRuns(bankData);

        bankEntries.forEach((entry) => {
          if (entry.action !== 'give') return;
          if (!entry.username) return;
          if (isDonationExcluded(entry, exclusionMap)) return;
          if (hiddenUsersMap[entry.usernameKey]) return;

          if (entry.isCredit) {
            donatedCreditsMap[entry.usernameKey] = (donatedCreditsMap[entry.usernameKey] || 0) + entry.amount;
          } else {
            donatedCashMap[entry.usernameKey] = (donatedCashMap[entry.usernameKey] || 0) + entry.amount;
          }
        });

        setLastUpdatedUrl(getLatestBankRunLabel(bankMeta, bankEntries));

        const mergedStats: ClanMemberStat[] = scraperData.map((scUser) => {
          const usernameKey = normalizeBankUsername(scUser.username);
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
  }, [scraperData, scraperLoading, bankData, bankMeta, exclusionMap, hiddenUsersMap]);

  return { stats, loading, lastUpdated: lastUpdatedUrl };
}
