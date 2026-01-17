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
- **Authorization**: Role-based access control (RBAC) with hierarchical roles:
  - `ADMIN`: Full system access, manages rules and insurance provider configurations
  - `ASEGURADORA`: Insurance company users, can only view reports from their company
  - `BROKER`: Insurance brokers, can view their own reports + reports from their AUDITORs
  - `AUDITOR`: Auditors assigned to a BROKER, can only view their own reports
- **Audit Logging**: Comprehensive tracking of user actions.

### Core Features
- **Multi-Provider Support**: A "Provider Registry Pattern" enables easy integration of new insurance providers through configuration files, including provider-specific extraction instructions and Gemini schemas.
- **AI Integration**: Leverages Google Gemini AI (`gemini-2.5-flash`) for document analysis, configured for consistent extractions and structured JSON output based on dynamic provider schemas.
- **Scoring Engine**: A rule-based validation system with configurable rules categorized by severity. Each severity level has a defined point range:
  - CRÍTICO: 16-20 points (default: 18) - Ensures critical violations always result in rejection
  - IMPORTANTE: 8-12 points (default: 10)
  - MODERADO: 5-8 points (default: 6)
  - DISCRETO: 1-3 points (default: 2)
  Points are automatically adjusted when changing severity levels, and the system validates ranges on both frontend and backend.
- **Editable Rules System**: A UI allows dynamic creation and modification of validation rules, supporting 28 operators, AND/OR logic, and real-time previews. Rules can apply to single or multiple providers via dynamic field mapping. Rules are stored in PostgreSQL.
- **Rule Versioning System**: Automatic versioning tracks rule changes over time. Each form stores the rule version used during processing, enabling detection of rule drift. When rules change after a form was processed, users see an indicator and can either keep the original evaluation or recalculate with current rules. Database tables: `RuleVersion` (snapshots), `RuleChangeLog` (audit trail).
- **GNP Audit Rules**: Includes a comprehensive set of ~63 rules for GNP insurance, covering universal aspects, GNP-specific requirements, visual document tampering detection, signature verification, and diagnosis severity classification.
- **Multi-Provider Field Mapping**: Facilitates rule application across different insurers despite varying field paths using `fieldMappings` and dynamic autocomplete.
- **Normalization Layer**: Maps disparate provider-specific fields to a `StandardizedMedicalReport` schema for data consistency.
- **Provider Detection**: Automatically identifies insurance providers from PDF content using keyword matching, with manual selection as a fallback.
- **Multi-File Upload Support**: Users can upload up to 5 files (images or PDFs) that are processed together as a single document. Features include:
  - Drag-and-drop or click to select multiple files
  - Visual preview of all selected files with thumbnails
  - Individual file removal before processing
  - Files are sent together in a single Gemini API call for consolidated extraction
  - Provider detection uses the first file in the sequence
  - Ideal for mobile users who take individual photos of each page of a medical report
- **Report History System**: Displays processed reports in a table format, allowing users to view their own reports and access detailed views with associated PDFs.
- **File Storage System**: Integrates with Replit Object Storage for automatic upload and secure serving of PDFs and images, with transactional saving and cleanup.
- **Stripe Subscription System**: Manages subscription plans with tiered benefits:
  - **Plan Básico** ($499/mes): 1 Broker, 0 auditores, 25 informes/mes (50 en promo), soporte por correo
  - **Plan Profesional** ($999/mes): 1 Broker + 3 auditores, 55 informes/mes (110 en promo), soporte prioritario, dashboard de estadísticas
  - **Plan Empresarial** ($2,999/mes): 1 Broker + 10 auditores, 170 informes/mes (340 en promo), soporte personalizado, capacitación inicial
  Promotional offers, extra report charges, and usage tracking. Administrators have unlimited access and a dedicated billing dashboard.
  - **Usage Tracking Based on Stripe Billing Periods**: The UsageRecord model includes a `periodStart` field that stores the Stripe billing period start date. When a subscription renews or a new subscription starts (even in the same calendar month), the system detects that `currentPeriodStart` from Stripe is newer than the stored `periodStart` and automatically resets the usage counters (reportsUsed, extraReportsUsed, extraChargesMxn). This ensures accurate billing per Stripe period, not calendar month. Uses database transactions to prevent race conditions.
  - **Discount Code System**: Admins can create and manage discount codes from the billing dashboard:
    - Codes can be percentage-based (e.g., 20% off) or fixed amount (e.g., $100 MXN off)
    - Two usage types: Single Use (limited by quantity) or Time Period (valid until a date)
    - Each code can only be used once per user account (enforced by database unique constraint)
    - Discounts apply only for one month (Stripe coupon duration: 'once')
    - Integrated with Stripe Coupons and Promotion Codes
    - Users enter codes directly in Stripe Checkout's payment page (allow_promotion_codes: true)
    - Webhook records usage when checkout completes with a discount applied
    - Database models: DiscountCode (stores code details + Stripe IDs), DiscountCodeUsage (tracks per-user redemptions)
  - **Subscription Change Management**:
    - **Upgrades**: Applied immediately with new checkout, old subscription cancelled, used reports transferred to new plan
    - **Downgrades**: Scheduled for period end using `cancel_at_period_end`, applied when period ends
    - **Cancellations**: Uses `cancel_at_period_end`, users can continue until period ends, reactivation available before expiry
    - **Auditor Auto-deactivation**: When downgrade is applied, excess auditors are automatically deactivated (oldest retained)
  - **Subscription Access Control**:
    - BROKERs without active subscription cannot login or access the platform
    - AUDITORs whose BROKER has no active subscription cannot login
    - Sessions are automatically invalidated when subscription expires
    - Database fields: `cancelAtPeriodEnd`, `scheduledPlanType`, `scheduledChangeAt` track pending changes
- **Email Report Sending**: Sends audit reports via email with PDF attachments using Titan SMTP (smtp.titan.email:587). Emails are sent from "Agente AI <agente@veryka.ai>" with professional HTML formatting. Includes failover to smtpout.secureserver.net if primary server fails. Credentials stored in Email_User and Email_Pass secrets.
- **Auditor Management System**: Brokers can manage their auditors through a dedicated UI accessible from the user profile menu. Features include:
  - Create, edit, and delete auditor accounts (with proper password hashing)
  - Plan-based auditor limits enforced on creation (Básico: 0, Profesional: 3, Empresarial: 10)
  - Visual indicator showing current vs maximum auditors allowed
  - Upgrade prompts when limit is reached
  - View auditor usage statistics for the current billing period
  - Track how many reports each auditor has generated this month
  - Reports generated by auditors count against the broker's monthly limit
  - API routes at `/api/auditors` with full CRUD operations, usage statistics, and `/api/auditors/limits` endpoint
  - **Auditor Access Control**: Each auditor has an `isActive` field that controls their access. When a broker downgrades their plan, the system automatically deactivates excess auditors (keeping the oldest by creation date). Inactive auditors cannot log in or process reports. Brokers can toggle auditor status via the UI within their plan limits.

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
- **nodemailer**: For SMTP email sending (Titan Email).
- **Replit Object Storage**: For file storage.
- **Stripe**: For subscription and payment processing.