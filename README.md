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
| GET | `/api/auth/me` | Admin | Get the logged-in admin's own profile |
| POST | `/api/auth/change-password` | Admin | Change your own password (`currentPassword`, `newPassword`) — logs you out everywhere afterward |
| GET | `/api/admins` | Admin | List all admin accounts |
| POST | `/api/admins` | Admin | Create a new admin account (`name`, `email`, `password`, optional `role`) |
| PUT | `/api/admins/:id/reset-password` | Admin | Reset **another** admin's password (e.g. they're locked out). Omit `newPassword` to auto-generate one — it's returned once in the response, so copy it down and share it securely. Forces that admin to log out everywhere. |
| DELETE | `/api/admins/:id` | Admin | Remove an admin account (can't delete yourself or the last remaining admin) |
| GET | `/api/settings` | Public | Get configurable dropdown lists (vehicle categories, brands, fuel types, transmission types) and the site's currency |
| PUT | `/api/settings` | Admin | Update those lists and/or currency |
| POST | `/api/uploads/images` | Admin | Upload up to 5 vehicle images (`multipart/form-data`, field name `images`) — hosted for free in a GitHub repo, returns the raw URLs to save on the vehicle |
| POST | `/api/geocode/locate-ip` | Admin | Estimate a location from an IP address (`{ ip }`) — approximate, ISP-level accuracy, not true GPS |
| GET | `/api/geocode/reverse` | Admin | Turn coordinates (`?lat=&lng=`) into a human-readable place name |
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

## 8. Vehicle image uploads (hosted for free on GitHub)

Instead of paying for image storage, uploaded vehicle photos get committed straight into
a GitHub repo, and the app uses GitHub's raw file URLs to display them. Here's the one-time setup:

1. **Create a new, empty GitHub repo** just for images, e.g. `sidita-vehicle-images`
   (Public — raw URLs from private repos won't load in a browser without extra auth).
2. **Create a fine-grained Personal Access Token**: GitHub → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → **Generate new token**.
   - Repository access: "Only select repositories" → choose `sidita-vehicle-images`
   - Permissions → Repository permissions → **Contents: Read and write**
   - Generate, and copy the token (starts with `github_pat_...`) — you won't see it again.
3. On Render → your backend service → Environment, add:
   - `GITHUB_TOKEN` = the token you just copied
   - `GITHUB_IMAGES_REPO` = `your-username/sidita-vehicle-images`
   - `GITHUB_IMAGES_BRANCH` = `main`
4. Save — Render redeploys automatically. Uploading images in the admin panel now works;
   each photo appears as a new commit in that repo, and its raw URL is what's stored on the vehicle.

If these env vars aren't set, the upload endpoint returns a clear error telling you so — vehicles
can still be saved without new images in the meantime.

## 9. Email notifications (free, via Resend)

The backend emails your admin team when a customer submits a request, and emails a new admin
their login details (plus notifies the rest of the team) when you add someone. Setup:

1. Go to https://resend.com and sign up (free tier: 3,000 emails/month, 100/day).
2. Once logged in, go to **API Keys** → **Create API Key**. Copy it.
3. On Render → your backend service → Environment, add:
   - `RESEND_API_KEY` = the key you just copied
4. Save — Render redeploys automatically. That's it — emails will start sending immediately
   from `onboarding@resend.dev` with the display name "SIDITA Halal Rentals", no domain
   verification needed.

**Optional, for a more professional sender address later:** in Resend, go to **Domains** → add
and verify your own domain (e.g. `sidita-rentals.com`), then set `EMAIL_FROM_ADDRESS` to
something like `notifications@sidita-rentals.com` on Render.

If `RESEND_API_KEY` isn't set, the app still works completely normally — it just skips sending
emails and logs a warning, so nothing breaks if you haven't set this up yet.

