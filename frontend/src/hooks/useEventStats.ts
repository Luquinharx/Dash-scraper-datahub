import { useState, useEffect } from 'react';
import { useClanData } from './useClanData';

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
  const [bankData, setBankData] = useState<any>(null);

  useEffect(() => {
    fetch("https://deadclanbb-1f05e-default-rtdb.firebaseio.com/clan_logs/runs.json")
      .then(res => res.json())
      .then(setBankData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      if (scraperLoading || !bankData) return;
      setLoading(true);
      try {
        const donatedCashMap: Record<string, number> = {};
        const donatedCreditsMap: Record<string, number> = {};
        const allLogs: any[] = [];
        let maxTimestamp = 0;
        let latestDate = "Indisponível";

        if (bankData) {
          Object.values(bankData).forEach((run: any) => {
            if (run && run.bank) {
              const entries = Array.isArray(run.bank) ? run.bank : Object.values(run.bank);
              entries.forEach((v: any) => {
                if (v && v.fields) {
                  allLogs.push(v.fields);
                  if (v.ingested_at) {
                    const dt = new Date(v.ingested_at).getTime();
                    if (dt > maxTimestamp) {
                      maxTimestamp = dt;
                      latestDate = v.fields.time || new Date(v.ingested_at).toLocaleString('pt-BR');
                    }
                  }
                }
              });
            }
          });
        }
        setLastUpdatedUrl(latestDate);

        const isDateInEventRange = (timeStr: string) => {
          if (!timeStr) return false;
          // timeStr is usually like "4/12/2026 01:55 AM" -> M/D/YYYY
          const parts = timeStr.split(' ');
          if (parts.length === 0) return false;
          const dateParts = parts[0].split('/');
          if (dateParts.length < 3) return false;
          
          let mStr = dateParts[0];
          let dStr = dateParts[1];
          let yStr = dateParts[2];
          
          // O formato que vem no scraper do dfprofiler: Mes/Dia/Ano
          let m = parseInt(mStr, 10);
          let d = parseInt(dStr, 10);
          let y = parseInt(yStr, 10);
          
          // Para o evento de abril: de 9 a 12 de abril de 2026
          if (y === 2026 && m === 4 && d >= 9 && d <= 12) {
            return true;
          }
          return false;
        };

        allLogs.forEach(fields => {
          if (fields.action === 'give' && fields.username && isDateInEventRange(fields.time)) {
            const curr = (fields.currency || '').toLowerCase();
            let amountStr = curr.replace(/[^0-9]/g, '');
            const amount = Number(amountStr) || 0;
            if (curr.includes('credit')) {
              donatedCreditsMap[fields.username] = (donatedCreditsMap[fields.username] || 0) + amount;
            } else {
              donatedCashMap[fields.username] = (donatedCashMap[fields.username] || 0) + amount;
            }
          }
        });

        // Map and include only those who donated something OR members just to show who didn't
        // But since it's an event ladder, let's keep all members but only showing non-zero totals
        const mergedStats: EventMemberStat[] = scraperData.map(scUser => ({
          username: scUser.username,
          rank: scUser.rank || 'Street Cleaner',
          donatedCash: donatedCashMap[scUser.username] || 0,
          donatedCredits: donatedCreditsMap[scUser.username] || 0,
        }));

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
