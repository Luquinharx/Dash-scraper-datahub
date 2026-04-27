import { useState, useEffect } from 'react';
import {
  FIREBASE_RT_URL,
  isDonationExcluded,
  normalizeBankRuns,
  normalizeBankUsername,
  type RawBankRun,
} from '../lib/bankLogs';

export interface FirestoreClanData {
  joinDate: Date | null;
  baseLoot: number;
  donatedCash: number;
  donatedCredits: number;
}

type ProfileRecord = {
  username?: string;
  all_time_clan_loots?: number;
  last_clan_join?: string;
};

const REFRESH_MS = 60 * 1000;

export function useFirestoreClanData(username: string | undefined) {
  const [data, setData] = useState<FirestoreClanData>({ joinDate: null, baseLoot: 0, donatedCash: 0, donatedCredits: 0 });
  const [loading, setLoading] = useState(true);
  const [logsData, setLogsData] = useState<Record<string, RawBankRun> | null>(null);
  const [profilesData, setProfilesData] = useState<Record<string, ProfileRecord> | null>(null);
  const [exclusionMap, setExclusionMap] = useState<Record<string, boolean>>({});
  const [hiddenUsersMap, setHiddenUsersMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const loadDependencies = async () => {
      const cacheBust = Date.now();
      const fetchJson = async (path: string) => {
        const hasQuery = path.includes('?');
        const url = `${FIREBASE_RT_URL}${path}${hasQuery ? '&' : '?'}_cb=${cacheBust}`;
        const response = await fetch(url, { cache: 'no-store' }).catch(() => null);
        if (!response || !response.ok) return null;
        return response.json();
      };

      const [logs, profiles, exclusions, hiddenUsers] = await Promise.all([
        fetchJson('/clan_logs/runs.json'),
        fetchJson('/profiles.json'),
        fetchJson('/config/donation_exclusions.json'),
        fetchJson('/config/donation_hidden_users.json'),
      ]);
      if (cancelled) return;

      const normalizedHiddenUsers: Record<string, boolean> = {};
      Object.entries((hiddenUsers || {}) as Record<string, boolean>).forEach(([rawKey, enabled]) => {
        if (!enabled) return;
        let decoded = rawKey;
        try {
          decoded = decodeURIComponent(rawKey);
        } catch {
          decoded = rawKey;
        }
        normalizedHiddenUsers[normalizeBankUsername(decoded)] = true;
      });

      setLogsData((logs || {}) as Record<string, RawBankRun>);
      setProfilesData(profiles && typeof profiles === 'object' ? profiles : null);
      setExclusionMap((exclusions || {}) as Record<string, boolean>);
      setHiddenUsersMap(normalizedHiddenUsers);
    };

    loadDependencies();
    const id = setInterval(loadDependencies, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!username || logsData === null) {
        setData({ joinDate: null, baseLoot: 0, donatedCash: 0, donatedCredits: 0 });
        setLoading(logsData === null);
        return;
      }

      setLoading(true);
      try {
        let decodedUsername = username;
        try {
          decodedUsername = decodeURIComponent(username);
        } catch {
          // ignore
        }
        const usernameKey = normalizeBankUsername(decodedUsername);

        let joinDate: Date | null = null;
        let baseLoot = 0;

        if (profilesData) {
          const userProfile = Object.values(profilesData).find((profile) =>
            normalizeBankUsername(profile?.username || '') === usernameKey
          );

          if (userProfile) {
            baseLoot = Number(userProfile.all_time_clan_loots) || 0;
            if (userProfile.last_clan_join) {
              const parsedDate = new Date(userProfile.last_clan_join);
              if (!isNaN(parsedDate.getTime())) {
                joinDate = parsedDate;
              }
            }
          }
        }

        let donatedCash = 0;
        let donatedCredits = 0;
        normalizeBankRuns(logsData).forEach((entry) => {
          if (entry.action !== 'give') return;
          if (entry.usernameKey !== usernameKey) return;
          if (isDonationExcluded(entry, exclusionMap)) return;
          if (hiddenUsersMap[entry.usernameKey]) return;

          if (entry.isCredit) {
            donatedCredits += entry.amount;
          } else {
            donatedCash += entry.amount;
          }
        });

        setData({ joinDate, baseLoot, donatedCash, donatedCredits });
      } catch (err) {
        console.error('Error fetching firestore clan data:', err);
        setData({ joinDate: null, baseLoot: 0, donatedCash: 0, donatedCredits: 0 });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [username, logsData, profilesData, exclusionMap, hiddenUsersMap]);

  return { data, loading };
}
