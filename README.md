# Clan Loot Dashboard

Dashboard profissional para monitoramento de loot do clã, com coleta automática de dados e visualização em tempo real.

## Estrutura do Projeto

```
├── frontend/          # Dashboard React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.tsx    # Componente principal da dashboard
│   │   ├── hooks/
│   │   │   └── useClanData.ts   # Hook de dados (fetch Firebase + cálculos)
│   │   ├── lib/
│   │   │   └── utils.ts         # Utilitários (cn helper)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
```
├── frontend/          # Dashboard React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.tsx    # Componente principal da dashboard
│   │   ├── hooks/
│   │   │   └── useClanData.ts   # Hook de dados (fetch Firebase + cálculos)
│   │   ├── lib/
│   │   │   └── utils.ts         # Utilitários (cn helper)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── scraper_ready.py   # Script de coleta (scraper + agendamento horário)
├── requirements.txt   # Dependências Python
└── .gitignore
```

## Tecnologias

| Camada     | Stack                                    |
|------------|------------------------------------------|
| Frontend   | React 19, TypeScript, Vite, Tailwind CSS |
| Scraper    | Python, BeautifulSoup, APScheduler       |
| Banco      | Firebase Realtime Database               |

## Setup

### 1. Frontend (Dashboard)

```bash
cd frontend
npm install
npm run dev
```

Acesse em: `http://localhost:5173`

Para build de produção:

```bash
cd frontend
npm run build
```

Os arquivos estáticos ficam em `frontend/dist/` — prontos para deploy no **Vercel**.

### 2. Scraper (Coleta de Dados)

```bash
pip install -r requirements.txt
python scraper_ready.py
```

O scraper roda **a cada hora** (minuto 02) e salva os dados no Firebase:

- `/daily/{YYYY-MM-DD}/hourly/{HH-MM}/{username}` — snapshot por hora
- `/daily/{YYYY-MM-DD}/{username}` — fechamento mais recente do dia

## Colunas da Dashboard

| Coluna      | Cálculo                                                        |
|-------------|----------------------------------------------------------------|
| All-time    | Valor `alltimeloot` do snapshot mais recente                   |
| Daily Loot  | `all_time(hoje) - all_time(ontem)`                             |
| Nª Semana   | `fechamento_semana(N) - fechamento_semana(N-1)`                |
| Var %       | `(semana_atual - semana_anterior) / |semana_anterior| × 100`   |
| Streak      | Semanas consecutivas com loot (positivo) ou sem loot (negativo)|

## Deploy no Vercel

1. Conecte o repositório ao Vercel
2. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Deploy automático a cada push

## Variáveis de Ambiente

| Variável         | Descrição                        | Padrão                                                      |
|------------------|----------------------------------|-------------------------------------------------------------|
| `FIREBASE_DB_URL`| URL do Firebase Realtime Database| `https://deadclanbb-1f05e-default-rtdb.firebaseio.com/`         |

## Migração Firestore -> Realtime DB

No frontend, existe um script para migrar `usuarios` e `config` do projeto antigo (`deadbb-2d5a8`) para o RTDB novo (`deadclanbb-1f05e`):

```bash
cd frontend
npm run migrate:firestore-to-rtdb
```

Sem credenciais, ele roda em modo export-only e gera:

`frontend/scripts/migration_export.json`

Para gravar no RTDB novo, execute com um usuário autenticável no projeto novo:

```bash
cd frontend
$env:MIGRATION_EMAIL="seu-admin@email.com"
$env:MIGRATION_PASSWORD="sua_senha"
npm run migrate:firestore-to-rtdb
```
