# SIDITA Halal Rentals — Backend API

This is the backend for the SIDITA project. It powers:
- The **admin panel** (add/edit/delete vehicles, manage tracking info, view analytics)
- The **customer site** (browse vehicles, submit lease/rental/purchase requests)

It's a Node.js + Express API, storing data in MongoDB Atlas (free tier), and deployed on
Render (free tier). Total cost: **$0**.

---

## 0. What you'll end up with

Three live URLs:
1. `https://<you>.github.io/sidita-website` — the main marketing site (already built)
2. `https://<you>.github.io/sidita-admin` — the admin panel
3. `https://<you>.github.io/sidita-customer` — the customer-facing leasing site
4. `https://sidita-backend.onrender.com` — this API, which the other two talk to

---

## 1. Create a free MongoDB Atlas database

1. Go to https://www.mongodb.com/cloud/atlas/register and sign up (free, no card needed).
2. When asked, create a **free "M0" cluster** (choose any nearby cloud region).
3. **Create a database user**: Left sidebar → "Database Access" → "Add New Database User".
   - Username: `sidita_admin` (or anything)
   - Password: click "Autogenerate Secure Password" and **copy it somewhere safe**.
   - Built-in role: "Read and write to any database".
4. **Allow network access**: Left sidebar → "Network Access" → "Add IP Address" →
   choose **"Allow Access from Anywhere"** (0.0.0.0/0). This is required because Render's
   servers don't have a fixed IP on the free tier.
5. **Get your connection string**: Left sidebar → "Database" → click "Connect" on your
   cluster → "Drivers" → copy the string, which looks like:
   ```
   mongodb+srv://sidita_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with the real password from step 3, and add a database name
   before the `?`, e.g. `.../sidita?retryWrites=true...`. Save this full string — it's your
   `MONGODB_URI`.

---

## 2. Put this backend on GitHub

1. Create a new **empty** GitHub repository, e.g. `sidita-backend` (Private or Public, your choice).
2. On your computer, open a terminal in this `sidita-backend` folder and run:
   ```bash
   git init
   git add .
   git commit -m "Initial backend"
   git branch -M main
   git remote add origin https://github.com/<your-username>/sidita-backend.git
   git push -u origin main
   ```
   (The `.env` file is already excluded via `.gitignore` — never commit real secrets to GitHub.)

---

## 3. Deploy the backend to Render (free)

1. Go to https://render.com and sign up (you can sign up with your GitHub account — this
   also makes connecting the repo easier).
2. Click **"New +"** → **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"**, then connect and select your
   `sidita-backend` repo.
4. Fill in the settings:
   - **Name**: `sidita-backend` (this becomes part of your URL)
   - **Region**: closest to you
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
5. Scroll to **"Environment Variables"** and add these (values from earlier steps):
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | your full Atlas connection string from step 1 |
   | `JWT_SECRET` | any long random string, e.g. generate one at https://randomkeygen.com |
   | `ALLOWED_ORIGINS` | leave as `*` for now (see note below), tighten later |
   | `ADMIN_EMAIL` | the email you'll use to log into the admin panel |
   | `ADMIN_PASSWORD` | a temporary password, you'll change it after first login |
6. Click **"Create Web Service"**. Render will install dependencies and start the server.
   This takes a few minutes the first time. When the log shows
   `SIDITA API running on port ...`, it's live.
7. Your API's base URL will be shown at the top of the Render dashboard, something like:
   ```
   https://sidita-backend.onrender.com
   ```
   Visit it in a browser — you should see `{"status":"ok","service":"SIDITA Halal Rentals API"}`.

> **Note on free tier**: Render's free web services "sleep" after 15 minutes of no traffic
> and take ~30-50 seconds to wake up on the next request. This is normal — the admin panel
> and customer site will just feel a little slow on the very first request after idle time.

> **Note on CORS**: `ALLOWED_ORIGINS` controls which frontend domains are allowed to call
> this API. Once your admin panel and customer site are live on GitHub Pages (step 5),
> come back to Render → your service → "Environment" and set this to a comma-separated
> list, e.g.:
> ```
> https://<you>.github.io
> ```
> Then click "Save Changes" — Render will redeploy automatically.

---

## 4. Create your first admin login

You need to run the "seed" script once, against your live database, to create the
account you'll use to log into the admin panel.

**Easiest way — run it locally, pointed at your Atlas database:**

1. On your computer, in the `sidita-backend` folder:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the same `MONGODB_URI`, `ADMIN_EMAIL`,
   and `ADMIN_PASSWORD` you used on Render.
3. Run:
   ```bash
   npm run seed
   ```
4. You'll see your admin email and password printed — these are what you'll type into
   the admin panel's login screen. **Log in once and you can change your password later
   by asking your developer to add a "change password" endpoint, or by re-running seed
   with a new password after deleting the old admin document in Atlas.**

---

## 5. Deploy the two frontend sites to GitHub Pages

You'll get two separate `index.html` files from this project: one for the **admin panel**
and one for the **customer site**. Each needs its own GitHub repo.

For **each** of the two sites:

1. Create a new GitHub repository (e.g. `sidita-admin` and `sidita-customer`).
2. Add the corresponding `index.html` file to the repo (drag-and-drop upload works fine
   on github.com, or use `git`).
3. Open the `index.html` file and find this line near the top of the `<script>` section:
   ```js
   const API_BASE = 'https://sidita-backend.onrender.com/api';
   ```
   Replace it with **your actual Render URL** from step 3, keeping the `/api` at the end.
4. Commit the change.
5. In the repo, go to **Settings → Pages**.
6. Under "Build and deployment" → "Source", choose **"Deploy from a branch"**, branch
   `main`, folder `/ (root)`. Click **Save**.
7. After a minute, GitHub will show your live URL, e.g.
   `https://<your-username>.github.io/sidita-admin/`.
8. Repeat for the customer site.
9. Go back to Render and update `ALLOWED_ORIGINS` to include both new URLs
   (see the CORS note in step 3).

Do the same for your existing main website repo if it isn't live yet.

---

## 6. Quick reference — API endpoints

All responses are JSON. Admin-only routes require a header:
`Authorization: Bearer <token>` (token comes from the login endpoint).

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Admin login, returns a token |
| GET | `/api/vehicles` | Public | List vehicles (filters: `?status=`, `?category=`, `?search=`) |
| GET | `/api/vehicles/:id` | Public | Get one vehicle |
| POST | `/api/vehicles` | Admin | Add a vehicle |
| PUT | `/api/vehicles/:id` | Admin | Edit a vehicle |
| DELETE | `/api/vehicles/:id` | Admin | Remove a vehicle |
| PATCH | `/api/vehicles/:id/tracking` | Admin | Update GPS tracker IP / location |
| POST | `/api/leases` | Public | Customer submits a lease/rental/purchase request |
| GET | `/api/leases` | Admin | List all requests (filter: `?status=`) |
| PUT | `/api/leases/:id` | Admin | Update a request's status |
| DELETE | `/api/leases/:id` | Admin | Remove a request |
| GET | `/api/analytics/summary` | Admin | Dashboard numbers (fleet status, requests, revenue) |

---

## 7. Local development (optional, before deploying)

```bash
npm install
cp .env.example .env   # then fill in real values
npm run dev             # starts on http://localhost:4000, auto-restarts on changes
```

Point your frontend's `API_BASE` at `http://localhost:4000/api` while testing locally.
