# Veryka.ai - Evaluador Médico Inteligente

## Overview
Veryka.ai is an AI-powered medical report evaluator designed for Mexican insurance companies. It automates the pre-approval process for insurance claims by extracting and validating data from medical report images/PDFs using Google's Gemini AI. The system applies configurable scoring rules, generates compliance scores with detailed issue flags, and allows manual corrections with real-time re-evaluation. The project aims to standardize and accelerate medical claim pre-approval, enhancing accuracy and reducing processing time for insurance providers. Its business vision is to become the leading AI solution for medical claim processing in Latin America, significantly reducing operational costs and improving service for insurance companies and their clients.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
Veryka.ai utilizes a client-server architecture with a React 19 frontend and an Express.js backend. Data persistence is managed by PostgreSQL via Prisma ORM. A key design principle is the "Provider Registry Pattern" enabling multi-provider support through configurable files for extraction instructions and AI schemas. Security is paramount, implemented with token-based authentication, role-based access control (RBAC), comprehensive audit logging, and secure file storage.

### UI/UX Decisions
The frontend is built with React 19 and TypeScript, styled using Tailwind CSS. It adheres to a consistent brand identity with a specific color palette (`veryka-dark`, `veryka-cyan`, `veryka-light`) and rounded corners (`rounded-veryka`). Lucide React is used for iconography. The UI provides intuitive features like multi-file drag-and-drop uploads, visual previews, and a unified image/PDF viewer with navigation and zoom capabilities.

### Technical Implementations
- **AI Integration**: Leverages Google Vertex AI (gemini-2.0-flash-001) for document analysis, ensuring server-side processing for security and structured JSON output based on dynamic provider schemas.
- **Scoring Engine**: A flexible rule-based validation system where rules are dynamically configurable via a UI. Rules are categorized by severity (Crítico, Importante, Moderado, Discreto), each with adjustable point values, automatically ensuring critical violations lead to rejection.
- **Editable Rules System**: Allows dynamic creation and modification of validation rules through a UI, supporting 28 operators, AND/OR logic, and real-time previews. Rules can be applied to single or multiple providers using dynamic field mapping.
- **Rule Versioning**: Automatically tracks changes to rules. Each processed form stores the rule version used, indicating rule drift and allowing users to re-evaluate with current rules.
- **Audit Rules System**: Includes an extensive set of ~159 active medical report rules, covering general validations and provider-specific rules for GNP, MetLife, NYLife, and AXA. Rules use comma-separated providerTarget values (e.g., 'GNP,METLIFE,NYLIFE') to exclude incompatible providers. AXA has its own field schema (e.g., `medico_principal.nombre` instead of `medico_tratante.nombres`). All date parsing uses DD/MM/YYYY (Mexican format). Intelligent validators support complex comparisons (e.g., name/signature matching, conditional hospital requirements).
- **Data Normalization**: A normalization layer maps provider-specific fields to a `StandardizedMedicalReport` schema for data consistency across different insurance companies.
- **Provider Detection**: Automatically identifies insurance providers from uploaded PDF content using keyword matching, with manual override.
- **Subscription Management**: Integrates a comprehensive Stripe-based subscription system with tiered plans (Básico, Profesional, Empresarial), usage tracking, automatic recurring billing for extra reports, discount code functionality, and robust subscription change management (upgrades, downgrades, cancellations).
- **Auditor Management**: Brokers can manage their auditors via a dedicated UI, enforcing plan-based limits, tracking individual auditor usage, and automatically deactivating excess auditors upon plan downgrades.
- **Email Reporting**: Automated email dispatch for audit reports with PDF attachments, utilizing professional HTML formatting and failover SMTP configurations.
- **Access Control**: Role-based access control (RBAC) with hierarchical roles (ADMIN, ASEGURADORA, BROKER, AUDITOR) ensures granular permissions. Subscription status directly impacts user and auditor login access, with automatic session invalidation upon subscription expiry.

## External Dependencies

### AI/ML Services
- **Google Gemini AI**: For intelligent document analysis and structured data extraction from medical reports.

### PDF Processing
- **pdf.js**: Client-side rendering of PDF documents.
- **pdf-lib**: For programmatic manipulation and annotation of PDFs.

### UI Libraries
- **React**: Frontend framework.
- **Lucide React**: Icon set.
- **Tailwind CSS**: Utility-first CSS framework for styling.

### Backend & Database Technologies
- **Vite**: Frontend build tool.
- **TypeScript**: For type-safe development across the stack.
- **Prisma**: ORM for robust database interaction.
- **Express.js**: Backend web application framework.
- **bcrypt**: For secure password hashing.
- **googleapis**: Utilized for Google services, specifically for Gmail API integration (e.g., password resets).
- **nodemailer**: For sending emails via SMTP (e.g., Titan Email, GoDaddy SecureServer).

### Cloud & Payment Services
- **Replit Object Storage**: For secure and scalable file storage (PDFs, images).
- **Stripe**: Comprehensive platform for subscription management, billing, and payment processing.
- **Google Cloud SQL PostgreSQL**: Production database solution, configured for secure SSL connections.