# Facebook Link Creator SaaS - Setup Guide

This folder contains the complete source code for the SaaS platform:
- `backend/`: FastAPI API server (deployed to **Railway**).
- `frontend/`: Next.js web application dashboard (deployed to **Vercel**).
- `backend/schema.sql`: Database schema configuration (run on **Supabase**).

---

## 1. Database Setup (Supabase)
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Go to the **SQL Editor** in the left sidebar.
3. Paste the contents of `backend/schema.sql` and click **Run**. This will create the required tables and configure the auth trigger.
4. Go to **Project Settings** -> **API** and copy:
   - `Project URL`
   - `anon public API key`
5. Go to **Storage** and create a new **Public Bucket** named `images`.

---

## 2. Backend Deployment (Railway.app)
1. Register/Login on [railway.app](https://railway.app).
2. Create a new project and link it to your GitHub repository containing the `/backend` folder.
3. In Railway, configure the following **Environment Variables**:
   - `SUPABASE_URL` = (Your Supabase URL)
   - `SUPABASE_KEY` = (Your Supabase Service Role API key - found in Settings -> API -> `service_role` secret key)
4. Deploy the project! Railway will automatically detect the Python FastAPI setup and launch it. Copy your live API URL (e.g. `https://your-api.up.railway.app`).

---

## 3. Frontend Deployment (Vercel.com)
1. Register/Login on [vercel.com](https://vercel.com).
2. Click **Add New** -> **Project** and select your GitHub repository.
3. Set the **Root Directory** of the project as `GK FB Link SaaS/frontend` (or `/frontend` if you push it to a clean repo).
4. Configure the following **Environment Variables** in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Your Supabase Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Your Supabase anon public API key)
   - `NEXT_PUBLIC_BACKEND_URL` = (Your live Railway backend API URL)
5. Click **Deploy**! Your SaaS will be live on a custom vercel URL (e.g., `https://your-app.vercel.app`).

---

## 4. Local Testing
To test everything locally on your machine:
### Run Backend (FastAPI):
1. Navigate to `/backend` directory.
2. Install dependencies: `pip install -r requirements.txt`
3. Create a `.env` file with your `SUPABASE_URL` and `SUPABASE_KEY`.
4. Start Server: `uvicorn main:app --reload` (Runs on `http://localhost:8000`)

### Run Frontend (Next.js):
1. Navigate to `/frontend` directory.
2. Install Node packages: `npm install`
3. Create `.env.local` file with the Supabase URLs and `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`.
4. Start Server: `npm run dev` (Runs on `http://localhost:3000`)
