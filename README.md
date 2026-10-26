# Job Watcher

An automated job scraper and mobile-friendly Android dashboard (APK) specifically configured for [TechnicAtome's Job Board](https://www.technicatome.com/nous-rejoindre/nos-offres-demploi/).

It periodically scrapes the job board using GitHub Actions, detects new postings, sends Telegram alerts to multiple users, and lets you view the feed on an Android application with built-in filters.

## 🚀 Architecture

1. **The Watcher (Backend & Automation):**
   - A Node.js TypeScript script (`scripts/scraper.ts`) runs every 2 hours via a GitHub Actions workflow (`.github/workflows/scraper.yml`).
   - It scrapes the TechnicAtome job board website, finds job postings, and compares them with the historical data saved in `data/jobs.json`.
   - If new jobs are found, it sends a Telegram alert to a configured list of users and commits the updated `jobs.json` to the repository.

2. **The Dashboard (Frontend & APK):**
   - A React (Vite) frontend with Tailwind CSS designed for mobile devices.
   - It directly fetches the `jobs.json` file from your GitHub repository (via `raw.githubusercontent.com`), meaning you don't need a dedicated backend server for the mobile app!
   - Built into an Android APK using Capacitor via another GitHub Actions workflow (`.github/workflows/apk_builder.yml`).

## ⚙️ Setup & Configuration

### 1. Repository Setup

1. Fork or Clone this repository.
2. Ensure GitHub Actions has permission to read/write contents:
   - Go to your repository **Settings** -> **Actions** -> **General**.
   - Under **Workflow permissions**, select **Read and write permissions**.

### 2. Setting Up Telegram Notifications for Multiple Users

To send alerts to yourself and your friends, you need a Telegram Bot and the Chat IDs for everyone who wants to receive notifications.

**Step A: Create the Bot**
1. Open Telegram and search for `@BotFather`.
2. Send the command `/newbot` and follow the instructions to create your bot.
3. BotFather will give you a **Bot Token** (e.g., `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`). Save this.

**Step B: Get Chat IDs for You and Your Friends**
Each user must do the following to get their unique Chat ID:
1. Open Telegram and search for the bot you just created.
2. Click **Start** to initiate a conversation with the bot (this is required so the bot is allowed to message them).
3. Search for the `@userinfobot` on Telegram and click **Start**. It will reply with an `Id` number (e.g., `987654321`).
4. Collect the IDs from all your friends.

**Step C: Add GitHub Secrets**
Go to your GitHub repository **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:

1. **Secret Name:** `TARGET_URL`
   - **Secret Value:** `https://www.technicatome.com/nous-rejoindre/nos-offres-demploi/`
2. **Secret Name:** `TELEGRAM_BOT_TOKEN`
   - **Secret Value:** *(The token you got from BotFather)*
3. **Secret Name:** `TELEGRAM_CHAT_IDS`
   - **Secret Value:** *(A comma-separated list of Chat IDs, e.g., `111111111,222222222,333333333`)*

### 3. Configure the App Data URL

In `frontend/src/App.tsx`, update the `DATA_URL` to point to your repository's raw `jobs.json` file:

```typescript
const DATA_URL = "https://raw.githubusercontent.com/<YOUR-USERNAME>/<YOUR-REPO>/main/data/jobs.json";
```

*(Note: If your repository is private, you will need to host this JSON file somewhere accessible, or pass a GitHub personal access token in the headers.)*

## 📱 Getting the Android APK

1. Make sure you update the `DATA_URL` and push the changes to `main`.
2. The `Build and Release Android APK` GitHub Action will run automatically.
3. Once the workflow completes, go to the Actions tab, click the latest run, and scroll down to the **Artifacts** section to download `app-debug.apk`.
4. Send the `app-debug.apk` file to your Android phone (and your friends' phones), enable installing from unknown sources, and install it.

## 💻 Running Locally for Development

1. Install root dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   *Fill in your target URL, Bot Token, and Chat IDs.*

3. Run the scraper manually:
   ```bash
   npx ts-node scripts/scraper.ts
   ```

4. Run the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev &
   ```
