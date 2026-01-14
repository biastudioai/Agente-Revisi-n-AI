# Veryka.ai - Evaluador Médico Inteligente

## Overview

Veryka.ai is an AI-powered medical report evaluator designed for Mexican insurance companies (GNP, MetLife, NY Life Monterrey). It automates the pre-approval process for insurance claims by extracting and validating data from medical report images/PDFs using Google's Gemini AI. The system applies configurable scoring rules, generates compliance scores with detailed issue flags, and allows manual corrections with real-time re-evaluation. The project aims to standardize and accelerate medical claim pre-approval, enhancing accuracy and reducing processing time for insurance providers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS, utilizing a brand color palette (`veryka-dark`, `veryka-cyan`, `veryka-light`) and a consistent border radius (`rounded-veryka`).
- **Icons**: Lucide React
- **Build Tool**: Vite

### Backend
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma 7
- **Database**: PostgreSQL
- **Authentication**: Secure, token-based (HttpOnly cookies for web, Bearer tokens for API), with bcrypt-hashed passwords and password reset functionality.
- **Authorization**: Role-based access control (`ADMIN`, `REVIEWER`, `USER`).
- **Audit Logging**: Comprehensive tracking of user actions.

### Core Features
- **Multi-Provider Support**: A "Provider Registry Pattern" enables easy integration of new insurance providers through configuration files, including provider-specific extraction instructions and Gemini schemas.
- **AI Integration**: Leverages Google Gemini AI (`gemini-2.5-flash`) for document analysis, configured for consistent extractions and structured JSON output based on dynamic provider schemas.
- **Scoring Engine**: A rule-based validation system with configurable rules categorized by severity. It supports general and provider-specific rules, calculates a final score, and flags violations.
- **Editable Rules System**: A UI allows dynamic creation and modification of validation rules, supporting 28 operators, AND/OR logic, and real-time previews. Rules can apply to single or multiple providers via dynamic field mapping. Rules are stored in PostgreSQL.
- **GNP Audit Rules**: Includes a comprehensive set of ~63 rules for GNP insurance, covering universal aspects, GNP-specific requirements, visual document tampering detection, signature verification, and diagnosis severity classification.
- **Multi-Provider Field Mapping**: Facilitates rule application across different insurers despite varying field paths using `fieldMappings` and dynamic autocomplete.
- **Normalization Layer**: Maps disparate provider-specific fields to a `StandardizedMedicalReport` schema for data consistency.
- **Provider Detection**: Automatically identifies insurance providers from PDF content using keyword matching, with manual selection as a fallback.
- **Report History System**: Displays processed reports in a table format, allowing users to view their own reports and access detailed views with associated PDFs.
- **File Storage System**: Integrates with Replit Object Storage for automatic upload and secure serving of PDFs and images, with transactional saving and cleanup.
- **Stripe Subscription System**: Manages subscription plans (Basic, Profesional, Empresarial) with tiered report limits, promotional offers, extra report charges, and usage tracking. Administrators have unlimited access and a dedicated billing dashboard.

## External Dependencies

### AI/ML Services
- **Google Gemini AI**: For document analysis and structured data extraction.

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
- **Prisma**: ORM for PostgreSQL.
- **Express.js**: Backend server framework.
- **bcrypt**: For password hashing.
- **googleapis**: For Gmail API (password reset emails).
- **Replit Object Storage**: For file storage.
- **Stripe**: For subscription and payment processing.