import { useState, useEffect, useCallback } from "react";

const FIREBASE_RT_URL = "https://deadclanbb-1f05e-default-rtdb.firebaseio.com";
const REFRESH_MS = 60 * 1000;

export interface ClanMemberStats {
  username?: string;
  collected_at?: string;
  weekly_ts?: number;
  clan_weekly_ts?: number;
  exp_since_death?: number;
  all_time_ts?: number;
  total_exp?: number;
  expected_loss_on_death?: number;
  daily_tpk?: number;
  weekly_tpk?: number;
  clan_weekly_tpk?: number;
  all_time_tpk?: number;
  last_players_killed?: string;
  last_hit_by?: string;
  weekly_loots?: number;
  all_time_loots?: number;
  clan_weekly_loots?: number;
  all_time_clan_loots?: number;
  last_clan_join?: string;
  rank?: string;
  rank_score?: number;
  daily_ts_calc?: number;
  
  // Compatibility fields for the frontend
  currentAll: number; // all_time_loots (user's total)
  dailyLoot: number; // Calculated from snapshots
  weeklyToDate: number; // weekly_loots (user's weekly)
  clanAllTime: number; // all_time_clan_loots (user in clan)
  dailyHistory: { data: string; valor: number }[];
  dailyTSHistory: { data: string; valor: number }[];
  weeklyValues: number[];
  weeklyHistory: { semana: string; total: number }[];
  weeklyTSHistory: { semana: string; total: number }[];
}

