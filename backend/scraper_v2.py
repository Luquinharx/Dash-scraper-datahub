# -*- coding: utf-8 -*-
import logging
import re
from datetime import datetime, timedelta

import pytz
import requests
from apscheduler.schedulers.blocking import BlockingScheduler
from bs4 import BeautifulSoup

# Config
CLAN_URL = "https://www.dfprofiler.com/clan/view/2166"
BASE_URL = "https://www.dfprofiler.com"
FIREBASE_DB_URL = "https://deadclanbb-1f05e-default-rtdb.firebaseio.com/"
USER_AGENT = "Mozilla/5.0 (compatible; scraper/3.0)"
BRAZIL_TZ = pytz.timezone("America/Sao_Paulo")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def parse_int(text):
    if not text:
        return 0
    s = "".join(ch for ch in text if ch.isdigit() or ch == "-")
    return int(s) if s and s != "-" else 0


def parse_profile(profile_url):
    try:
        r = requests.get(profile_url, headers={"User-Agent": USER_AGENT}, timeout=15)
        r.raise_for_status()
    except Exception as e:
        logging.error(f"Erro ao acessar perfil: {profile_url} - {e}")
        return {}

    soup = BeautifulSoup(r.text, "html.parser")
    data = {}

    for div in soup.find_all("div", class_=["col-md-6", "col-sm-3"]):
        h4 = div.find("h4")
        if h4:
            content_div = div.find("div", class_="display") or div.find("div", class_="pdata")
            if content_div:
                key = h4.get_text(strip=True).lower().replace(" ", "_").replace("?", "")
                val_text = content_div.get_text(strip=True)
                data[key] = val_text

    if not data:
        for div in soup.find_all("div", class_="col-md-6"):
            text_parts = list(div.stripped_strings)
            if len(text_parts) >= 2:
                key = text_parts[0].lower().replace(" ", "_").replace("?", "")
                val = "".join(text_parts[1:])
                data[key] = val

    return data


def scrape_and_push():
    logging.info("Iniciando scrape...")
    try:
        resp = requests.get(CLAN_URL, headers={"User-Agent": USER_AGENT}, timeout=20)
        resp.raise_for_status()
    except Exception:
        logging.exception("Erro ao buscar a pagina do cla")
        return

    soup = BeautifulSoup(resp.text, "html.parser")
    table = None
    for t in soup.find_all("table"):
        if t.find("a", href=re.compile(r"/profile/view/")):
            table = t
            break

    if not table:
        logging.error("Tabela nao encontrada")
        return

    members = []
    for a in table.find_all("a", href=re.compile(r"/profile/view/")):
        name = a.get_text(strip=True)
        if name:
            members.append({"username": name, "url": BASE_URL + a["href"]})

    now_iso = datetime.now(tz=BRAZIL_TZ).isoformat()
    profiles_data = {}

    for m in members:
        pdata = parse_profile(m["url"])
        safe_username_key = requests.utils.requote_uri(m["username"]).replace(".", "%2E")

        raw_weekly_ts = parse_int(pdata.get("weekly_ts", "0"))
        raw_clan_weekly_ts = parse_int(pdata.get("clan_weekly_ts", "0"))

        raw_weekly_loots = parse_int(pdata.get("weekly_loots", "0"))
        raw_clan_weekly_loots = parse_int(pdata.get("clan_weekly_loots", "0"))

        user_data = {
            "username": m["username"],
            "collected_at": now_iso,
            "weekly_ts": raw_weekly_ts,
            "clan_weekly_ts": raw_clan_weekly_ts,
            "all_time_ts": parse_int(pdata.get("all_time_ts", "0")),
            "total_exp": parse_int(pdata.get("total_exp", "0")),
            "weekly_loots": raw_weekly_loots,
            "all_time_loots": parse_int(pdata.get("all_time_loots", "0")),
            "clan_weekly_loots": raw_clan_weekly_loots,
            "all_time_clan_loots": parse_int(pdata.get("all_time_clan_loots", "0")),
            "last_clan_join": pdata.get("last_clan_join", ""),
        }

        profiles_data[safe_username_key] = user_data

    requests.put(FIREBASE_DB_URL.rstrip("/") + "/profiles.json", json=profiles_data, timeout=20)

    adjusted_time = datetime.now(tz=BRAZIL_TZ) - timedelta(hours=8)
    today_str = adjusted_time.strftime("%Y-%m-%d")

    daily_url = FIREBASE_DB_URL.rstrip("/") + f"/daily/{today_str}.json"
    try:
        resp = requests.get(daily_url, timeout=10)
        resp.raise_for_status()
        daily_json = resp.json()

        if not isinstance(daily_json, dict) or not daily_json:
            logging.info(f"Criando snapshot diario para {today_str}")
            put_resp = requests.put(daily_url, json=profiles_data, timeout=20)
            put_resp.raise_for_status()
        else:
            # Keep first run as baseline for the day.
            # Only patch missing users and missing TS fields for legacy records.
            patch_updates = {}

            for user_key, profile_payload in profiles_data.items():
                current_snapshot = daily_json.get(user_key)
                if not isinstance(current_snapshot, dict):
                    patch_updates[user_key] = profile_payload
                    continue

                has_total_exp = current_snapshot.get("total_exp") is not None
                has_all_time_ts = (
                    current_snapshot.get("all_time_ts") is not None
                    or current_snapshot.get("alltimets") is not None
                )

                if not has_total_exp:
                    patch_updates[f"{user_key}/total_exp"] = profile_payload.get("total_exp", 0)
                if not has_all_time_ts:
                    patch_updates[f"{user_key}/all_time_ts"] = profile_payload.get("all_time_ts", 0)
                if current_snapshot.get("username") is None:
                    patch_updates[f"{user_key}/username"] = profile_payload.get("username", "")

            if patch_updates:
                logging.info(
                    f"Atualizando snapshot diario {today_str} com {len(patch_updates)} ajuste(s)"
                )
                patch_resp = requests.patch(daily_url, json=patch_updates, timeout=20)
                patch_resp.raise_for_status()
    except Exception as e:
        logging.error(f"Erro no daily snapshot: {e}")

    start_of_week = adjusted_time - timedelta(days=adjusted_time.weekday())
    week_str = start_of_week.strftime("%Y-%m-%d")

    weekly_url = FIREBASE_DB_URL.rstrip("/") + f"/weekly/{week_str}.json"
    try:
        resp = requests.get(weekly_url, timeout=10)
        resp.raise_for_status()
        weekly_json = resp.json()
        if not weekly_json:
            logging.info(f"Criando snapshot semanal para {week_str}")
            put_weekly = requests.put(weekly_url, json=profiles_data, timeout=20)
            put_weekly.raise_for_status()
    except Exception as e:
        logging.error(f"Erro no weekly snapshot: {e}")

    logging.info("Scrape concluido.")


if __name__ == "__main__":
    scrape_and_push()
    scheduler = BlockingScheduler()
    scheduler.add_job(scrape_and_push, "interval", minutes=5)
    scheduler.start()
