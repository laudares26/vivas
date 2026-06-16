# Test Plan: B2C Landing Page, Patient Dashboard, Stripe, PWA, Family Plans

## What Changed
- Institutional site rebuilt as B2C landing page with wine color palette and plan pricing
- Stripe checkout integration for subscription plans
- Patient dashboard redesigned (mobile-first, wine theme, no sidebar)
- Registration gated by plan selection
- Family member management (titular + dependents)
- PWA manifest + service worker
- Login page redesigned with wine theme

## Test Environment
- Landing page: https://vivasaudeinteligente.com.br
- Platform: https://vivas.digital
- Patient: brunocorreafotografo@gmail.com / paciente123
- Doctor: bruno.hodos@gmail.com / medico123

---

## Test 1: Landing Page renders with plan pricing and wine theme
**Steps:**
1. Navigate to https://vivasaudeinteligente.com.br
2. Scroll through the page

**Assertions:**
- Page loads with wine/burgundy gradient hero (not blue)
- NAVBAR has items: "Como funciona", "A tecnologia", "Planos", "Para empresas", "Entrar"
- Plans section shows 3 cards: Individual (R$49,90/mês), Família (R$89,90/mês), Empresa (R$29,90/vida)
- Família card has "Mais escolhido" badge
- "Entrar" link points to vivas.digital/login
- No parenthesized developer instructions visible on page

## Test 2: Plan button triggers Stripe checkout or registration redirect
**Steps:**
1. On the landing page, click "Começar agora" button on Individual plan card
2. Observe the redirect behavior

**Assertions:**
- Button text changes to "Redirecionando..."
- Browser redirects to either Stripe Checkout (checkout.stripe.com) or /register?plan=individual
- If Stripe redirect: checkout page shows "VivaS Individual" product at R$49,90/mês
- If fallback: Register page shows "Plano Individual" badge

## Test 3: Register page shows plan context from URL
**Steps:**
1. Navigate directly to https://vivas.digital/register?plan=familia

**Assertions:**
- Page renders with wine theme (not blue)
- Shows "Plano Família" badge with Users icon
- Form has fields: Nome completo, Email, Senha, Confirmar senha
- "Já tem conta? Entrar" link present

## Test 4: Patient login shows new PatientDashboard (NOT old sidebar layout)
**Steps:**
1. Navigate to https://vivas.digital/login
2. Login as brunocorreafotografo@gmail.com / paciente123

**Assertions:**
- Login page has wine gradient background (not blue)
- After login, patient sees PatientDashboard: gradient wine header with greeting "Bom dia/Boa tarde/Boa noite, Bruno"
- NO sidebar visible (unlike doctor/admin view)
- Health index ring (circular SVG) visible with score number
- "Como você está hoje?" triage section visible
- "Fique em dia com seus exames" section with camera/upload buttons
- Bottom navigation bar with 5 items: Início, Agenda, Vivi, Saúde, Perfil
- "Plano Família · em dia" badge visible in header

## Test 5: Doctor login still shows old Layout with sidebar
**Steps:**
1. Logout from patient, login as bruno.hodos@gmail.com / medico123

**Assertions:**
- After login, doctor sees traditional dashboard WITH sidebar
- Sidebar has clinical menus (Pacientes, Agendamentos, etc.)
- Dashboard shows KPI cards (not the patient mobile dashboard)

## Test 6: PWA manifest is served correctly
**Steps:**
1. Check https://vivas.digital/manifest.json via curl

**Assertions:**
- Returns valid JSON with name "VivaS - Saúde Preventiva"
- theme_color is "#7B1E3C" (wine)
- display is "standalone"
- Icons array has 192px and 512px entries
