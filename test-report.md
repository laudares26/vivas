# Test Report: B2C Landing Page, Patient Dashboard, Stripe, PWA

**Tested by:** Devin  
**Date:** 2026-06-14  
**Environment:** Production (https://vivas.digital + https://vivasaudeinteligente.com.br)  
**PR:** https://github.com/laudares26/vivas/pull/7  
**Session:** https://app.devin.ai/sessions/aeb77f57f7dd4c7c82347b437540117f

## Summary

Ran all 6 tests end-to-end on the production deployment. All tests passed. Tested landing page, Stripe checkout, registration flow, patient dashboard, doctor dashboard, and PWA manifest.

---

## Test Results

### Test 1: Landing page renders with wine theme and plan pricing — PASSED

- Wine/burgundy gradient hero section loaded correctly
- NAVBAR items present: "Como funciona", "A tecnologia", "Planos", "Para empresas", "Entrar", "Comece a se cuidar"
- 3 plan cards visible:
  - Individual: R$49,90/mês (strikethrough R$79,90)
  - Família: R$89,90/mês (strikethrough R$149,90) with "MAIS ESCOLHIDO" badge
  - Empresa: R$29,90/vida
- "Entrar" link points to vivas.digital/login
- No parenthesized developer instructions visible
- Comparison table (VivaS vs Cartões de desconto vs Planos de saúde) rendered correctly

![Landing page hero](screenshots/screenshot_55f7b32553464acdb482767966d1ee52.png)
![Plan cards](screenshots/screenshot_cf5f535b13c74abc934447ae4605731f.png)

### Test 2: Plan button triggers Stripe checkout — PASSED

- Clicked "Começar agora" on Individual plan
- Button text changed to "Redirecionando..." (loading state)
- Browser redirected to checkout.stripe.com
- Stripe Checkout page showed "Subscribe to VivaS Individual" at $10.25/month (USD equivalent)
- Real payment form with card fields, "Powered by Stripe" footer
- BRL/USD toggle available showing exchange rate

![Redirecting state](screenshots/screenshot_13344da998ef475abee98a2cd849d892.png)
![Stripe Checkout](screenshots/screenshot_6d07f46adfce45ff9dcb66b6312c2b4e.png)

### Test 3: Register page shows plan context from URL — PASSED

- Navigated to https://vivas.digital/register?plan=familia
- Page rendered with wine theme (background pattern)
- "Plano Família" badge with Users icon displayed below title
- Form fields present: Nome completo, Email, Senha, Confirmar senha
- "Já tem conta? Entrar" link present
- Chrome "Install" button visible in address bar (PWA working)

![Register page with Família plan](screenshots/screenshot_667be757c05946349ff18dc6e8c9b500.png)

### Test 4: Patient login shows new PatientDashboard (NO sidebar) — PASSED

- Logged in as brunocorreafotografo@gmail.com / paciente123
- Login page has wine gradient background
- After login, PatientDashboard loaded with:
  - Wine gradient header with "Bom dia, Bruno" greeting
  - "Plano Família · em dia" badge
  - NO sidebar (completely different from doctor view)
  - Health index ring: 82/100 "Saúde em dia" (+4 nos últimos 30 dias)
  - "Como você está hoje?" triage section with "Iniciar triagem" button
  - "Precisa da sua atenção" with 3 items (Teleconsulta, Hemograma IA pronta, Check-up preventivo)
  - "Fique em dia com seus exames" with Tirar Foto + Upload buttons
  - "Acesso rápido" grid (6 items: Agendar consulta, Teleconsulta, Meus exames, Saúde mental, Meu plano, Farmácia)
  - "Sua linha do tempo" with 3 entries
  - "Meu plano" section (VivaS Família, R$89,90, Teleconsultas Ilimitadas)
  - Bottom navigation: Início, Agenda, Vivi, Saúde, Perfil

![Patient Dashboard - top](screenshots/screenshot_b005c047b9304a6a814b00ff229a75ee.png)
![Patient Dashboard - bottom](screenshots/screenshot_bfcbcbf734bc4f2291932fe731aab661.png)

### Test 5: Doctor login shows old Layout with sidebar — PASSED

- Logged in as bruno.hodos@gmail.com / medico123
- Doctor dashboard loaded with full sidebar:
  - Principal: Dashboard
  - Clínico: Pacientes, Profissionais, Agendamentos, Atendimento Médico, Prontuário Eletrônico, Exames e Laudos, Isis DICOM Viewer, Receitas e Prescrições, Teleconsulta
  - IA - Suporte e Apoio: Triagem Inteligente, Assistente IA (Apoio), Suporte Preventivo
- KPI cards: 1 Consulta Realizada, 17 de jun Última Consulta, 6 Atendimentos Hoje, 2 Alertas de Saúde
- Alertas de Saúde Recentes: Bruno Correa (Alto), Maria Silva Santos (Alto)
- "Fique em dia com seus exames" section
- Atendimentos chart (últimos 7 dias)
- Próximas Consultas table

![Doctor Dashboard with sidebar](screenshots/screenshot_6ed3619c5aa34ffbadf07fcb66a3ac4a.png)

### Test 6: PWA manifest served correctly — PASSED (verified via curl)

- https://vivas.digital/manifest.json returns valid JSON
- name: "VivaS - Saúde Preventiva"
- theme_color: "#7B1E3C" (wine)
- display: "standalone"
- Icons: 192px and 512px entries present
- Chrome "Install" button visible on register page (confirms PWA detection)

---

## Observations

1. **Stripe is in live mode** — the checkout uses real payment processing (not test mode). The Individual plan shows $10.25/month USD equivalent of R$49,90.
2. **Plan-gated registration** — login page shows "Não tem conta? Assine um plano" linking to the institutional site, preventing direct registration without a plan.
3. **Data isolation** — doctor dashboard only shows alerts for their own patients (Bruno Correa, Maria Silva Santos).
4. **Alert values empty** — In the doctor dashboard alerts, the "Valor:" and "(limite:)" fields appear empty. This may be a display issue with the alert data format.
5. **Wine theme consistency** — both landing page and platform use wine/burgundy (#7B1E3C) consistently.
