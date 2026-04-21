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
  const [weekLabels] = useState<string[]>(["Current Week"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestDate, setLatestDate] = useState('');
  const [latestCollectedAt, setLatestCollectedAt] = useState('');
  const [updatedCount, setUpdatedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      // Setup adjusted time (minus 8 hours for 08:00 AM reset)
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Sao_Paulo",
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      });
      const parts = formatter.formatToParts(now);
      const p: Record<string, string> = {};
      parts.forEach(({ type, value }) => { p[type] = value; });

      const spYear = parseInt(p.year);
      const spMonth = parseInt(p.month);
      const spDay = parseInt(p.day);
      const spHour = parseInt(p.hour);

      // Cria a data local de SP
      const spDate = new Date(spYear, spMonth - 1, spDay, spHour, parseInt(p.minute), parseInt(p.second));
      
      // Subtrai 8 horas (reset às 8:00)
      const adjustedDate = new Date(spDate.getTime() - 8 * 60 * 60 * 1000);
      
      const yyyy = adjustedDate.getFullYear();
      const mm = String(adjustedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(adjustedDate.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;


      // A base diaria (8 AM) e capturada pela snapshot do final do "dia anterior"
      const yesterday = new Date(adjustedDate.getTime() - 24 * 60 * 60 * 1000); 
      const yY = yesterday.getFullYear();
      const yM = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yD = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yY}-${yM}-${yD}`;

      // Fetches paralelos
      const [profRes, dailyRes] = await Promise.all([
        fetch(`${FIREBASE_URL}/profiles.json`).catch(() => null),
        fetch(`${FIREBASE_URL}/daily.json?orderBy=%22$key%22&endAt=${encodeURIComponent(`"${yesterdayStr}"`)}&limitToLast=7`).catch(() => null)
      ]);
      const profiles = profRes && profRes.ok ? await profRes.json() : {};
      const dailyData = dailyRes && dailyRes.ok ? await dailyRes.json() : {};
      // const weekly = weeklyRes && weeklyRes.ok ? await weeklyRes.json() : {};

      if (!profiles || profiles.error) {
        setData([]);
        setLoading(false);
        return;
      }

      const dailyDates = Object.keys(dailyData).sort().filter(d => d <= yesterdayStr); // Sort chronological and only yesterday and before

      const users = Object.keys(profiles);
      const out: MemberData[] = [];
      let globalCollectedAt = '';
      
      users.forEach(u => {
        const val = profiles[u];
        if (!val) return;

        if (val.collected_at && val.collected_at > globalCollectedAt) {
          globalCollectedAt = val.collected_at;
        }

        const currentAll = val.all_time_loots || 0;
        const clanAllTime = val.all_time_clan_loots || 0;
        const currentTS = Number(val.alltimets || val.all_time_ts || 0);

        const dbUserKey = encodeURIComponent(val.username || "").replace(/\./g, '%2E');

        // 2. Buscamos a "Foto de Base" (Baseline)
        let baselineLoot: number | null = null;
        let baselineExp: number | null = null;

        // Olha todo o '/daily.json' de ontem pra trás procurando a última contagem boa:
        for (let i = dailyDates.length - 1; i >= 0; i--) {
            const snap = dailyData[dailyDates[i]]?.[dbUserKey] || dailyData[dailyDates[i]]?.[u];
            if (snap) {
                if (baselineLoot === null) {
                    // Sucesso! Pegou o status salvo de loot do passado
                    baselineLoot = snap.alltimeloot !== undefined ? Number(snap.alltimeloot) : (snap.all_time_loots !== undefined ? Number(snap.all_time_loots) : null);
                }
                if (baselineExp === null) {
                    const snapExp = snap.alltimets !== undefined ? Number(snap.alltimets) : (snap.all_time_ts !== undefined ? Number(snap.all_time_ts) : null);
                    if (snapExp !== null) {
                        baselineExp = snapExp;
                    }
                }
                // Se achou os dois numerinhos antigos, para de procurar p/ poupar memoria
                if (baselineLoot !== null && baselineExp !== null) {
                    break;
                }
            }
        }

        // 3. A Matemática (Total Atual - Total do Passado)

        // ----- CALCULO DO LOOT DIÁRIO -----
        let dailyLoot = 0;
        if (baselineLoot !== null) {
            dailyLoot = Math.max(0, currentAll - baselineLoot);
        } else {
            dailyLoot = 0;
        }

        // ----- CALCULO DO TS DIÁRIO -----
        let dailyTS = 0;
        if (baselineExp !== null) {
            dailyTS = Math.max(0, currentTS - baselineExp);
        } else {
            dailyTS = 0;
        }

        const weeklyLoot = Number(val.weekly_loots || 0);
        const clanWeeklyLoot = Number(val.clan_weekly_loots || 0);


        // Rank rule inside the app as per user instructions
        // We calculate internally. Rule: skip Gate Soldier, maybe use the same as Python without Gate Soldier?
        // Actually user said: "Campos de rank e streak devem ser calculados internamente."
        let months = 0;
        if (val.last_clan_join) {
           const joinDate = new Date(val.last_clan_join);
           months = Math.floor((new Date().getTime() - joinDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
        }
        if (isNaN(months)) months = 0;

        let rank = "Street Cleaner";
        const score = (months * 7000000) + ((clanAllTime / 1000) * 500000) + currentTS;
        if (score >= 40000000) rank = "Blade Master";
        else if (score >= 15000000) rank = "Guardian";
        else rank = "Street Cleaner"; // Skipped Gate Soldier (score >= 1000000) as requested!

        out.push({
          username: val.username || u,
          currentAll: currentAll,
          clanAllTime: clanAllTime,
          dailyLoot: dailyLoot,
          clanWeeklyLoot: clanWeeklyLoot,
          dailyTS: dailyTS,
          weeklyToDate: weeklyLoot,
          weeklyValues: [weeklyLoot],
          pct: '0%',
          pctNum: 0,
          streak: weeklyLoot > 0 ? 1 : 0, // Streak calculated simply for now
          streak_type: weeklyLoot > 0 ? 'positive' : 'negative',
          isUpdated: true,
          isActive: true,
          lastCollectedAt: val.collected_at || '',
          rank: rank
        });
      });

      setData(out);
      setLatestCollectedAt(globalCollectedAt);
      setLatestDate(todayStr);
      setUpdatedCount(users.length);
      setTotalCount(users.length);
      setDates([todayStr]);

      setLoading(false);
    } catch (err: any) {
      console.error("Fetch Data Error:", err);
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