export function useScrapedUsernames() {
  const [usernames, setUsernames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchJson = async (url: string) => {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0',
          Pragma: 'no-cache',
        },
      }).catch(() => null);
      if (!response || !response.ok) return null;
      return response.json();
    };

    async function load() {
      try {
        const profiles = await fetchJson(`${FIREBASE_RT_URL}/profiles.json?shallow=true&_cb=${Date.now()}`);
        if (!profiles) {
          if (!cancelled) {
            setUsernames([]);
            setLoading(false);
          }
          return;
        }

        if (cancelled) return;
        setUsernames(Object.keys(profiles).sort((a, b) => {
           let da = a, db = b;
           try { da = decodeURIComponent(a); } catch(e){}
           try { db = decodeURIComponent(b); } catch(e){}
           return da.localeCompare(db, undefined, {sensitivity: 'base'});
        }));
      } catch {
        if (!cancelled) setUsernames([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    const interval = setInterval(load, REFRESH_MS);
    const onFocus = () => { load(); };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { usernames, loading };
}

export function useClanMemberData(username: string | undefined) {
  const [stats, setStats] = useState<ClanMemberStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!username) { setStats(null); setLoading(false); return; }

    try {
      const cacheBust = Date.now();
      const fetchJson = async (url: string) => {
        const hasQuery = url.includes('?');
        const withCacheBust = `${url}${hasQuery ? '&' : '?'}_cb=${cacheBust}`;
        const response = await fetch(withCacheBust, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, max-age=0',
            Pragma: 'no-cache',
          },
        }).catch(() => null);
        if (!response || !response.ok) return null;
        return response.json();
      };

      // O dropdown agora passa a chave real do Firebase (ex: "SAO%20Asuna", "killer%20instint%2023").
      // Repassamos direto pra URL sÃ³ fazendo encodeURIComponent nela pra lidar com barras e etc (e transformando em %2520, que o Firebase decoda pra %20 ao buscar no json)
      const dbUser = encodeURIComponent(username).replace(/\./g, '%2E');
      const toNumber = (value: unknown): number => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      };
      const parseLoot = (snap: any): number | null => {
        if (!snap || typeof snap !== "object") return null;
        if (snap.all_time_loots !== undefined) return toNumber(snap.all_time_loots);
        if (snap.alltimeloot !== undefined) return toNumber(snap.alltimeloot);
        return null;
      };
      const parseTotalExp = (snap: any): number | null => {
        if (!snap || typeof snap !== "object") return null;
        if (snap.total_exp !== undefined) return toNumber(snap.total_exp);
        if (snap.totalexp !== undefined) return toNumber(snap.totalexp);
        if (snap.alltimets !== undefined) return toNumber(snap.alltimets);
        if (snap.all_time_ts !== undefined) return toNumber(snap.all_time_ts);
        return null;
      };
      const parseWeeklyTS = (snap: any): number => toNumber(snap?.weekly_ts);
      const capByWeekly = (dailyValue: number, weeklyValue: number): number =>
        Math.min(dailyValue, Math.max(0, weeklyValue));
      const getUserSnap = (container: any) => container?.[dbUser] || container?.[username];
      const calcDailyTS = (oldSnap: any, newSnap: any, capCurrent = false): number => {
        const oldExp = parseTotalExp(oldSnap);
        const newExp = parseTotalExp(newSnap);
        if (oldExp === null || newExp === null) return 0;

        const rawDiff = Math.max(0, newExp - oldExp);
        const oldWeekly = parseWeeklyTS(oldSnap);
        const newWeekly = parseWeeklyTS(newSnap);

        if (capCurrent || (newWeekly > 0 && oldWeekly > 0 && newWeekly < oldWeekly)) {
          return capByWeekly(rawDiff, newWeekly);
        }

        return rawDiff;
      };

      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const parts = formatter.formatToParts(now);
      const p: Record<string, string> = {};
      parts.forEach(({ type, value }) => { p[type] = value; });
      const spDate = new Date(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day), parseInt(p.hour), parseInt(p.minute), parseInt(p.second));
      const adjustedDate = new Date(spDate.getTime() - 8 * 60 * 60 * 1000);
      const adjustedTodayStr = `${adjustedDate.getFullYear()}-${String(adjustedDate.getMonth() + 1).padStart(2, '0')}-${String(adjustedDate.getDate()).padStart(2, '0')}`;

      const dailyDates: string[] = [];
      const shortDates: string[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(adjustedDate.getTime() - i * 24 * 60 * 60 * 1000);
        const yY = d.getFullYear();
        const yM = String(d.getMonth() + 1).padStart(2, '0');
        const yD = String(d.getDate()).padStart(2, '0');
        dailyDates.push(`${yY}-${yM}-${yD}`);
        shortDates.push(`${yD}/${yM}`);
      }

      const yesterday = new Date(adjustedDate.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      const requests = [
        fetchJson(`${FIREBASE_RT_URL}/profiles/${dbUser}.json`),
        fetchJson(`${FIREBASE_RT_URL}/daily.json?orderBy=%22$key%22&endAt=${encodeURIComponent(`"${adjustedTodayStr}"`)}&limitToLast=90`),
        ...dailyDates.map(dateStr => fetchJson(`${FIREBASE_RT_URL}/daily/${dateStr}/${dbUser}.json`))
      ];

      const responses = await Promise.all(requests);
      const data = responses[0];
      const allDailyData = responses[1];

      if (!data || data.error) { setStats(null); setLoading(false); return; }

      const snaps = responses.slice(2);
      snaps.push(data); // Add current live data at the end (index 8)

      const dailyHistory: { data: string; valor: number }[] = [];
      const dailyTSHistory: { data: string; valor: number }[] = [];

      for (let i = 0; i < 8; i++) {
        const oldSnap = snaps[i];
        const newSnap = snaps[i + 1];
        
        // Label must reflect the closed interval start date.
        // This avoids duplicated "20/04" + "Hoje" on the same day.
        const dateLabel = i === 7 ? "Hoje" : shortDates[i];

        if (oldSnap && newSnap) {
          const oldLoot = Number(oldSnap.all_time_loots) || Number(oldSnap.alltimeloot) || 0;
          const newLoot = Number(newSnap.all_time_loots) || Number(newSnap.alltimeloot) || 0;
          const lootDiff = newLoot - oldLoot;
          dailyHistory.push({ data: dateLabel, valor: Math.max(0, lootDiff) }); 

          dailyTSHistory.push({ data: dateLabel, valor: calcDailyTS(oldSnap, newSnap, i === 7) });
        } else {
          dailyHistory.push({ data: dateLabel, valor: 0 });
          dailyTSHistory.push({ data: dateLabel, valor: 0 });
        }
      }

        // Optional: calculate local differences for graphs if needed.
      const currentAll = data.all_time_loots || 0;
      const currentTotalExp = toNumber(data.total_exp ?? data.totalexp ?? data.alltimets ?? data.all_time_ts);
      const weeklyLootsUser = data.weekly_loots || 0;
      const weeklyTSUser = toNumber(data.weekly_ts);
      const allTimeClanLoots = data.all_time_clan_loots || 0;

      // Extract accurate 8AM baselines for the daily cards, using retroactive baseline
      let baselineLoot: number | null = null;
      let baselineExp: number | null = null;
      let cardDailyLoot = 0;
      let cardDailyTS = 0;
      let weeklyHistory: { semana: string; total: number }[] = [];
      let weeklyTSHistory: { semana: string; total: number }[] = [];

      if (allDailyData) {
        const allDailyDates = Object.keys(allDailyData).sort().filter(d => d <= yesterdayStr);
        const allDailyDatesWithToday = Object.keys(allDailyData).sort().filter(d => d <= adjustedTodayStr);
        const todaySnap = getUserSnap(allDailyData[adjustedTodayStr]);
        const todayLoot = parseLoot(todaySnap);
        const todayExp = parseTotalExp(todaySnap);

        if (todayLoot !== null) baselineLoot = todayLoot;
        if (todayExp !== null) baselineExp = todayExp;

        for (let i = allDailyDates.length - 1; i >= 0; i--) {
            const snap = getUserSnap(allDailyData[allDailyDates[i]]);
            if (snap) {
              if (baselineLoot === null) {
                    baselineLoot = parseLoot(snap);
                }
                if (baselineExp === null) {
                    baselineExp = parseTotalExp(snap);
                }
                if (baselineLoot !== null && baselineExp !== null) {
                    break;
                }
            }
        }

        // Build weekly history from daily snapshots + current live profile (adjusted by 08:00 reset window)
        const parseLootValue = (snap: any) => parseLoot(snap) ?? 0;
        const parseTSValue = (snap: any) => parseTotalExp(snap) ?? 0;
        const toWeekStart = (dateStr: string) => {
          const [y, m, d] = dateStr.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          const weekDay = (date.getDay() + 6) % 7; // Monday = 0
          date.setDate(date.getDate() - weekDay);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        const userDailySnapshots = allDailyDatesWithToday
          .map((date) => {
            const snap = getUserSnap(allDailyData[date]);
            if (!snap) return null;
            return { date, loot: parseLootValue(snap), ts: parseTSValue(snap), snap };
          })
          .filter((snap): snap is { date: string; loot: number; ts: number; snap: any } => snap !== null);

        const dailyIntervals: { date: string; loot: number; ts: number }[] = [];
        for (let i = 0; i < userDailySnapshots.length - 1; i++) {
          const oldSnap = userDailySnapshots[i];
          const newSnap = userDailySnapshots[i + 1];
          dailyIntervals.push({
            date: oldSnap.date,
            loot: Math.max(0, newSnap.loot - oldSnap.loot),
            ts: calcDailyTS(oldSnap.snap, newSnap.snap),
          });
        }

        if (userDailySnapshots.length > 0) {
          const latestSnap = userDailySnapshots[userDailySnapshots.length - 1];
          dailyIntervals.push({
            date: adjustedTodayStr,
            loot: Math.max(0, currentAll - latestSnap.loot),
            ts: calcDailyTS(latestSnap.snap, data, true),
          });
        }

        const lootByWeek = new Map<string, number>();
        const tsByWeek = new Map<string, number>();
        dailyIntervals.forEach((interval) => {
          const weekStart = toWeekStart(interval.date);
          lootByWeek.set(weekStart, (lootByWeek.get(weekStart) || 0) + interval.loot);
          tsByWeek.set(weekStart, (tsByWeek.get(weekStart) || 0) + interval.ts);
        });

        const sortedWeeks = Array.from(lootByWeek.keys()).sort().slice(-8);
        weeklyHistory = sortedWeeks.map((weekStart) => {
          const [, mm, dd] = weekStart.split('-');
          return {
            semana: `${dd}/${mm}`,
            total: Math.round(lootByWeek.get(weekStart) || 0),
          };
        });
        weeklyTSHistory = sortedWeeks.map((weekStart) => {
          const [, mm, dd] = weekStart.split('-');
          return {
            semana: `${dd}/${mm}`,
            total: Math.round(tsByWeek.get(weekStart) || 0),
          };
        });
      } else {
        // Fallback se nÃ£o conseguiu baixar daily.json completo
        const todaySnap = snaps[7];
        baselineLoot = todaySnap ? (Number(todaySnap.alltimeloot) || Number(todaySnap.all_time_loots) || 0) : currentAll;
        baselineExp = todaySnap ? (parseTotalExp(todaySnap) ?? currentTotalExp) : currentTotalExp;
      }

      if (baselineLoot !== null) cardDailyLoot = capByWeekly(Math.max(0, currentAll - baselineLoot), weeklyLootsUser);
      if (baselineExp !== null) cardDailyTS = capByWeekly(Math.max(0, currentTotalExp - baselineExp), weeklyTSUser);
      if (weeklyHistory.length === 0) {
        weeklyHistory = [{ semana: "Atual", total: weeklyLootsUser }];
      }
      if (weeklyTSHistory.length === 0) {
        weeklyTSHistory = [{ semana: "Atual", total: Number(data.weekly_ts || 0) }];
      }

      setStats({
        ...data,
        currentAll: currentAll,
        dailyLoot: cardDailyLoot,
        daily_ts_calc: cardDailyTS,
        weeklyToDate: weeklyLootsUser,
        clanAllTime: allTimeClanLoots,
        dailyHistory,
        dailyTSHistory,
        weeklyValues: [weeklyLootsUser],
        weeklyHistory,
        weeklyTSHistory
      });
    } catch (err) {
      console.error("Error fetching clan member data:", err);
      setStats(null);
    }
    setLoading(false);
  }, [username]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const id = setInterval(fetchData, REFRESH_MS);
    const onFocus = () => { fetchData(); };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchData]);

  return { stats, loading };
}
