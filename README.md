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

## API Endpoints

- `GET /api/projects`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/clone`
