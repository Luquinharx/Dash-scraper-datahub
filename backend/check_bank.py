import requests
from datetime import datetime

TIME_FORMATS = [
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%m/%d/%Y %I:%M %p",
    "%m/%d/%Y %I:%M:%S %p",
]


def parse_time_str(t_str: str) -> datetime | None:
    clean = t_str.strip()
    for fmt in TIME_FORMATS:
        try:
            return datetime.strptime(clean, fmt)
        except ValueError:
            continue
    return None


response = requests.get(
    "https://deadclanbb-1f05e-default-rtdb.firebaseio.com/clan_logs/runs.json",
    timeout=20,
)
response.raise_for_status()
data = response.json() or {}

max_date = None
max_time_str = "Nenhum dado"

for run in data.values():
    if not run or "bank" not in run:
        continue

    bank_data = run["bank"]
    if isinstance(bank_data, dict):
        iterator = bank_data.values()
    elif isinstance(bank_data, list):
        iterator = [item for item in bank_data if isinstance(item, dict)]
    else:
        continue

    for doc in iterator:
        fields = doc.get("fields", {})
        t_str = fields.get("time")
        if not t_str:
            continue

        dt = parse_time_str(str(t_str))
        if dt and (max_date is None or dt > max_date):
            max_date = dt
            max_time_str = str(t_str)

print("Ultima coleta de doacao no banco:", max_time_str)
