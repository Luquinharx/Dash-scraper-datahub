import { useState, useEffect, useCallback } from 'react';

const FIREBASE_URL = "https://deadclanbb-1f05e-default-rtdb.firebaseio.com";
const REFRESH_MS = 5 * 60 * 1000;

export interface MemberData {
  username: string;
  currentAll: number;
  clanAllTime: number;
  dailyLoot: number;
  clanWeeklyLoot: number;
  dailyTS: number;
  weeklyToDate: number;
  weeklyValues: number[];
  pct: string;
  pctNum: number;
  streak: number;
  streak_type: 'positive' | 'negative';
  isUpdated: boolean;
  isActive: boolean;
  lastCollectedAt: string;
  rank: string;
}

export function useClanData() {
  const [data, setData] = useState<MemberData[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [numWeekCols] = useState(1);
  const [weekLabels] = useState<string[]>(['Current Week']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestDate, setLatestDate] = useState('');
  const [latestCollectedAt, setLatestCollectedAt] = useState('');
  const [updatedCount, setUpdatedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const toNumber = (value: unknown): number => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      };

      const parseLootFromSnap = (snap: any): number | null => {
        if (!snap || typeof snap !== 'object') return null;
        if (snap.alltimeloot !== undefined) return toNumber(snap.alltimeloot);
        if (snap.all_time_loots !== undefined) return toNumber(snap.all_time_loots);
        return null;
      };

      const parseTotalExpFromSnap = (snap: any): number | null => {
        if (!snap || typeof snap !== 'object') return null;
        if (snap.total_exp !== undefined) return toNumber(snap.total_exp);
        if (snap.totalexp !== undefined) return toNumber(snap.totalexp);
        if (snap.alltimets !== undefined) return toNumber(snap.alltimets);
        if (snap.all_time_ts !== undefined) return toNumber(snap.all_time_ts);
        return null;
      };
      const normalizeUsername = (value: unknown): string => String(value || '').trim().toLowerCase();
      const distanceTo8AM = (isoLike: unknown): number => {
        if (!isoLike) return Number.MAX_SAFE_INTEGER;
        const d = new Date(String(isoLike));
        if (!Number.isFinite(d.getTime())) return Number.MAX_SAFE_INTEGER;
        const localFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const timeParts = localFormatter.formatToParts(d);
        const map: Record<string, string> = {};
        timeParts.forEach(({ type, value }) => { map[type] = value; });
        const hh = Number(map.hour || 0);
        const mm = Number(map.minute || 0);
        const totalMinutes = (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
        return Math.abs(totalMinutes - (8 * 60));
      };

      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const p: Record<string, string> = {};
      parts.forEach(({ type, value }) => {
        p[type] = value;
      });

      const spDate = new Date(
        parseInt(p.year, 10),
        parseInt(p.month, 10) - 1,
        parseInt(p.day, 10),
        parseInt(p.hour, 10),
        parseInt(p.minute, 10),
        parseInt(p.second, 10)
      );

      const adjustedDate = new Date(spDate.getTime() - 8 * 60 * 60 * 1000);

      const yyyy = adjustedDate.getFullYear();
      const mm = String(adjustedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(adjustedDate.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const yesterday = new Date(adjustedDate.getTime() - 24 * 60 * 60 * 1000);
      const yY = yesterday.getFullYear();
      const yM = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yD = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yY}-${yM}-${yD}`;

      const [profRes, dailyRes, todayDailyRes] = await Promise.all([
        fetch(`${FIREBASE_URL}/profiles.json`).catch(() => null),
        fetch(`${FIREBASE_URL}/daily.json?orderBy=%22$key%22&endAt=${encodeURIComponent(`"${yesterdayStr}"`)}&limitToLast=7`).catch(() => null),
        fetch(`${FIREBASE_URL}/daily/${todayStr}.json`).catch(() => null),
      ]);

      const profiles = profRes && profRes.ok ? await profRes.json() : {};
      const dailyData = dailyRes && dailyRes.ok ? await dailyRes.json() : {};
      const todayDailyData = todayDailyRes && todayDailyRes.ok ? await todayDailyRes.json() : {};

      if (!profiles || profiles.error) {
        setData([]);
        setLoading(false);
        return;
      }

      const dailyDates = Object.keys(dailyData || {})
        .sort()
        .filter((d) => d <= yesterdayStr);

      const users = Object.keys(profiles);
      const out: MemberData[] = [];
      let globalCollectedAt = '';

      users.forEach((u) => {
        const val = profiles[u];
        if (!val) return;

        if (val.collected_at && val.collected_at > globalCollectedAt) {
          globalCollectedAt = val.collected_at;
        }

        const username = String(val.username || u);
        const usernameNorm = normalizeUsername(username);
        const dbUserKey = encodeURIComponent(username).replace(/\./g, '%2E');

        const getSnapForUser = (container: any) =>
          container?.[dbUserKey] ?? container?.[u] ?? container?.[username];

        const currentAll = toNumber(val.all_time_loots);
        const clanAllTime = toNumber(val.all_time_clan_loots);
        const currentTS = toNumber(val.alltimets ?? val.all_time_ts ?? 0);
        const currentTotalExp = toNumber(val.total_exp ?? val.totalexp ?? val.alltimets ?? val.all_time_ts ?? 0);

        let baselineLoot: number | null = null;
        let baselineExp: number | null = null;

        // Daily loot baseline stays based on most recent completed day snapshots.
        for (let i = dailyDates.length - 1; i >= 0; i--) {
          const snap = getSnapForUser(dailyData[dailyDates[i]]);
          const loot = parseLootFromSnap(snap);
          if (loot !== null) {
            baselineLoot = loot;
            break;
          }
        }

        // Daily TS baseline: use snapshot closest to 08:00 for current adjusted day.
        const todayCandidateMap = new Map<string, any>();
        const addCandidate = (key: string, snap: any) => {
          if (!snap || typeof snap !== 'object') return;
          if (!todayCandidateMap.has(key)) todayCandidateMap.set(key, snap);
        };

        addCandidate('direct', getSnapForUser(todayDailyData));
        Object.entries(todayDailyData || {}).forEach(([rawKey, rawSnap]) => {
          const snap = rawSnap as any;
          const snapUserNorm = normalizeUsername(snap?.username);
          let decodedKey = rawKey;
          try {
            decodedKey = decodeURIComponent(rawKey);
          } catch {
            decodedKey = rawKey;
          }
          const keyNorm = normalizeUsername(decodedKey);
          if (snapUserNorm === usernameNorm || keyNorm === usernameNorm) {
            addCandidate(rawKey, snap);
          }
        });

        let bestExp: number | null = null;
        let bestDistance = Number.MAX_SAFE_INTEGER;
        todayCandidateMap.forEach((snap) => {
          const exp = parseTotalExpFromSnap(snap);
          if (exp === null) return;
          const distance = distanceTo8AM(snap?.collected_at);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestExp = exp;
          }
        });

        baselineExp = bestExp;

        if (baselineExp === null) {
          for (let i = dailyDates.length - 1; i >= 0; i--) {
            const snap = getSnapForUser(dailyData[dailyDates[i]]);
            const exp = parseTotalExpFromSnap(snap);
            if (exp !== null) {
              baselineExp = exp;
              break;
            }
          }
        }

        const dailyLoot = baselineLoot !== null ? Math.max(0, currentAll - baselineLoot) : 0;
        const dailyTS = baselineExp !== null ? Math.max(0, currentTotalExp - baselineExp) : 0;

        const weeklyLoot = toNumber(val.weekly_loots);
        const clanWeeklyLoot = toNumber(val.clan_weekly_loots);

        let months = 0;
        if (val.last_clan_join) {
          const joinDate = new Date(val.last_clan_join);
          months = Math.floor((new Date().getTime() - joinDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
        }
        if (isNaN(months)) months = 0;

        let rank = 'Street Cleaner';
        const score = months * 7000000 + (clanAllTime / 1000) * 500000 + currentTS;
        if (score >= 40000000) rank = 'Blade Master';
        else if (score >= 15000000) rank = 'Guardian';

        out.push({
          username,
          currentAll,
          clanAllTime,
          dailyLoot,
          clanWeeklyLoot,
          dailyTS,
          weeklyToDate: weeklyLoot,
          weeklyValues: [weeklyLoot],
          pct: '0%',
          pctNum: 0,
          streak: weeklyLoot > 0 ? 1 : 0,
          streak_type: weeklyLoot > 0 ? 'positive' : 'negative',
          isUpdated: true,
          isActive: true,
          lastCollectedAt: val.collected_at || '',
          rank,
        });
      });

      setError(null);
      setData(out);
      setLatestCollectedAt(globalCollectedAt);
      setLatestDate(todayStr);
      setUpdatedCount(users.length);
      setTotalCount(users.length);
      setDates([todayStr]);
      setLoading(false);
    } catch (err: any) {
      console.error('Fetch Data Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  return { data, dates, numWeekCols, weekLabels, loading, error, latestDate, latestCollectedAt, updatedCount, totalCount };
}
