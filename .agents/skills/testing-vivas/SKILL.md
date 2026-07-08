---
name: testing-vivas
description: Test the VIVAS healthcare platform end-to-end. Use when verifying security fixes, role-based access, DICOM viewer, user management, patient data persistence, B2C landing page, Stripe checkout, PWA, and patient dashboard.
---

# Testing VIVAS Healthcare Platform

## Environment

- **Platform URL**: https://vivas.digital
- **Landing Page URL**: https://vivasaudeinteligente.com.br
- **Legacy URL**: https://vivas-saude.fly.dev (same app, redirects to vivas.digital)
- **Stack**: React 18 + Vite + Tailwind CSS (frontend), Node.js + Express + PostgreSQL (backend)
- **Deployment**: Fly.io with PostgreSQL addon
- **Custom Domains**: vivas.digital (GoDaddy DNS → Fly.io), vivasaudeinteligente.com.br (Hostinger DNS → Fly.io)

## Devin Secrets Needed

- `FLY_API_TOKEN` — Required for deploying to Fly.io (saved permanently at org scope)
- `STRIPE_SECRET_KEY` — Stripe payment processing (saved permanently)
- `STRIPE_PUBLISHABLE_KEY` — Stripe client-side key (saved permanently)
- `SMTP_PASS` — Gmail App Password for email notifications (saved permanently)

## Test Credentials

| Email | Password | Role | View |
|---|---|---|---|
| admin@vivas.com | admin123 | admin | Full sidebar (all 15+ menus) |
| bruno.hodos@gmail.com | medico123 | medico | Clinical sidebar + DICOM + alerts |
| brunocorreafotografo@gmail.com | paciente123 | paciente | PatientDashboard (NO sidebar, mobile-first) |
| mariana@vivas.com | enfermeiro123 | enfermeiro | Clinical sidebar, no admin |
| marketing@vivas.com | marketing123 | marketing_admin | Cupons e Promoções only |

## Architecture Notes

- **Patient vs Professional routing**: In `App.tsx`, if `user.role === 'paciente'`, the app renders `<PatientRoutes />` (no sidebar, mobile-first dashboard). All other roles get `<Layout>` wrapper with sidebar.
- **Institutional site**: The backend detects hostname — requests to `vivasaudeinteligente.com.br` serve the static institutional landing page from `/institutional/index.html`. Requests to `vivas.digital` serve the React SPA.
- **Stripe integration**: Plan buttons on the landing page call `/api/subscriptions/create-checkout` which creates a Stripe Checkout session and redirects. After payment, Stripe redirects to `/register?session_id=...&plan=...`.
- **Data isolation**: `professional_patient_relationships` table links professionals to patients. API routes filter data based on these relationships.

## Local Setup (if needed)

```bash
cd /home/ubuntu/repos/vivas
# Backend
cd backend && npm install && cp .env.example .env
# Edit .env: DATABASE_URL=postgresql://..., JWT_SECRET=<random hex>
npm run dev  # starts on port 3001

# Frontend (separate terminal)
cd frontend && npm install
npm run dev  # starts on port 5173, proxies API to 3001
```

## Key Test Scenarios

### 1. Landing Page (B2C)
- Navigate to https://vivasaudeinteligente.com.br
- Verify wine/burgundy gradient hero, NAVBAR items (Como funciona, A tecnologia, Planos, Para empresas, Entrar)
- Scroll to Plans section: 3 cards (Individual R$49,90, Família R$89,90 with "MAIS ESCOLHIDO", Empresa R$29,90)
- Verify comparison table (VivaS vs Cartões de desconto vs Planos de saúde)
- Verify "Entrar" link points to vivas.digital/login
- Verify no parenthesized developer instructions visible on page

### 2. Stripe Checkout
- Click "Começar agora" on Individual plan
- Button should show "Redirecionando..." then redirect to checkout.stripe.com
- Stripe page should show "Subscribe to VivaS Individual" with correct pricing
- Note: Stripe is in LIVE mode — do NOT complete actual payments during testing

