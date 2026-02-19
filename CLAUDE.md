# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Veryka.ai is an AI-powered medical report evaluator for Mexican insurance companies. It automates claim pre-approval by extracting data from medical report images/PDFs using Google Gemini AI, applying configurable validation rules, and generating compliance scores. The UI and business logic are in Spanish (Mexican context).

## Development Commands

```bash
# Run frontend (Vite dev server on port 5000)
npm run dev -- --host 0.0.0.0 --port 5000

# Run backend (Express on port 3001)
cd server && npx tsx src/index.ts

# Both must run simultaneously for full development

# Build for production
npm run build

# Database operations (run from server/ directory)
npx prisma migrate dev          # Run migrations
npx prisma generate             # Regenerate Prisma client

# Utility scripts
cd server && npx tsx src/scripts/migrate-rules-to-db.ts
cd server && npx tsx src/scripts/seed-stripe-products.ts
```

There is no test runner or linter configured in this project.

## Architecture

**Stack:** React 19 + TypeScript frontend, Express.js 5 backend, PostgreSQL via Prisma 7, Google Vertex AI (Gemini), Stripe for billing, Replit Object Storage for files.

### AI Analysis Pipeline

1. Frontend uploads images/PDFs (base64) with provider selection
2. Backend `server/src/routes/analyze.ts` receives request
3. `server/src/services/geminiService.ts` sends to Vertex AI with provider-specific schema and system prompt
4. Extracted JSON is validated against provider schema
5. `server/src/services/rule-validator.ts` applies 201+ configurable rules
6. `server/src/services/scoring-engine.ts` calculates compliance score (100 base minus deductions)
7. Returns analysis with severity flags: CRÍTICO, ALERTA, OBSERVACIÓN, NOTA

### Provider Registry Pattern

Provider configs exist in **both** `/providers/` (frontend) and `/server/src/providers/` (backend) and must stay in sync. Each provider (GNP, MetLife, NYLife, AXA 2025, AXA 2018) defines:
- Extraction schema for Gemini JSON output
- System prompt with provider-specific extraction instructions
- Field path mappings for rule evaluation

Provider-specific field conventions:
- NYLIFE uses unique paths (e.g., `firma_pagina_2.fecha.formatted`, `padecimiento_actual.diagnosticos`, `equipo_quirurgico_nylife.*`)
- AXA has two format versions: AXA 2025 (id='AXA', AI-461) and AXA 2018 (id='AXA_2018', AI-346)
- Rules target providers via comma-separated `providerTarget` values (e.g., `'GNP,METLIFE'`, `'AXA,AXA_2018'`)

### Key Directories

- `components/` — React components. `Dashboard.tsx` is the main UI (~180KB, central component)
- `services/` — Frontend API service layer
- `server/src/routes/` — Express API endpoints (auth, analyze, forms, rules, billing, stripe, etc.)
- `server/src/services/` — Backend business logic (gemini, rules, scoring, auth, subscriptions)
- `server/src/middlewares/` — JWT auth verification, audit logging
- `server/prisma/schema.prisma` — Database schema with all models and enums

### Scoring & Rules Engine

- Rules stored in PostgreSQL, editable via UI (`RuleEditor.tsx`, `RuleConfigurator.tsx`)
- 33 operators including array validators (`ARRAY_EMPTY`, `ARRAY_CONTAINS_NONE`, `ARRAY_MUTUALLY_EXCLUSIVE`) and `DATE_OLDER_THAN_MONTHS`
- Severity levels with point deductions: Crítico, Importante, Moderado, Discreto
- Rule versioning tracks changes; forms store the rule version used at evaluation time
- Frontend has mirrored copies of scoring/rules services for real-time re-evaluation after manual edits

### Auth & Access Control

- JWT token auth stored in localStorage
- RBAC roles: ADMIN > ASEGURADORA > BROKER > AUDITOR
- Subscription status gates login access; sessions auto-invalidated on expiry

## Conventions

- All dates use DD/MM/YYYY (Mexican format)
- Field paths use dot notation (`antecedentes.personales_patologicos`) and bracket notation for arrays (`tratamiento[0].medicamento`)
- Tailwind CSS with custom theme: `veryka-dark`, `veryka-cyan`, `veryka-light`, `rounded-veryka`
- Frontend state management via React hooks only (no Redux/Zustand)
- Prisma models use PascalCase in schema, mapped to snake_case in SQL via `@map`
