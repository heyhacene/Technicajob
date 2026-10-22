# Job Watcher

An automated job scraper and mobile-friendly Android dashboard (APK). It periodically scrapes a target job board using GitHub Actions, detects new postings, sends Telegram alerts, and lets you view the feed on an Android application.

## 🚀 Architecture

1. **The Watcher (Backend & Automation):**
   - A Node.js TypeScript script (`scripts/scraper.ts`) runs periodically via a GitHub Actions workflow (`.github/workflows/scraper.yml`).
   - It scrapes a target job board website, finds job postings using Cheerio, and compares them with the historical data saved in `data/jobs.json`.
   - If new jobs are found, it sends a Telegram alert and commits the updated `jobs.json` to the repository.

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

### 2. Environment Variables & Secrets

You need to set up the following [Repository Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) for the GitHub Actions scraper:

- `TARGET_URL`: The URL of the job board you want to scrape (e.g., `https://example-job-board.com/jobs?q=engineer`).
- `TELEGRAM_BOT_TOKEN`: The token for your Telegram Bot (created via [@BotFather](https://t.me/botfather)).
- `TELEGRAM_CHAT_ID`: Your personal Telegram chat ID (can be found via [@userinfobot](https://t.me/userinfobot)).

### 3. Customize the Scraper

The target job board might have a different HTML structure. You must adapt the Cheerio CSS selectors inside `scripts/scraper.ts`:

```typescript
// scripts/scraper.ts -> scrapeJobs() function
$('.job-card-selector').each((index, element) => {
    const title = $(element).find('.title-selector').text().trim();
    const company = $(element).find('.company-selector').text().trim();
    // ...
```

### 4. Configure the App Data URL

In `frontend/src/App.tsx`, update the `DATA_URL` to point to your repository's raw `jobs.json` file:

```typescript
const DATA_URL = "https://raw.githubusercontent.com/<YOUR-USERNAME>/<YOUR-REPO>/main/data/jobs.json";
```

*(Note: If your repository is private, you will need to host this JSON file somewhere accessible, or pass a GitHub personal access token in the headers.)*

## 📱 Getting the Android APK

1. Make sure you update the `DATA_URL` and push the changes to `main`.
2. The `Build and Release Android APK` GitHub Action will run automatically.
3. Once the workflow completes, go to the Actions tab, click the latest run, and scroll down to the **Artifacts** section to download `app-debug.apk`.
4. Transfer the APK to your Android phone, enable installing from unknown sources, and install it.

## 💻 Running Locally for Development

1. Install root dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   *Fill in your target URL and Telegram credentials.*

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
