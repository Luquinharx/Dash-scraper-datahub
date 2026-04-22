import { useState, useEffect } from 'react';

export interface FirestoreClanData {
  joinDate: Date | null;
  baseLoot: number;
  donatedCash: number;
  donatedCredits: number;
}

const FIREBASE_RT_URL = "https://deadclanbb-1f05e-default-rtdb.firebaseio.com";
const REFRESH_MS = 60 * 1000;

type ProfileRecord = {
  username?: string;
  all_time_clan_loots?: number;
  last_clan_join?: string;
};

type ExclusionMap = Record<string, boolean>;
type HiddenUsersMap = Record<string, boolean>;

interface BankLogFields {
  action?: string;
  currency?: string;
  username?: string;
}

interface BankLogEntry {
  fields?: BankLogFields;
}

interface BankRun {
  bank?: Record<string, BankLogEntry> | BankLogEntry[];
}

function normalizeUsername(value: string): string {
  return (value || '').trim().toLowerCase();
}

function parseAmountFromCurrency(currency: string): number {
  const digits = (currency || '').replace(/\D/g, '');
  return Number(digits || 0);
}

function getBankEntries(run: BankRun): Array<[string, BankLogEntry]> {
  const bank = run?.bank;
  if (!bank) return [];
  if (Array.isArray(bank)) {
    return bank.map((entry, index) => [String(index), entry]);
  }
  return Object.entries(bank);
}

export function useFirestoreClanData(username: string | undefined) {
  const [data, setData] = useState<FirestoreClanData>({ joinDate: null, baseLoot: 0, donatedCash: 0, donatedCredits: 0 });
  const [loading, setLoading] = useState(true);
  const [logsData, setLogsData] = useState<Record<string, BankRun> | null>(null);
  const [profilesData, setProfilesData] = useState<Record<string, ProfileRecord> | null>(null);
  const [exclusionMap, setExclusionMap] = useState<ExclusionMap>({});
  const [hiddenUsersMap, setHiddenUsersMap] = useState<HiddenUsersMap>({});

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

      const normalizedHiddenUsers: HiddenUsersMap = {};
      Object.entries((hiddenUsers || {}) as Record<string, boolean>).forEach(([rawKey, enabled]) => {
        if (!enabled) return;
        let decodedKey = rawKey;
        try {
          decodedKey = decodeURIComponent(rawKey);
        } catch {
          decodedKey = rawKey;
        }
        normalizedHiddenUsers[normalizeUsername(decodedKey)] = true;
      });

      setLogsData((logs || {}) as Record<string, BankRun>);
      setProfilesData(profiles && typeof profiles === 'object' ? profiles : null);
      setExclusionMap((exclusions || {}) as ExclusionMap);
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
        const uLower = decodedUsername.toLowerCase().trim();
        const selectedUsernameKey = normalizeUsername(decodedUsername);
        
        let joinDate: Date | null = null;
        let baseLoot = 0;

        if (profilesData) {
          const userProfile = Object.values(profilesData).find((profile) =>
            profile?.username?.toLowerCase().trim() === uLower
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

        Object.entries(logsData).forEach(([runId, run]) => {
          getBankEntries(run).forEach(([entryId, entry]) => {
            const fields = entry?.fields;
            if (!fields) return;

            const action = String(fields.action || '').toLowerCase();
            if (action !== 'give') return;

            const entryUsername = String(fields.username || '').trim();
            const entryUsernameKey = normalizeUsername(entryUsername);
            if (!entryUsernameKey || entryUsernameKey !== uLower) return;

            const donationId = `${runId}_${entryId}`;
            if (exclusionMap[donationId]) return;
            if (hiddenUsersMap[selectedUsernameKey]) return;

            const currency = String(fields.currency || '');
            const amount = parseAmountFromCurrency(currency);
            if (currency.toLowerCase().includes('credit')) {
              donatedCredits += amount;
            } else {
              donatedCash += amount;
            }
          });
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
