# Project Manager + Website Cloner

A simple Node.js app that lets you:

- Track projects with a SQLite database
- Manage project status and progress in a web UI
- Clone (static snapshot) websites into a local `clones/` directory

## 1) Install

```bash
cd project-manager
npm install
```

## 2) Run

```bash
npm start
```

Open: http://localhost:4000

## 3) Use with your target website

Create a project in the UI, then paste your source URL (for example):

`https://czarwallace.bubbleapps.lo/version-test`

Click **Clone Website** to create a local snapshot.

> Note: Some dynamic platforms (including many Bubble pages) may not fully clone as static files due to runtime rendering and access rules.

## 4) Push to GitHub

From the `project-manager` folder:

```bash
git init
git add .
git commit -m "Initial project manager with cloning"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 5) Make it public (Render)

This app has backend + SQLite, so use Render (not GitHub Pages).

1. Go to `https://render.com` and sign in with GitHub.
2. Click **New +** → **Blueprint**.
3. Select repo: `Laju11/Dspm`.
4. Render will detect `render.yaml` and create the web service.
5. Click **Apply** / **Deploy**.
6. After deploy finishes, open your public URL:

`https://dspm-project-manager.onrender.com`

If the exact subdomain is unavailable, Render will assign a close name and show the final live URL in the dashboard.

## 6) Option B: Host on GitHub Pages (static)

This option runs fully on GitHub Pages and uses Supabase as the cloud database.

### A. Configure Supabase

1. Create a new Supabase project.
2. Open SQL Editor and run: `docs/supabase.sql`
3. In Supabase, go to **Project Settings** → **API** and copy:
	- Project URL
	- Anon public key

### B. Publish on GitHub Pages

1. Push latest code to `main` (already done).
2. In GitHub repo, open **Settings** → **Pages**.
3. Under **Build and deployment**, choose:
	- Source: **Deploy from a branch**
	- Branch: **main**
	- Folder: **/docs**
4. Save and wait for deployment.

Your public page will be:

`https://laju11.github.io/Dspm/`

On first open, enter your Supabase URL and anon key in the UI to connect database.

### Pages app files

- `docs/index.html`
- `docs/styles.css`
- `docs/app.js`
- `docs/supabase.sql`

## API Endpoints

- `GET /api/projects`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/clone`
