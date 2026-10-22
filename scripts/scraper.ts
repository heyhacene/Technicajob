import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { sendTelegramAlert } from './notifier';

interface JobOffer {
    id: string;
    title: string;
    company: string;
    location: string;
    link: string;
    date: string;
}

const DATA_FILE = path.join(__dirname, '../data/jobs.json');
const TARGET_URL = process.env.TARGET_URL || 'https://example-job-board.com/jobs?q=engineer'; // Replace with real URL

function loadHistory(): Record<string, JobOffer> {
    if (!fs.existsSync(DATA_FILE)) {
        return {};
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

function saveHistory(history: Record<string, JobOffer>) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

async function scrapeJobs(): Promise<JobOffer[]> {
    try {
        console.log(`Fetching jobs from: ${TARGET_URL}`);
        const response = await axios.get(TARGET_URL);
        const $ = cheerio.load(response.data);
        const jobs: JobOffer[] = [];

        // Modify these selectors based on the target website's structure
        $('.job-card-selector').each((index, element) => { // Replace selector
            const title = $(element).find('.title-selector').text().trim(); // Replace selector
            const company = $(element).find('.company-selector').text().trim(); // Replace selector
            const location = $(element).find('.location-selector').text().trim(); // Replace selector
            const relativeLink = $(element).find('a').attr('href') || '';
            const link = relativeLink.startsWith('http') ? relativeLink : new URL(relativeLink, TARGET_URL).toString();

            // Generate a unique ID (e.g., from the URL or a specific ID attribute)
            const id = link.split('/').pop() || `job-${index}`;
            const date = new Date().toISOString();

            if (title && link) {
                jobs.push({ id, title, company, location, link, date });
            }
        });

        return jobs;
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return [];
    }
}

export async function runScraper() {
    console.log('Starting scraper...');
    const history = loadHistory();
    const currentJobs = await scrapeJobs();

    let newJobsFound = 0;

    for (const job of currentJobs) {
        if (!history[job.id]) {
            console.log(`New Job Found: ${job.title} at ${job.company}`);
            history[job.id] = job;
            newJobsFound++;
            await sendTelegramAlert(job);
        }
    }

    if (newJobsFound > 0) {
        saveHistory(history);
        console.log(`Saved ${newJobsFound} new jobs to history.`);
    } else {
        console.log('No new jobs found.');
    }
}

// Allow running directly
if (require.main === module) {
    runScraper().catch(console.error);
}
