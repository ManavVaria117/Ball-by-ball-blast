# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2ff55932-aa12-4a96-9455-4925bd63e06b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2ff55932-aa12-4a96-9455-4925bd63e06b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2ff55932-aa12-4a96-9455-4925bd63e06b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Deploying the backend on Render

The app now includes a Node/Express backend under `server/` that uses MongoDB for persistence.

1) Prepare environment variables

- `MONGODB_URI`: your MongoDB connection string
- `CORS_ORIGIN`: the origin allowed to call the API (e.g. `http://localhost:5173` for dev or your frontend URL in prod)

2) Create a Web Service on Render

- Repository: this repo
- Root Directory: `server`
- Runtime: Node 18+
- Build Command: `npm ci && npm run build`
- Start Command: `npm run start`
- Environment Variables:
  - `MONGODB_URI=...`
  - `CORS_ORIGIN=https://your-frontend-domain` (or `http://localhost:5173` for local testing)

When deployed, you will get a URL like `https://your-backend.onrender.com`.

3) Point the frontend to the deployed API

Create a `.env` file at the project root (or set in your hosting provider) with:

```
VITE_API_BASE_URL=https://your-backend.onrender.com
```

Then run the frontend as usual (`npm run dev`) or deploy it to your hosting provider. The app will call the deployed backend.

## Deploying the frontend on Vercel

1) Import the repo in Vercel

- Framework preset: Vite
- Root directory: project root (where `vite.config.ts` is)
- Build Command: `npm run build`
- Output Directory: `dist`

2) Environment variables

- `VITE_API_BASE_URL=https://your-backend.onrender.com`

3) Build and deploy

- Vercel will build and deploy automatically after you add the env var.

If you later change the backend URL, update the env var in Vercel and redeploy.