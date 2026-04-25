# ReviewAI - Project Context

## 📌 Project Overview
AI-based customer review analysis platform.

## 🎯 Goal
Analyze reviews from:
- Play Store
- App Store
- Social Media

Provide:
- Sentiment analysis
- Trend insights
- Actionable recommendations

---

## 🏗️ Current Architecture

### Frontend
- React (Vite)
- Admin onboarding wizard
- Dashboard (in progress)

### Backend
- Supabase

---

## 🗄️ Database Tables

### companies
- id
- name
- created_by
- invite_code
- created_at

### projects
- id
- company_id
- app_name
- android_package
- ios_app_id
- social_handles
- timeframe

### invites
- id
- email
- company_id
- invite_code
- status

### employees
- id
- user_id
- company_id
- role

---

## 🔐 Auth System
- Supabase Auth
- Admin + Employee roles

---

## 🔄 Current Flow

1. Role selection (Admin / Employee)
2. Login / Signup
3. Admin:
   - Create Company
   - Generate Invite Code
   - Setup Wizard (in progress)
4. Employee:
   - Join via invite code (planned)

---

## ✅ Completed Features

- [x] Supabase setup
- [x] Auth (login/signup)
- [x] Role selection screen
- [x] Company creation (Step 1 — saves to Supabase)
- [x] Invite code generation (auto on company create)
- [x] RLS policies (dev mode)
- [x] Routing (React Router)
- [x] App Details step with Smart Search typeahead (Step 2)
- [x] Social Media dynamic input with validation (Step 3)
- [x] Configuration step (Step 4)
- [x] Final setup save to `projects` table (Step 5)
- [x] Sidebar invite code display with Gmail/WhatsApp/Copy share buttons
- [x] **Persistent workspace**: Returning admins skip wizard → dashboard
- [x] **Multi-company support**: Dropdown to switch companies
- [x] **Admin Dashboard**: Company card + invite card + share buttons
- [x] "+ Add New Company" to re-open wizard from dashboard

---

## 🚧 In Progress

- [ ] Dashboard analytics/stats section
- [ ] Employee join flow (enter invite code → link to company)
- [ ] Actual review data ingestion (Play Store / App Store APIs)

---

## 📌 Next Steps

- Build analytics dashboard with mock sentiment data
- Connect employee join flow (auth.jsx already has invite code check)
- Replace mock app search with real API calls
- Add email sending via Resend/Supabase Functions