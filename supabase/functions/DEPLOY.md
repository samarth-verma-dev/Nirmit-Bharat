# Deploy Edge Function: `app-autofill`

## What this function does
- Calls iTunes Search API → gets real iOS App ID
- Scrapes Google Play Store → gets real Android package name
- Enriches with social media handles

---

## Deploy Steps

### 1. Install Supabase CLI (if not done)
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
npx supabase login
```
→ Opens browser, paste your Personal Access Token from:
https://supabase.com/dashboard/account/tokens

### 3. Link your project
```bash
cd "c:\Users\kanha\Nirmit Bharat"
npx supabase link --project-ref ohemzahjlbuumfphtxim
```

### 4. Deploy the function
```bash
npx supabase functions deploy app-autofill --no-verify-jwt
```

### 5. Verify
```bash
npx supabase functions list
```

---

## Note
Until the Edge Function is deployed, autofill uses a **direct fallback**:
- iTunes Search API (free, no key, browser-compatible)
- Local enrichment map for 60+ apps (Android packages + socials)

The fallback works immediately without any deployment.
