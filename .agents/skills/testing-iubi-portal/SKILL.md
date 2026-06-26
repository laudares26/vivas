---
name: testing-iubi-portal
description: Test the IUBI Geosistema portal end-to-end via browser UI. Use when verifying portal sections, API playground, architecture styling, or navigation after code changes.
---

# Testing IUBI Geosistema Portal

## Prerequisites

- Node.js 18+ installed
- The `iubi-portal/` directory exists in the repo with `package.json`

## Setup

1. Install dependencies and start dev server:
   ```bash
   cd /home/ubuntu/repos/vivas/iubi-portal
   npm install
   npm run dev
   ```
2. Dev server runs at `http://localhost:5174` (Vite may pick a different port if 5174 is busy — check output).
3. Maximize the browser window before recording:
   ```bash
   sudo apt-get install -y wmctrl 2>/dev/null
   wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz
   ```

## Backend APIs

The portal connects to live backend services at `http://100.52.200.210:32200/`:
- Map Render: `/map-render/swagger-ui/index.html`
- Catalog: `/catalog/swagger-ui/index.html`
- Context: `/context/swagger-ui/index.html`
- OGC: `/ogc/swagger-ui/index.html`

The Vite dev server proxies `/api/*` requests to `http://100.52.200.210:32200`. If the backend is down, playground API tests will fail with network errors — this is expected.

## Test Cases

### Test 1: All sections render
Navigate to the portal root. Scroll through all 8 sections:
- Navbar (IUBI + Geosistema branding)
- Hero (stats: "4 APIs REST", "5 Tipos de App", "22+ Componentes")
- Solutions (5 cards: WEBMAP, DASHBOARD, FORM, REPORT, STORY_MAP)
- Services (4 tabs: Map Render, Catalog, Context, OGC)
- Examples ("Exemplos Didaticos" with code cards)
- Playground (7 example buttons)
- Components (grouped cards with Storybook link)
- Architecture (3 layers: Frontend, Backend, Data)
- Footer ("Pronto para construir?" CTA)

### Test 2: Services tab switching
Click each service tab and verify the heading, endpoints, and Swagger link update.

### Test 3: Playground interaction
- Select different examples and verify code/request tabs update
- Switch between GET and POST examples to verify method and body textarea change
- Click "Executar" to trigger a live API request — verify response tab shows real JSON data or a meaningful error

### Test 4: Architecture styling (Tailwind fix)
This is critical after any Tailwind config changes. The 4 frontend layer cards must show:
- `ge21-frontend`: blue dashed border + light blue bg
- `ge21-mfe-ui`: purple dashed border + light purple bg
- `ge21-mfe-utils`: teal dashed border + light teal bg
- `3rd-party-configs`: gray dashed border + light gray bg

If cards appear unstyled (white bg, no colored border), the Tailwind JIT purging bug might have regressed. Check `Architecture.tsx` — classes must be literal strings in `frontendColorMap`, NOT dynamically interpolated like `` `border-${color}-200` ``.

### Test 5: Navigation
Click nav links (e.g., "Playground") and verify the page scrolls to the correct section with the expected heading visible.

## Tips

- Use `annotate_recording` with structured types (`setup`, `test_start`, `assertion`) for clear video evidence.
- For the Playground test, "Listar Conexoes" (GET `/api/catalog/v1/connections`) is the most reliable example since it requires no parameters.
- Navigate to the Architecture section by scrolling or using `#architecture` in the URL — it might be far down the page.
- Use the browser's zoom feature (`computer` tool with `zoom` action) to verify Architecture card colors if they appear small.
- The portal is a single-page app with hash-based navigation (`/#solutions`, `/#playground`, etc.).

## Storybook

Component documentation is at `http://100.52.200.210:32060/`. This might not always be accessible — it depends on the backend infrastructure being up.

## Devin Secrets Needed

None required for testing the portal locally. AWS credentials are needed only for deployment (separate from testing).
