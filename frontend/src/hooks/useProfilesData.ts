import { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../lib/firebase';

export interface MemberProfile {
  username: string;
  collected_at: string;
  
  // TS Records
  weekly_ts: number;
  clan_weekly_ts: number;
  exp_since_death: number;
  all_time_ts: number;
  daily_ts_calc?: number;
  total_exp: number;
  expected_loss_on_death: number;
  
  // TPK Records
  daily_tpk: number;
  weekly_tpk: number;
  clan_weekly_tpk: number;
  all_time_tpk: number;
  last_players_killed: string;
  last_hit_by: string;
  
  // Loot Records
  weekly_loots: number;
  all_time_loots: number;
  clan_weekly_loots: number;
  all_time_clan_loots: number;
  
  // Misc
  last_clan_join: string;
  
  // Rank
  rank: string;
  rank_score: number;
}

export function useProfilesData() {
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onValue(
      ref(rtdb, 'profiles'),
      (snapshot) => {
        if (cancelled) return;

        const data = (snapshot.val() || {}) as Record<string, Record<string, unknown>>;
        const toNumber = (value: unknown) => Number(value || 0);
        const toStringValue = (value: unknown) => (typeof value === 'string' ? value : '');

        const parsedProfiles: MemberProfile[] = Object.entries(data)
          .map(([rawKey, rawValue]) => {
            if (!rawValue || typeof rawValue !== 'object') return null;

            const item = rawValue as Record<string, unknown>;
            let username = toStringValue(item.username).trim();
            if (!username) {
              try {
                username = decodeURIComponent(rawKey);
              } catch {
                username = rawKey;
              }
            }

            if (!username) return null;

            return {
              username,
              collected_at: toStringValue(item.collected_at),
              weekly_ts: toNumber(item.weekly_ts),
              clan_weekly_ts: toNumber(item.clan_weekly_ts),
              exp_since_death: toNumber(item.exp_since_death),
              all_time_ts: toNumber(item.all_time_ts),
              daily_ts_calc: toNumber(item.daily_ts_calc),
              total_exp: toNumber(item.total_exp),
              expected_loss_on_death: toNumber(item.expected_loss_on_death),
              daily_tpk: toNumber(item.daily_tpk),
              weekly_tpk: toNumber(item.weekly_tpk),
              clan_weekly_tpk: toNumber(item.clan_weekly_tpk),
              all_time_tpk: toNumber(item.all_time_tpk),
              last_players_killed: toStringValue(item.last_players_killed),
              last_hit_by: toStringValue(item.last_hit_by),
              weekly_loots: toNumber(item.weekly_loots),
              all_time_loots: toNumber(item.all_time_loots),
              clan_weekly_loots: toNumber(item.clan_weekly_loots),
              all_time_clan_loots: toNumber(item.all_time_clan_loots),
              last_clan_join: toStringValue(item.last_clan_join),
              rank: toStringValue(item.rank),
              rank_score: toNumber(item.rank_score),
            } as MemberProfile;
          })
          .filter((item): item is MemberProfile => item !== null);

        setProfiles(parsedProfiles);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to listen profiles:', error);
        if (cancelled) return;
        setProfiles([]);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { profiles, loading };
}
