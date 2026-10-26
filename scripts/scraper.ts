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
    contract: string;
    link: string;
    date: string;
    discovered_at: string;
}

const DATA_FILE = path.join(__dirname, '../data/jobs.json');
const TARGET_URL = process.env.TARGET_URL || 'https://www.technicatome.com/nous-rejoindre/nos-offres-demploi/';

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

        $('.job-board__item').each((index, element) => {
            const dataAttrs = $(element).data();

            const id = dataAttrs['jobId'] ? String(dataAttrs['jobId']) : '';
            const title = dataAttrs['title'] ? String(dataAttrs['title']) : $(element).find('.job-board__item-title').text().trim();
            const contract = dataAttrs['contract'] ? String(dataAttrs['contract']) : $(element).find('.job-board__tag--contract').text().trim();
            let location = dataAttrs['site'] ? String(dataAttrs['site']) : $(element).find('.job-board__tag--location').text().trim();
            // Clean up location text like "Aix-en-Provence, fr"
            location = location.replace(/,\s*fr$/i, '');

            let link = dataAttrs['url'] ? String(dataAttrs['url']) : '';
            if (!link) {
                const popupContent = $(element).find('.job-board__item-popup-content').html();
                if(popupContent) {
                    const popup$ = cheerio.load(popupContent);
                    link = popup$('.job-board-modal__cta').attr('href') || '';
                }
            }

            const scrapedDate = dataAttrs['date'] ? String(dataAttrs['date']) : $(element).find('.job-board__date').text().trim();

            if (title && link && id) {
                jobs.push({
                    id,
                    title,
                    company: 'TechnicAtome',
                    location,
                    contract,
                    link,
                    date: scrapedDate, // the relative date text (e.g. "Il y a 2 j.")
                    discovered_at: new Date().toISOString()
                });
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

if (require.main === module) {
    runScraper().catch(console.error);
}
