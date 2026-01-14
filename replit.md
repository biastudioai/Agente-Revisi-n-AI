# Veryka.ai - Evaluador Médico Inteligente

## Overview

This project is an AI-powered medical report evaluator designed for Mexican insurance companies (GNP, MetLife, and NY Life Monterrey). It leverages Google's Gemini AI to extract and validate data from medical report images/PDFs against configurable scoring rules, providing pre-approval recommendations for insurance claims. The system streamlines the evaluation process by detecting the insurance provider, extracting structured data, applying validation rules, generating compliance scores with detailed issue flags, and allowing manual corrections with real-time re-evaluation. The business vision is to automate and standardize medical claim pre-approval, reducing processing time and increasing accuracy for insurance providers.

## Branding (Veryka.ai)

### Brand Colors
| Element | Hex Code | CSS Variable |
|---------|----------|--------------|
| Azul Primario (Dark) | #1A2B56 | `veryka-dark` |
| Cian (Accent) | #00D1E0 | `veryka-cyan` |
| Fondo Claro | #F8FAFC | `veryka-light` |

### Brand Styles
- **Border Radius**: 14px (`rounded-veryka`)
- **Logo**: `attached_assets/Veryka_Logo_1767919213039.png`

### Usage Guidelines
- Use dark blue (#1A2B56) for primary buttons and titles
- Use cyan (#00D1E0) for accents, links, and highlights
- Use light background (#F8FAFC) for page backgrounds
- Maintain 14px border radius on cards and buttons

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS with Veryka brand colors
- **Icons**: Lucide React
- **Build Tool**: Vite

### Core Features
- **Multi-Provider Support**: A configuration-driven "Provider Registry Pattern" allows easy integration of new insurance providers by adding new configuration files (e.g., `metlife.config.ts`, `gnp.config.ts`, `nylife.config.ts`). This includes provider-specific extraction instructions and Gemini schemas.
- **AI Integration**: Uses Google Gemini AI for document analysis, configured for consistent extractions (`temperature: 0.1`) and structured JSON output based on dynamic provider-specific schemas.
- **Scoring Engine**: A rule-based validation system with configurable rules categorized by severity (CRÍTICO, IMPORTANTE, MODERADO, DISCRETO). It supports general rules and provider-specific rules, calculating a final score and returning detailed flags for violations.
- **Editable Rules System**: A user interface allows dynamic creation and modification of validation rules. It supports 28 operators across categories (Existence, Comparison, Dates, Formats, Strings, Multi-field), simple AND/OR logic, and real-time previews. Rules can be applied to single or multiple providers with dynamic field mapping.
- **GNP Audit Rules (January 2026)**: Comprehensive 63-rule system for GNP insurance including:
  - ~24 universal rules (patient ID, vital signs ranges, chronology, signatures, document integrity)
  - ~40 GNP-specific rules (procedure selection, policy validation, conditional medical history, hospital data, consulting physicians, complications)
  - Visual document tampering detection (tachaduras/enmendaduras) via Gemini AI
  - Signature verification and diagnosis severity classification
- **Multi-Provider Field Mapping**: Enables rules to apply to multiple insurers even if field paths differ, using `fieldMappings` and dynamic autocomplete based on each provider's Gemini schema.
- **Normalization Layer**: An infrastructure for mapping disparate provider-specific fields to a standardized medical report schema (`StandardizedMedicalReport`), providing both raw and normalized data for compatibility and future processing.
- **Provider Detection**: Automatically identifies insurance providers from PDF text content (first 2 pages) using keyword matching, with a fallback to manual selection.

### Backend
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma 7 with PostgreSQL adapter
- **Database**: PostgreSQL
- **Authentication**: Secure, bcrypt-hashed passwords, session management via HttpOnly cookies (web) or Bearer tokens (API), and password reset functionality.
- **Authorization**: Role-based access control (`ADMIN`, `REVIEWER`, `USER`) for API endpoints.
- **Audit Logging**: Comprehensive tracking of user actions (LOGIN, LOGOUT, VIEW_FORM, EDIT_JSON) for compliance and security.
- **Usage Tracking (January 2026)**: Monthly report usage tracking per user with configurable limits. Auto-saves reports after processing and only counts new reports (not updates). Visual progress bar in header shows usage vs limit.

## External Dependencies

### AI/ML Services
- **Google Gemini AI**: Used for document analysis and structured data extraction.
  - Model: `gemini-2.5-flash`
  - Requires `API_KEY` environment variable.

### PDF Processing
- **pdf.js**: For client-side PDF rendering.
- **pdf-lib**: For PDF modification and annotation.

### UI Dependencies
- **React**: Core UI framework.
- **Lucide React**: Icon library.
- **Tailwind CSS**: For styling.

### Development & Backend
- **Vite**: Frontend build tool.
- **TypeScript**: For type-safe development.
- **Prisma**: ORM for database interaction (PostgreSQL).
- **Express.js**: Backend server framework.
- **bcrypt**: For password hashing.
- **googleapis**: Gmail API for password reset emails.

## Authentication System (January 2026)

### Login Page
- **Location**: `components/LoginPage.tsx`
- **Features**:
  - Login with email/password
  - User registration
  - Password recovery via email
  - Token-based password reset

### Email Service
- **Location**: `server/src/services/emailService.ts`
- **Integration**: Replit Gmail Connector
- **Features**:
  - HTML email templates
  - Password reset emails with secure tokens
  - Error handling with visible feedback

### API Endpoints
```
POST /api/auth/register - Create account
POST /api/auth/login - Login
POST /api/auth/logout - Logout
POST /api/auth/password-reset/request - Request reset email
POST /api/auth/password-reset/confirm - Reset password
GET  /api/auth/validate - Validate session
GET  /api/health - Server health check

POST /api/forms - Create medical form with JSON data and optional file upload
GET  /api/forms - List all user's medical forms
GET  /api/forms/:id - Get specific medical form
DELETE /api/forms/:id - Delete medical form and associated files
GET  /objects/* - Serve uploaded files from Object Storage
```

## File Storage System (January 2026)

### Object Storage Integration
- **Location**: `server/replit_integrations/object_storage/`
- **Service**: Replit Object Storage (Google Cloud Storage backend)
- **Features**:
  - Automatic file upload when saving reports
  - PDF and image file storage
  - Secure file serving via `/objects/*` endpoint
  - Automatic cleanup when deleting forms

### Storage Flow
1. User saves a medical report
2. Frontend sends JSON data + base64 file to `/api/forms`
3. Backend uses upsert to update or create the form (one per user+insuranceCompany)
4. Backend uploads new file to Object Storage
5. Backend upserts the PDF URL in `form_pdfs` (one per form)
6. Old file is deleted from storage only after successful save
7. Files accessible via `/objects/uploads/{uuid}.{ext}`

### Database Constraints (January 2026)
- `medical_forms`: Unique constraint on `(user_id, insurance_company)` - prevents duplicate forms per user per insurance company
- `form_pdfs`: Unique constraint on `form_id` - ensures only one PDF per form (overwrites on save)
- Transactional saves with cleanup on failure to prevent data loss

### Database Tables
- `users` - id, email, password_hash, nombre, rol, timestamps
- `medical_forms` - With unique(user_id, insurance_company) and insurance_company index
- `form_pdfs` - PDF URLs with unique(form_id) constraint
- `sessions` - Session tokens
- `password_resets` - Reset tokens
- `audit_logs` - Action tracking
- `stripe_customers`, `subscriptions`, `payment_history` - Ready for Stripe
- `scoring_rules` - Validation rules stored in PostgreSQL (migrated January 2026)
- `aseguradora_configs` - Insurance provider configurations

## Scoring Rules Database System (January 2026)

### Architecture
- **Database Storage**: All 56 validation rules migrated from static TypeScript files to PostgreSQL
- **Service Layer**: `server/src/services/rulesService.ts` provides CRUD operations with type-safe mappings
- **Frontend Integration**: `services/database-rules-loader.ts` with 5-minute cache and fallback to local rules
- **API Endpoints**: REST API at `/api/rules` for rule management

### Rule Distribution
| Category | Count | Description |
|----------|-------|-------------|
| GENERAL | 25 | Universal rules (patient ID, vital signs, signatures) |
| GNP | 28 | GNP-specific rules (procedure selection, policy validation) |
| METLIFE | 3 | MetLife-specific rules |

### API Endpoints (Rules)
```
GET  /api/rules - List all active rules (public, for frontend)
GET  /api/rules/stats - Get rule statistics by category
GET  /api/rules/aseguradora/:provider - Get rules for specific insurer
GET  /api/rules/:ruleId - Get specific rule by ID
POST /api/rules - Create new rule (requires auth)
PUT  /api/rules/:ruleId - Update rule (requires auth)
POST /api/rules/:ruleId/deactivate - Deactivate rule (requires auth)
POST /api/rules/:ruleId/activate - Activate rule (requires auth)
```

### Validator Registry Pattern
Rules with JavaScript validator functions are handled via `VALIDATORS_REGISTRY` in `database-rules-loader.ts`. Functions cannot be stored in JSON, so they are referenced by `validatorKey` in the database and resolved at runtime.

### Database-Only Architecture (January 2026)
All validation rules are stored exclusively in PostgreSQL. There are no static fallback files - if the database is unavailable, the application will show an error message. This ensures:
- **Security**: Rules cannot be modified without database access
- **Consistency**: Single source of truth for all validation logic
- **Auditability**: All rule changes are tracked in the database