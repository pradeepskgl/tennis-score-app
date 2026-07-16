# AO Tennis Tournament: Score Board (local app)

A live tennis-tournament scoreboard you run on your own computer. No installs,
no accounts, no external services — just Node.js and two files.

## What you need

- [Node.js](https://nodejs.org) installed (any recent version, 14+). That's it —
  no `npm install` step, no dependencies.

## Folder layout

```
tennis-tracker/
  server.js          <- the local server
  public/
    index.html        <- the whole app (UI + scoring engine)
  data.json           <- created automatically the first time you save — this
                         file IS your tournament data
```

Keep `server.js` and the `public` folder together, in the same parent folder,
exactly as they are.

## Run it

Open a terminal in the `tennis-tracker` folder and run:

```
node server.js
```

You'll see:

```
AO Tennis Tournament: Score Board is running.
On this computer:   http://localhost:3000
On your network:    http://<this-computer-ip>:3000
```

Open `http://localhost:3000` in your browser. Leave the terminal window open
while you use the app — closing it stops the server.

## Using it during the tournament

- **First launch**: enter all 18 names and set an organizer PIN. This creates
  the bracket.
- **Scoring**: tap "Organizer unlock", enter the PIN, open a match, and tap
  the "Point" buttons as points are played. There's an "Undo last point" if
  you tap the wrong one.
- **Spectators**: anyone on the same Wi-Fi can open
  `http://<this-computer-ip>:3000` in their own phone/laptop browser and watch
  the bracket update live — read-only, no PIN needed. Find `<this-computer-ip>`
  from the terminal output, or run `ipconfig` (Windows) / `ifconfig` or `ip a`
  (Mac/Linux) and look for your local network address (usually starts with
  `192.168.` or `10.`).
- **Data persistence**: every score is written to `data.json` next to
  `server.js`. It survives restarts, refreshes, and closing the browser.
  Back that file up if you want a permanent record after the tournament, and
  don't delete it mid-tournament.
- **Organizer unlock** is remembered per device/browser (via that browser's own
  local storage), so you won't need to re-enter the PIN every time you refresh
  on your own laptop or phone — but a fresh device will need the PIN.

## Rules implemented

- **Play-In, Round of 16, Quarterfinals** — Fast4, no-ad: race to 4 games,
  sudden-death point at 40-40, 5-point breaker at 3-3, 10-point match
  tie-break (win by 2) if sets split 1-1.
- **Semifinals, Final** — traditional ad-scoring: race to 6 games (win by 2),
  7-point breaker at 6-6, 10-point match tie-break (win by 2) if sets split 1-1.
- Winners automatically advance into the next round's bracket slot.

## Deploying online with data that actually survives

Free-tier compute (Render, Northflank, or almost anywhere else) can restart,
redeploy, or sleep and wake at any time. To make sure your tournament data
survives that, the app stores data in **MongoDB Atlas** (free forever, never
sleeps, never expires) instead of relying on local disk, whenever a
`MONGODB_URI` environment variable is set. No `MONGODB_URI` set (e.g. running
on your own laptop) → it keeps using `data.json` exactly as before. Nothing
else about the app changes based on where it's hosted.

### Step 1 — set up the free MongoDB Atlas database (~10 minutes, one-time)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free cluster: choose the **M0 Free** tier, any cloud provider/region.
3. Under **Database Access**, create a database user with a username and password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) — needed
   since your host's servers don't have a fixed IP on free tiers.
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/`
   Replace `<username>` and `<password>` with the ones from step 3. Save this
   somewhere — you'll paste it into Northflank in step 2 below.

### Step 2 — deploy to Northflank (recommended host)

Northflank's free "Developer Sandbox" tier runs services with **always-on
compute — no forced sleep**, unlike Render's free tier. That means no
30–60 second wake-up delay for the first visitor after idle time.

1. **Put the project in a GitHub repository.** If it isn't already:
   ```
   git init
   git add .
   git commit -m "Tennis tournament scoreboard"
   ```
   Then create a new empty repo on https://github.com/new and push:
   ```
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. Go to https://northflank.com and sign up (GitHub login is the fastest option).
3. Click **Create project**, give it a name (e.g. `tennis-tournament`), pick a
   region close to you, and click **Create project**.
4. Inside the project, go to the **Services** tab → **Create service**.
5. Choose **Combined service** → **Build and deploy a Git repository**.
6. Connect your GitHub account if prompted, then select your repo and the
   `main` branch.
7. Under build settings:
   - Northflank should auto-detect Node.js via buildpacks since this project
     has a `package.json` with a `start` script. If it does, leave the
     defaults — build command empty, run command `npm start`.
   - If auto-detection has trouble, switch to **Dockerfile** build mode — a
     ready-made `Dockerfile` is included in this project for exactly that
     case.
8. Set the **port** to `3000` (matches what `server.js` listens on).
9. Before finishing, open **Environment variables** and add:
   - Key: `MONGODB_URI`
   - Value: the connection string from Step 1.5 above
10. Click **Create service**. Northflank builds and deploys automatically —
    watch the build log; it takes a minute or two the first time.
11. Once it's live, Northflank gives you a public HTTPS URL (something like
    `https://your-service--your-project--xxxx.code.run`). That's what you
    share with players and spectators.
12. From now on, every `git push` to `main` automatically triggers a rebuild
    and redeploy — no need to repeat these steps.

Northflank's free Developer Sandbox tier includes 2 services and 1 database
at no cost, which is more than this app needs.

### Alternative: Render

Render also works (see its own section further down if you deployed there
already) — the only difference is Render's free tier sleeps after 15 minutes
of inactivity, so the first visitor after a gap waits ~30–60 seconds for it
to wake up. Functionally identical otherwise, since both read the same
`MONGODB_URI` variable the same way.

Railway and Fly.io are no longer good free options as of 2026 — both moved
to trial-credit or usage-based billing rather than an always-free tier.

### Starting over

- **Local file mode**: delete `data.json` and refresh the page.
- **MongoDB Atlas mode**: in Atlas, open the `tennis_tracker` database →
  `state` collection → delete the one document in it, then refresh the page.

## Troubleshooting

- **"Server unreachable" pill in the header**: the `node server.js` process
  isn't running, or you closed the terminal. Restart it.
- **Port already in use**: run `PORT=3001 node server.js` instead, then use
  that port in the browser.
- **Other devices can't connect**: they need to be on the same Wi-Fi network,
  and your computer's firewall needs to allow incoming connections on the port.
