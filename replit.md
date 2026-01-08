# Evaluador Médico IA

## Overview

This project is an AI-powered medical report evaluator designed for Mexican insurance companies (GNP, MetLife, and NY Life Monterrey). It leverages Google's Gemini AI to extract and validate data from medical report images/PDFs against configurable scoring rules, providing pre-approval recommendations for insurance claims. The system streamlines the evaluation process by detecting the insurance provider, extracting structured data, applying validation rules, generating compliance scores with detailed issue flags, and allowing manual corrections with real-time re-evaluation. The business vision is to automate and standardize medical claim pre-approval, reducing processing time and increasing accuracy for insurance providers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite

### Core Features
- **Multi-Provider Support**: A configuration-driven "Provider Registry Pattern" allows easy integration of new insurance providers by adding new configuration files (e.g., `metlife.config.ts`, `gnp.config.ts`, `nylife.config.ts`). This includes provider-specific extraction instructions and Gemini schemas.
- **AI Integration**: Uses Google Gemini AI for document analysis, configured for consistent extractions (`temperature: 0.1`) and structured JSON output based on dynamic provider-specific schemas.
- **Scoring Engine**: A rule-based validation system with configurable rules categorized by severity (CRÍTICO, IMPORTANTE, MODERADO, DISCRETO). It supports general rules and provider-specific rules, calculating a final score and returning detailed flags for violations.
- **Editable Rules System**: A user interface allows dynamic creation and modification of validation rules. It supports 21 operators across categories (Existence, Comparison, Dates, Formats, Multi-field), simple AND/OR logic, and real-time previews. Rules can be applied to single or multiple providers with dynamic field mapping.
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
```

### Database Tables
- `users` - id, email, password_hash, nombre, rol, timestamps
- `medical_forms` - With insurance_company index
- `form_pdfs` - PDF URLs linked to forms
- `sessions` - Session tokens
- `password_resets` - Reset tokens
- `audit_logs` - Action tracking
- `stripe_customers`, `subscriptions`, `payment_history` - Ready for Stripe