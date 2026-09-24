# Shiv Laminate Stock Management System (Pastel Colour Series)

A single-owner inventory control dashboard and mobile warehouse application built for **Shiv Laminate** decorative sheets.

The catalog is pre-seeded with all **137 unique SKUs** extracted from `SHIV LAMINATE (PASTEL COLOUR) - Sheet1 (1).pdf` across **11 finishes**:
- **SMT** (Super Matt): 43 SKUs
- **HG** (High Gloss): 24 SKUs
- **SF** (Suede Finish): 18 SKUs
- **MS** (Matt Silk): 8 SKUs
- **BO** (Bark Oak): 7 SKUs
- **FS** (Feather Silk): 7 SKUs
- **CP** (Copper / Compact): 7 SKUs
- **BR** (Brushed): 7 SKUs
- **GW** (Gloss Wave): 3 SKUs
- **STN** (Stone): 6 SKUs
- **HGS** (High Gloss Sparkle): 7 SKUs

---

## Architecture

- **Database**: Supabase PostgreSQL (`database/schema.sql`, `database/seed.sql`)
- **Backend API**: Node.js / Express + TypeScript (`backend/`) configured for **Render**
- **Frontend Dashboard**: React + Vite + Tailwind CSS + Lucide Icons + Recharts (`frontend/`) configured for **Vercel**
- **Mobile Warehouse App**: React Native / Expo (`mobile/`) + Installable PWA (`frontend/public/manifest.json`)
- **Local Agent Skill**: `.agent/skill/laminate-stock-manager/`

---

## Quick Start (Local Development)

### 1. Run the Backend API
```bash
cd backend
npm install
npm run dev
```
Backend runs at `http://localhost:5000` (Healthcheck: `http://localhost:5000/api/health`).

### 2. Run the Frontend Web Dashboard
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

### 3. Run the Mobile App
```bash
cd mobile
npx expo start
```
Scan the QR code with the **Expo Go** app on your phone (iOS or Android) to run the mobile app directly.

---

## Deployment Instructions

### 1. Database (Supabase)
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. In the **SQL Editor**, paste and execute `database/schema.sql`.
3. Then paste and execute `database/seed.sql` to populate all 137 Shiv Laminate SKUs.
4. Copy your **Project URL** and **Anon / Service Key** from Project Settings &rarr; API.

### 2. Backend Deployment (Render)
1. Create a new Web Service on [Render](https://render.com).
2. Connect your Git repository and set the **Root Directory** to `backend`.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Environment Variables:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `SUPABASE_URL`: `<your-supabase-url>`
   - `SUPABASE_KEY`: `<your-supabase-key>`
   - `AUTH_PIN`: `1901` (or your chosen owner passcode)
   - `CLIENT_URL`: `https://your-vercel-frontend.vercel.app`

### 3. Frontend Deployment (Vercel)
1. Import your Git repository into [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Environment Variables:
   - `VITE_API_URL`: `https://<your-render-backend>.onrender.com/api`
5. Click **Deploy**. Vercel will build and launch the site globally.
