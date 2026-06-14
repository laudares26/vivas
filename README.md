# VIVAS — Plataforma de Saúde

Plataforma completa de saúde pública com gestão clínica, prontuário eletrônico e inteligência artificial.

## Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite + Recharts
- **Backend:** Node.js + Express + PostgreSQL
- **Deploy:** Docker + Fly.io

## Módulos

### Área Clínica
- Dashboard — KPIs, gráficos por especialidade, próximas consultas
- Pacientes — CRUD com CNS/SUS, CPF, filtros, paginação
- Profissionais — Médicos, enfermeiros, fisioterapeutas (abas)
- Agendamentos — Calendário interativo + lista filtrada
- Atendimento Médico — Fila Manchester, sinais vitais, CID-10
- Prontuário Eletrônico — Timeline, medicamentos, alergias, vacinas
- Exames e Laudos — LOINC, status, análise IA
- Receitas/Prescrições — Preview visual + CRUD
- Teleconsulta — Videochamada com timer, controles, chat

### Inteligência Artificial
- Triagem Inteligente — Chat IA + Protocolo Manchester 5 cores
- Assistente Médico IA — Chat clínico, interações medicamentosas
- Predição de Riscos — Gauges cardiovascular/diabetes/hipertensão/renal

## Setup Local

```bash
# Backend
cd backend
cp .env.example .env  # Ajuste DATABASE_URL
npm install
npm run migrate
npm run seed
npm start

# Frontend
cd frontend
npm install
npm run dev
```

## Deploy (Fly.io)

```bash
fly launch
fly postgres create --name vivas-db
fly postgres attach vivas-db
fly deploy
fly ssh console -C "node src/config/migrate.js"
```

## Design System

- Paleta: Azul VIVAS `#0057B8` + Verde Saúde `#00A859`
- Sidebar com gradiente azul profissional recolhível
- Cards com sombras suaves e hover animados
- Modals com blur de fundo e animação de entrada
- Toast notifications para feedback
- Badges SUS: CNS, CID-10, CNES, SIGTAP, LOINC