### 3. Registration with Plan Context
- Navigate to https://vivas.digital/register?plan=familia
- Verify "Plano Família" badge with Users icon
- Verify wine theme, form fields (Nome completo, Email, Senha, Confirmar senha)
- Verify "Já tem conta? Entrar" link

### 4. Patient Dashboard (Mobile-First, No Sidebar)
- Login as brunocorreafotografo@gmail.com / paciente123
- Verify wine gradient header with greeting "Bom dia/Boa tarde/Boa noite, Bruno"
- Verify "Plano Família · em dia" badge
- Verify NO sidebar (completely different from doctor view)
- Verify health index ring (circular SVG with score)
- Verify "Como você está hoje?" triage section
- Verify "Fique em dia com seus exames" with camera + upload buttons
- Verify bottom nav: Início, Agenda, Vivi, Saúde, Perfil
- Verify "Meu plano" section shows VivaS Família, R$89,90

### 5. Doctor Dashboard (Traditional Sidebar)
- Login as bruno.hodos@gmail.com / medico123
- Verify full sidebar with clinical menus (Pacientes, Agendamentos, DICOM, Teleconsulta, etc.)
- Verify IA section (Triagem Inteligente, Assistente IA, Suporte Preventivo)
- Verify KPI cards (Consultas, Última Consulta, Atendimentos Hoje, Alertas)
- Verify alerts show only the doctor's own patients (data isolation)

### 6. PWA Manifest
```bash
curl -s https://vivas.digital/manifest.json | jq .
# Expected: name "VivaS - Saúde Preventiva", theme_color "#7B1E3C", display "standalone"
```

### 7. Security — Unauthenticated API Access
```bash
curl -s https://vivas.digital/api/patients | jq .
# Expected: {"error":"Token não fornecido"} — HTTP 401
```

### 8. Email Notifications
- Doctor dashboard shows "Alertas de Saúde Recentes" with patient alerts
- Alerts are triggered when health indicators exceed limits (Glicemia > 126, LDL > 160, PA > 140, etc.)
- Emails sent via Gmail SMTP (sandrolaudares@gmail.com as sender)

### 9. DICOM Viewer (Medical Roles Only)
- Login as medico
- Navigate to "Isis DICOM Viewer" in sidebar
- Verify demo studies load and viewer renders with tool toolbar

### 10. Data Isolation
- Doctor should only see their own patients in patient list and prediction pages
- Patient should only see their own data
- Admin sees all data

## Testing Tips

- **Logout between tests**: Use browser console `localStorage.clear(); window.location.href='/login'` to clear session and return to login
- **Two different UIs**: Patient sees PatientDashboard (mobile-first, no sidebar). All other roles see traditional Layout with sidebar. This is the key architectural distinction.
- **Stripe is LIVE**: Do not complete actual payments. Just verify the redirect reaches checkout.stripe.com with correct product info.
- **Wine color palette**: Primary #7B1E3C, Deep #5E1730, Soft #F6E9ED, Line #EFD9E0. Look for these in gradients, buttons, and borders.
- **PWA install**: Chrome should show an "Install" button in the address bar on pages served from vivas.digital (confirms manifest + service worker are working).
- The app has no CI configured — testing is manual/E2E only
- Dashboard chart x-axis should show Portuguese day abbreviations (Dom, Seg, Ter, etc.)
- When testing role escalation: self-registration via /register always forces role to "paciente". Only admin can create users with other roles via the Usuários page
- Login page shows demo credentials at the bottom — useful for quick reference
- Toast notifications appear at bottom-right and auto-dismiss quickly — screenshot fast

## Common Issues

- If the app shows a blank page, the backend might need a redeploy. Check `fly logs -a vivas-saude`
- JWT_SECRET must be set as a Fly.io secret. Without it, the backend crashes on startup
- The DICOM viewer uses synthetic/demo data — the canvas renders colored rectangles representing medical images
- Database migrations run automatically on startup via `migrate.js`
- Doctor dashboard alert "Valor:" and "(limite:)" fields may appear empty — this could be a display format issue with how alert data is structured
- Cloudflare on Hostinger blocks automated browsers — cannot use Hostinger Website Builder via Devin. Use custom code deployments instead.
