import { useState, useEffect } from 'react'

interface JobOffer {
    id: string;
    title: string;
    company: string;
    location: string;
    link: string;
    date: string;
    read?: boolean;
}

// Since the data is in the repo, we can fetch the raw file from GitHub.
// In a real scenario, this URL would be updated with the actual raw github content URL.
const DATA_URL = "https://raw.githubusercontent.com/your-username/your-repo/main/data/jobs.json";

function App() {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      // In development, you might just import the local file, but for the APK we fetch from GH.
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();

      const jobsArray = Object.values(data) as JobOffer[];
      // Sort by newest
      jobsArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setJobs(jobsArray);
    } catch (err: any) {
      setError(err.message || 'Error fetching jobs data. Make sure DATA_URL is set.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const markAsRead = (id: string) => {
    setJobs(jobs.map(job => job.id === id ? { ...job, read: true } : job));
  };

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <header className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Job Watcher</h1>
        <button
          onClick={fetchJobs}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </header>

      {loading && <div className="text-center py-8 text-gray-500">Loading jobs...</div>}

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm text-center">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No jobs found.
        </div>
      )}

      <div className="space-y-4">
        {jobs.map(job => (
          <div
            key={job.id}
            className={`bg-white p-5 rounded-2xl shadow-sm border-l-4 transition-all ${job.read ? 'border-gray-200 opacity-70' : 'border-blue-500'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-800 line-clamp-2 leading-tight">
                {job.title}
              </h2>
              {!job.read && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium ml-2 shrink-0">
                  New
                </span>
              )}
            </div>

            <div className="text-gray-600 text-sm mb-4 space-y-1">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                {job.company}
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                {job.location}
              </div>
              <div className="flex items-center text-xs text-gray-400 mt-2">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {new Date(job.date).toLocaleDateString()}
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={job.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markAsRead(job.id)}
                className="flex-1 bg-gray-900 text-white text-center py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                View & Apply
              </a>
              {!job.read && (
                <button
                  onClick={() => markAsRead(job.id)}
                  className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Mark Read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
