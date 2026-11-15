# ASTRA — astronaut health telemetry frontend

A dark, dense mission-control interface for long-duration crew health: live
biometrics, an interactive body explorer, guided self-assessments and the five
canonical spaceflight hazards. Built as a static Next.js app so it runs with no
backend, then swaps to the FastAPI service in the repository root through the
data layer.

> **Not a medical device.** Everything here is a demonstration: the crew,
> mission, exposure figures and self-assessment results are fictional, and the
> guidance shown is educational rather than diagnostic. Thresholds are the
> reference ranges configured in `health.db`; they are not NASA operational
> limits. Nothing in this UI diagnoses a condition or replaces a flight surgeon.

## Screens

| Route            | Screen                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `/`              | Overview — mission status, crew readiness and a short index of the five sections                              |
| `/biometrics`    | Vitals cards, trend chart with range filters, alerts, recent measurements, daily sleep/exercise, radiation   |
| `/digital-human` | Body schematic with seven hotspots and per-system panels, metrics and linked assessments                     |
| `/assessment`    | Assessment library, due/recent status, multi-step form (React Hook Form + Zod), review, result, escalation   |
| `/hazards`       | Hazard detail with adaptive charts (radiation, daily, trend or fallback) and cadence-filtered countermeasures |

Shared shell: fixed sidebar with mission clock, compact top bar with the active
crew selector, and a mobile drawer. The active crew member is persisted in
`localStorage` (`astra:active-crew`); submitted assessments are persisted under
`astra:assessment-results:v1`.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS 4 with tokens in `app/globals.css`
- Recharts for trends, Motion for transitions, Lucide for icons
- React Hook Form + Zod for assessment validation

## Getting started

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

Production checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

All five routes are statically prerendered. There are no server-side fetches,
cookies or `searchParams` reads, so the app builds without the backend running.

## Demonstration data

`lib/data/*.json` is a compact snapshot exported from the repository's
`health.db`:

- `readings.json` — vital-sign history, downsampled to the last reading of each
  hour
- `daily.json` — sleep, exercise and radiation totals per day
- `alerts.json` — flagged readings with their assigned level
- `reference.json` — metrics, levels, subjects and configured ranges/thresholds

`lib/data/mission.ts` fixes the demonstration clock (`DEMO_NOW`), the fictional
mission **HELIOS TRANSIT 7** and its crew. Dates in the UI are computed from
that clock, so the snapshot stays internally consistent instead of ageing.

Regenerate the JSON after changing `health.db` (run from `frontend/`):

```bash
python scripts/export-demo-data.py
```

The script only reads the database and writes `lib/data/`; set `HM_DB` to point
at a different file. Assessment definitions (`assessments.ts`), body systems
(`bodySystems.ts`) and hazards (`hazards.ts`) are hand-authored, clearly labelled
demo content and are not exported from the database.

## Swapping in the FastAPI backend

UI components import data only from `@/lib/data`. That barrel re-exports the
selectors in `lib/data/vitals.ts`, `lib/data/metrics.ts`, `lib/data/subjects.ts`
and the mission/content definitions. The selectors are synchronous today; a live
swap means loading the same shapes asynchronously (server components or a query
hook) and mapping the API responses onto `types/`. Screens still depend only on
the barrel, so the change stays inside `lib/data` plus one loading boundary.

| Data                       | Endpoint                          |
| -------------------------- | --------------------------------- |
| Latest values, subjects    | `GET /api/latest`, `/api/subjects` |
| History for trend charts   | `GET /api/history`                |
| Daily sleep/exercise       | `GET /api/daily`                  |
| Radiation exposure         | `GET /api/radiation`              |
| Alerts and limits          | `GET /api/alerts`, `/api/limits`  |
| Levels / range definitions | `GET /api/levels`                 |

Classification lives in `lib/health/levels.ts` and mirrors `levels.py` exactly,
so moving the data source does not change how values are graded. Assessment
submission is local-only today; `submit()` in `lib/assessment-store.ts` is the
single place to add a write endpoint.

## Body figure attribution

The front-view figure in the Digital Human explorer is a crop of
[“Female-male front-back 3d-shaded human illustration.svg” by Goran tek-en](https://commons.wikimedia.org/wiki/File:Female-male_front-back_3d-shaded_human_illustration.svg),
based on [“Human Body.jpg” by Mikael Häggström](https://commons.wikimedia.org/wiki/File:Human_Body.jpg),
with anatomical input from Rob Hurt. The source is licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). This project
crops the front-view figure and adds interactive educational overlays; the
adaptation is shared under the same license.

## Layout

```
app/                 routes + metadata (server components only)
components/
  layout/            shell, sidebar, top bar, page header, mission clock
  overview/          mission/crew panels and section index
  biometrics/        metric cards, alerts, measurement table, daily + radiation
  anatomy/           body schematic, system panel and system cards
  assessment/        library, cards, multi-step runner
  hazards/           hazard cards, detail, context and adaptive charts
  charts/            shared Recharts wrappers
  ui/                buttons, badges, fields, modal, toast
  providers/         crew context and toast context
lib/
  data/              demo JSON + typed repositories and content definitions
  health/            level classification, formats, guidance copy
  assessment-store.ts local result persistence and due logic
types/               shared domain types
```

## Interaction notes

- Every control is functional: filters, crew switching, modal journeys, chart
  metric/range pickers and hazard countermeasure filters all update state.
- Cross-page deep links use `sessionStorage` (`astra:focus-assessment`,
  `astra:focus-system`, `astra:focus-hazard`) and fall back to the default
  selection when the target is unknown.
- Charts have labelled axes, units and tooltips; when a hazard has no reliable
  time series the panel explains that it is tracked through a health check rather
  than inventing a chart.
- The assessment modal traps and restores keyboard focus, closes on Escape and
  is labelled for screen readers. The mobile navigation behaves the same way.
- Colour is never the only signal: levels also carry text labels and icons.
