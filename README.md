# 18-Draw Scoreboard (local app)

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
18-Draw Scoreboard is running.
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

## Deploying online with data that actually survives (Render + MongoDB Atlas)

If you host this on Render's free tier (or most free hosts), the local
`data.json` file gets wiped every time the service redeploys, restarts, or
wakes up from being asleep — that's a limitation of free-tier hosting, not
this app. The fix: keep the app's compute on Render (fine, since it doesn't
need to remember anything itself) and point the actual data at a database
that lives somewhere else and persists on its own. **MongoDB Atlas's free
tier is a good fit** — it's free forever, doesn't sleep, and doesn't expire.

The app already supports this automatically: set a `MONGODB_URI` environment
variable and it switches from the local file to Atlas. No `MONGODB_URI` set
(e.g. running on your own laptop) → it keeps using `data.json` exactly as
before.

**One-time setup (~10 minutes):**

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free cluster: choose the **M0 Free** tier, any cloud provider/region.
3. Under **Database Access**, create a database user with a username and password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) — needed
   since Render's servers don't have a fixed IP on the free tier.
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/`
   Replace `<username>` and `<password>` with the ones from step 3.
6. In Render, open your web service → **Environment** → add an environment
   variable:
   - Key: `MONGODB_URI`
   - Value: the connection string from step 5
7. Redeploy. The startup logs will now say `Data storage: MongoDB Atlas`.

From then on, scores survive redeploys, restarts, and the free tier going to
sleep — because they're no longer stored on the ephemeral container at all.

## Starting over

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