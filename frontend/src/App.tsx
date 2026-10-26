import { useState, useEffect, useMemo } from 'react'

interface JobOffer {
    id: string;
    title: string;
    company: string;
    location: string;
    contract: string;
    link: string;
    date: string;
    discovered_at: string;
    read?: boolean;
}

const DATA_URL = "https://raw.githubusercontent.com/your-username/your-repo/main/data/jobs.json";

function App() {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<string>('');

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();

      const jobsArray = Object.values(data) as JobOffer[];
      jobsArray.sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime());

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

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (selectedLocation && job.location !== selectedLocation) return false;
      if (selectedContract && job.contract !== selectedContract) return false;
      return true;
    });
  }, [jobs, selectedLocation, selectedContract]);

  const uniqueLocations = useMemo(() => Array.from(new Set(jobs.map(j => j.location).filter(Boolean))), [jobs]);
  const uniqueContracts = useMemo(() => Array.from(new Set(jobs.map(j => j.contract).filter(Boolean))), [jobs]);

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto bg-gray-50 pb-20">
      <header className="mb-4 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Job Watcher</h1>
        <button
          onClick={fetchJobs}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </header>

      {/* Filters */}
      <div className="mb-6 space-y-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Filters</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="flex-1 min-w-[120px] bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
          >
            <option value="">All Locations</option>
            <option value="Aix-en-Provence">Aix-en-Provence</option>
            <option value="Bordeaux">Bordeaux</option>
            <option value="Cadarache">Cadarache</option>
            <option value="Cherbourg">Cherbourg</option>
            <option value="Saclay">Saclay</option>
            <option value="Toulon">Toulon</option>
            {uniqueLocations.filter(l => !['Aix-en-Provence', 'Bordeaux', 'Cadarache', 'Cherbourg', 'Saclay', 'Toulon'].includes(l)).map(loc => (
               <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <select
            value={selectedContract}
            onChange={(e) => setSelectedContract(e.target.value)}
            className="flex-1 min-w-[120px] bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
          >
            <option value="">All Contracts</option>
            <option value="CDI">CDI</option>
            <option value="Stage">Stage</option>
            {uniqueContracts.filter(c => !['CDI', 'Stage'].includes(c)).map(contract => (
               <option key={contract} value={contract}>{contract}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-500">Loading jobs...</div>}

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm text-center border border-red-100">
          {error}
        </div>
      )}

      {!loading && !error && filteredJobs.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>No jobs found.</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredJobs.map(job => (
          <div
            key={job.id}
            className={`bg-white p-5 rounded-xl shadow-sm border-l-4 transition-all ${job.read ? 'border-gray-200 opacity-75' : 'border-blue-500 ring-1 ring-blue-50'}`}
          >
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-lg font-bold text-gray-800 line-clamp-2 leading-tight">
                {job.title}
              </h2>
              {!job.read && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-bold ml-3 shrink-0">
                  New
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
               {job.contract && (
                 <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                    {job.contract}
                 </span>
               )}
               {job.location && (
                 <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    {job.location}
                 </span>
               )}
               {job.date && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {job.date}
                 </span>
               )}
            </div>

            <div className="flex gap-2">
              <a
                href={job.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markAsRead(job.id)}
                className="flex-1 bg-gray-900 text-white text-center py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
              >
                View & Apply
              </a>
              {!job.read && (
                <button
                  onClick={() => markAsRead(job.id)}
                  className="bg-white text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 border border-gray-200 transition-colors shadow-sm"
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
