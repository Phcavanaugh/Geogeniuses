# Good Globe Game — setup

Setup takes about 20 minutes, in two parts. First you create the Google Sheet that holds names and scores. Then you put the game online with GitHub Pages.

Before you start, unzip `good-globe-game.zip` somewhere easy to find, like your Desktop.

---

## Part 1 — The Google Sheet (scores and player names)

1. Go to **sheets.google.com** and create a blank spreadsheet. Name it **Good Globe Game**.
2. In the menu, click **Extensions → Apps Script**. A code editor opens in a new tab.
3. Delete everything in the editor. Open `apps-script/Code.gs` from the unzipped folder in any text editor, copy all of it, and paste it into the Apps Script editor. Click the **Save** icon.
4. In the toolbar dropdown next to **Run**, choose **setup**, then click **Run**.
   - Google will ask for permission. Click **Review permissions**, choose your account, then **Advanced → Go to Good Globe Game (unsafe)** → **Allow**. The "unsafe" warning appears because this is your own script and Google hasn't reviewed it. It only touches this spreadsheet.
5. Go back to the spreadsheet tab. You'll see two new tabs:
   - **Players**: type each family member's name in column A, under "Name". It starts with just "Pete". The buttons in the game show these names exactly as you type them. You can add people any time.
   - **Scores**: the game fills this in. Leave it alone.
6. Back in Apps Script, click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Click **Deploy**, then copy the **Web app URL**. It ends in `/exec`.
7. Open `config.js` from the unzipped folder in a text editor and paste that URL between the quotes on the `GGG_API_URL` line:
   ```js
   window.GGG_API_URL = "https://script.google.com/macros/s/XXXX/exec";
   ```
   The `GGG_START_DATE` line is Day 1 and is set to **2026-09-28**, a Monday. Change it if you want to launch on a different day. Save the file.

## Part 2 — Put the game online (GitHub Pages, free)

1. Create an account at **github.com**. Your username will be part of the game's web address.
2. Click **+ → New repository** in the top right.
   - Repository name: **good-globe-game**
   - Choose **Public** (required for free hosting)
   - Click **Create repository**
3. On the new repository's page, click **uploading an existing file**.
4. Open the unzipped folder, select **everything inside it** (the files and the `data`, `vendor` and `apps-script` folders), and drag it all onto the upload area. Drag the contents, not the folder itself. Click **Commit changes**.
5. Go to **Settings → Pages**. Under "Build and deployment", set **Source: Deploy from a branch** and **Branch: main / (root)**, then click **Save**.
6. Wait a minute or two, then refresh the page. It will show your link:
   **https://YOUR-USERNAME.github.io/good-globe-game/**
7. Open the link on your phone, tap your name, and play. Then send the link to the family.

---

## Good to know

- **Adding a player:** type their name in the Players tab. It shows up the next time the game loads.
- **Renaming a player:** don't, unless you also change their name in the Scores tab. Scores are matched by name.
- **Changing config.js later:** on GitHub, open the file, click the pencil icon, edit, and commit. The site updates in about a minute.
- **Changing the Apps Script later:** after saving, go to **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The URL stays the same.
- **Demo mode:** if `GGG_API_URL` is empty, the game still works, but scores stay on that one device. A yellow bar at the bottom says so.
- **Satellite imagery** comes from NASA's free Blue Marble service and loads as you zoom. If NASA's server is ever slow, a built-in lower-detail copy shows instead.
- **Honor system:** anyone with the link could technically pick someone else's name. Only the first play of the day counts, and scores can only be submitted for today.
- **The question bank** is in `questions.json` and covers 90 days from the start date. When it's time for more, send me the file and I'll extend it.
