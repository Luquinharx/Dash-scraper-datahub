import { useState, useEffect } from 'react';

export interface FirestoreClanData {
  joinDate: Date | null;
  baseLoot: number;
  donatedCash: number;
  donatedCredits: number;
}

const FIREBASE_RT_URL = "https://deadclanbb-1f05e-default-rtdb.firebaseio.com";

type ProfileRecord = {
  username?: string;
  all_time_clan_loots?: number;
  last_clan_join?: string;
};

export function useFirestoreClanData(username: string | undefined) {
  const [data, setData] = useState<FirestoreClanData>({ joinDate: null, baseLoot: 0, donatedCash: 0, donatedCredits: 0 });
  const [loading, setLoading] = useState(true);
  const [logsData, setLogsData] = useState<any>(null);
  const [profilesData, setProfilesData] = useState<Record<string, ProfileRecord> | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`${FIREBASE_RT_URL}/clan_logs/runs.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${FIREBASE_RT_URL}/profiles.json`).then(r => r.ok ? r.json() : null).catch(() => null)
    ]).then(([logs, profiles]) => {
      if (cancelled) return;
      setLogsData(logs);
      setProfilesData(profiles && typeof profiles === 'object' ? profiles : null);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!username || !logsData) {
        setData({ joinDate: null, baseLoot: 0, donatedCash: 0, donatedCredits: 0 });
        setLoading(!logsData);
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

        // Fetch bank from Realtime Database
        // Already fetched above
        
        let donatedCash = 0;
        let donatedCredits = 0;
        const allLogs: Record<string, any> = {};

        if (logsData) {
          Object.values(logsData).forEach((run: any) => {
            if (run && run.bank) {
              Object.entries(run.bank).forEach(([k, v]: [string, any]) => {
                if (v && v.fields) {
                  allLogs[k] = v.fields;
                }
              });
            }
          });
        }

        Object.values(allLogs).forEach(fields => {
          if (fields.action === 'give' && fields.username && fields.username.toLowerCase().trim() === uLower) {
            const curr = (fields.currency || '').toLowerCase();
            const amountStr = curr.replace(/[^0-9]/g, '');
            const amount = Number(amountStr) || 0;
            if (curr.includes('credit')) {
              donatedCredits += amount;
            } else {
              donatedCash += amount;
            }
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
  }, [username, logsData, profilesData]);

  return { data, loading };
}
