# DashDead

Dashboard analitica para Dead Frontier, alimentada por web scraping rodando em VPS Linux.

Este projeto existe porque nao ha API oficial direta para os dados usados na tomada de decisao do cla.  
Entao o fluxo e: coleta automatica -> Firebase Realtime Database -> dashboards web.

## Resumo rapido

- Frontend em `React + TypeScript + Vite + Tailwind`.
- Backend com 2 scrapers Python: `scraper_v2.py` (perfis/loot/TS no DFProfiler) e `scriptbank.py` (logs de doacao/bank via Selenium).
- Banco: `Firebase Realtime Database`.
- Uso principal: monitoramento analitico (loot, TS, doacoes, historicos, ranking, spins/cassino).

## Arquitetura

1. `scraper_v2.py` consulta clan + perfis no DFProfiler.
2. Ele salva em `/profiles`, `/daily/{data}` e `/weekly/{inicio_semana}`.
3. `scriptbank.py` abre o jogo (Fairview), entra no popup de logs do clan bank e salva em `/clan_logs/runs/{run_id}/bank/{row_id}`, `/clan_logs_meta/latest_run` e `/clan_logs_meta/runs/{run_id}`.
4. O frontend consome isso em tempo real para montar dashboards e relatorios.

## Funcionalidades principais (frontend)

- `/dashboard-loot`: ranking geral de loot (daily, weekly, all-time, clan weekly, streak).
- `/dashboard-ts`: ranking de TS/EXP (daily TS, weekly TS, clan weekly TS, all-time).
- `/dashboard`: visao detalhada por membro com graficos diarios/semanais.
- `/estatisticas`: consolidado de contribuicoes e loot do cla.
- `/cassino`: roletas (Blood Slot e Blood Wheel) com regras configuraveis.
- `/perfil`: perfil do usuario + historico de premios.
- `/admin`: gestao de usuarios, auditoria de doacoes, historico de spins e configuracoes do cassino.

## Estrutura do projeto

```text
DashDead/
|-- backend/
|   |-- scraper_v2.py
|   |-- scriptbank.py
|   |-- firefox_profile/          # sessao/cookies persistidos do Firefox (Selenium)
|   |-- clan_bank_state.json      # checkpoint incremental de logs do bank
|   `-- clan_logs_summary.json
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- hooks/
|   |   `-- lib/
|   |-- scripts/
|   |   `-- migrate_old_firestore_to_new_rtdb.mjs
|   |-- package.json
|   `-- vercel.json
|-- .env.example
`-- README.md
```

## Requisitos

- Node.js 20+ e npm
- Python 3.10+
- Firefox instalado na VPS
- Geckodriver disponivel no PATH (ou `GECKODRIVER_PATH`)
- Acesso ao Firebase Realtime Database

## Configuracao de ambiente

### 1) Backend

Copie:

```bash
cp .env.example .env
```

Variaveis mais importantes:

- `FIREBASE_BASE_URL`
- `DF_USER`
- `DF_PASS`
- `DF_BANK_LOG_URL`
- `BANK_HEADLESS`
- `BANK_INTERVAL_HOURS`
- `BANK_RUN_ONCE`
- `BANK_SELENIUM_TIMEOUT_SECONDS`
- `FIREFOX_BINARY` (opcional)
- `GECKODRIVER_PATH` (opcional)

Observacoes:

- `scriptbank.py` carrega `.env` automaticamente (raiz e `backend/.env`).
- `scraper_v2.py` hoje usa constantes no topo do arquivo (`CLAN_URL`, `FIREBASE_DB_URL` etc), nao variaveis de ambiente.

### 2) Frontend

O arquivo `frontend/.env.example` existe, mas o app atualmente usa config Firebase hardcoded em `frontend/src/lib/firebase.ts`.

Se quiser mudar projeto Firebase, ajuste esse arquivo.

## Rodando localmente

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App local: `http://localhost:5173`

### Backend (scrapers)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install requests beautifulsoup4 apscheduler pytz selenium
```

Rodar scraper de perfis:

```bash
python scraper_v2.py
```

Rodar scraper do bank:

```bash
python scriptbank.py
```

Teste de uma unica execucao do bank:

```bash
BANK_RUN_ONCE=true python scriptbank.py
```

## Frequencia de coleta

- `scraper_v2.py`: inicia uma coleta imediata e depois roda a cada 5 minutos.
- `scriptbank.py`: loop continuo com intervalo `BANK_INTERVAL_HOURS` (default no codigo: 6h).

## Rodando em VPS Linux (recomendado)

O comum e manter os 2 scrapers como servicos systemd separados.

Exemplo `dashdead-scraper-v2.service`:

```ini
[Unit]
Description=DashDead Scraper V2
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/DashDead/backend
ExecStart=/opt/DashDead/backend/.venv/bin/python /opt/DashDead/backend/scraper_v2.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Exemplo `dashdead-scriptbank.service`:

```ini
[Unit]
Description=DashDead ScriptBank
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/DashDead/backend
ExecStart=/opt/DashDead/backend/.venv/bin/python /opt/DashDead/backend/scriptbank.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Comandos:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dashdead-scraper-v2
sudo systemctl enable --now dashdead-scriptbank
sudo systemctl status dashdead-scraper-v2
sudo systemctl status dashdead-scriptbank
journalctl -u dashdead-scraper-v2 -f
journalctl -u dashdead-scriptbank -f
```

## Deploy do frontend

Projeto pronto para Vercel (SPA com rewrite para `index.html`).

Configuracao:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

## Estrutura de dados no Firebase (resumo)

- `profiles`: snapshot atual por membro.
- `daily/{YYYY-MM-DD}`: baseline diario por membro.
- `weekly/{YYYY-MM-DD}`: baseline semanal.
- `clan_logs/runs/{run_id}/bank`: eventos de doacao coletados no bank.
- `clan_logs_meta/latest_run`: metadados da ultima coleta do bank.
- `config/donation_exclusions`: exclusoes manuais de entradas.
- `config/donation_hidden_users`: ocultar usuarios na auditoria/doacoes.
- `config/casino` e `config/power_casino`: configuracoes das roletas.
- `usuarios`, `roletas`, `power_roletas`: autenticacao/perfis e historico de premios.

## Script de migracao (Firestore -> RTDB)

Arquivo: `frontend/scripts/migrate_old_firestore_to_new_rtdb.mjs`

O script:

1. Exporta colecoes do Firestore antigo para `frontend/scripts/migration_export.json`.
2. Se `MIGRATION_EMAIL` e `MIGRATION_PASSWORD` estiverem definidos no ambiente, tambem grava no RTDB novo.

Execucao:

```bash
cd frontend
npm run migrate:firestore-to-rtdb
```

## Notas operacionais importantes

- `scriptbank.py` pode pedir codigo 2FA se a sessao expirar.
- `backend/firefox_profile` guarda estado de login/cookies do Selenium.
- Nao comite credenciais reais em `.env`.
