import React, { useState, useEffect, useMemo } from 'react';

// Structure normalisée d'une offre d'emploi
export interface Job {
  id: string;
  title: string;
  company?: string;
  location?: string;
  contract?: string;
  contractType?: string;
  department?: string;
  link?: string;
  url?: string;
  date?: string;
  publishedDate?: string;
  discovered_at?: string;
}

const STORAGE_KEY_SEEN = 'ta_jobs_seen_ids_v1';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [keyword, setKeyword] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedContract, setSelectedContract] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [showOnlyNew, setShowOnlyNew] = useState(false);

  // Identifiants des offres déjà vues
  const [seenIds, setSeenIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SEEN);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Chargement des données jobs.json
  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        setError(null);
        let data: any = null;
        try {
          const res = await fetch('./jobs.json', { cache: 'no-cache' });
          if (res.ok) {
            data = await res.json();
          }
        } catch (e) {
          console.warn('Local jobs.json fetch failed, trying fallback...', e);
        }

        if (!data) {
          const fallbackRes = await fetch(
            'https://raw.githubusercontent.com/heyhacene/Technicajob/main/frontend/public/jobs.json'
          );
          if (fallbackRes.ok) {
            data = await fallbackRes.json();
          } else {
            throw new Error(`Erreur HTTP: ${fallbackRes.status}`);
          }
        }

        let rawList: any[] = [];
        if (Array.isArray(data)) {
          rawList = data;
        } else if (data && typeof data === 'object') {
          // Gère le cas où jobs.json est un dictionnaire indexé par ID
          rawList = Object.values(data);
        }

        // Normalisation des champs pour compatibilité totale
        const normalized: Job[] = rawList.map((item: any) => {
          const loc = item.location || item.site || '';
          const contract = item.contract || item.contractType || '';
          const dept =
            item.department ||
            item.domain ||
            item.service ||
            (loc.includes('Saclay') ? 'Ingénierie & Études' : 'Opérations & Projets');

          return {
            id: String(item.id || item.link || Math.random()),
            title: item.title || 'Offre sans titre',
            company: item.company || 'TechnicAtome',
            location: loc,
            contract: contract,
            contractType: contract,
            department: dept,
            link: item.link || item.url || '#',
            url: item.url || item.link || '#',
            date: item.date || item.publishedDate || 'Récemment',
            publishedDate: item.publishedDate || item.date || 'Récemment',
            discovered_at: item.discovered_at,
          };
        });

        setJobs(normalized);
      } catch (err: any) {
        setError(err.message || 'Impossible de récupérer les offres.');
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  // Persistance localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(seenIds));
    } catch (e) {
      console.error('Erreur sauvegarde localStorage:', e);
    }
  }, [seenIds]);

  // Options déduites pour les listes déroulantes
  const locations = useMemo(() => {
    const set = new Set(jobs.map((j) => j.location).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const contracts = useMemo(() => {
    const set = new Set(jobs.map((j) => j.contractType).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const departments = useMemo(() => {
    const set = new Set(jobs.map((j) => j.department).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  // Actions de marquage
  const markAsSeen = (id: string) => {
    if (!seenIds.includes(id)) {
      setSeenIds((prev) => [...prev, id]);
    }
  };

  const markAllAsSeen = () => {
    const allCurrentIds = jobs.map((j) => j.id);
    const merged = Array.from(new Set([...seenIds, ...allCurrentIds]));
    setSeenIds(merged);
  };

  // Filtrage combiné
  const filteredJobs = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return jobs.filter((job) => {
      const isUnread = !seenIds.includes(job.id);

      if (showOnlyNew && !isUnread) return false;
      if (selectedLocation !== 'ALL' && job.location !== selectedLocation) return false;
      if (selectedContract !== 'ALL' && job.contractType !== selectedContract) return false;
      if (selectedDepartment !== 'ALL' && job.department !== selectedDepartment) return false;

      if (q) {
        const titleMatch = job.title?.toLowerCase().includes(q);
        const locMatch = job.location?.toLowerCase().includes(q);
        const deptMatch = job.department?.toLowerCase().includes(q);
        return titleMatch || locMatch || deptMatch;
      }

      return true;
    });
  }, [jobs, keyword, selectedLocation, selectedContract, selectedDepartment, showOnlyNew, seenIds]);

  const unreadCount = useMemo(() => {
    return jobs.filter((job) => !seenIds.includes(job.id)).length;
  }, [jobs, seenIds]);

  return (
    <div style={styles.container}>
      {/* En-tête de l'application */}
      <header style={styles.header}>
        <h1 style={styles.appTitle}>Veille Offres TechnicAtome</h1>
        <p style={styles.subtitle}>Suivi en temps réel des opportunités de recrutement</p>

        {/* Bannière compteur de nouveautés non lues */}
        <div style={styles.banner}>
          <div style={styles.bannerInfo}>
            <span style={styles.bannerIcon}>🔔</span>
            <span>
              <strong>{unreadCount}</strong> nouvelle(s) offre(s) non lue(s) sur{' '}
              <strong>{jobs.length}</strong> disponibles
            </span>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsSeen} style={styles.markAllBtn}>
              Tout marquer comme lu
            </button>
          )}
        </div>
      </header>

      {/* Barre de filtres de recherche */}
      <section style={styles.filtersCard}>
        <div style={styles.searchRow}>
          <input
            type="text"
            placeholder="Rechercher par mot-clé (ex: sûreté, mécanique, chef de projet...)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={styles.inputSearch}
          />
        </div>

        <div style={styles.dropdownGrid}>
          <div>
            <label style={styles.filterLabel}>Localisation</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={styles.select}
            >
              <option value="ALL">Toutes les localisations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.filterLabel}>Type de contrat</label>
            <select
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              style={styles.select}
            >
              <option value="ALL">Tous les contrats</option>
              {contracts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.filterLabel}>Département / Domaine</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={styles.select}
            >
              <option value="ALL">Tous les départements</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.quickOptionsRow}>
          <label style={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={showOnlyNew}
              onChange={(e) => setShowOnlyNew(e.target.checked)}
            />
            <span>Afficher uniquement les nouvelles offres non lues</span>
          </label>
          <span style={styles.resultCount}>
            {filteredJobs.length} résultat(s) affiché(s)
          </span>
        </div>
      </section>

      {/* Messages d'état */}
      {loading && <div style={styles.stateNotice}>Chargement des offres en cours...</div>}
      {error && <div style={{ ...styles.stateNotice, color: '#dc2626' }}>{error}</div>}

      {/* Liste des offres */}
      {!loading && !error && (
        <main style={styles.jobList}>
          {filteredJobs.length === 0 ? (
            <div style={styles.stateNotice}>
              Aucune offre ne correspond aux critères sélectionnés.
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isUnread = !seenIds.includes(job.id);

              return (
                <article
                  key={job.id}
                  style={{
                    ...styles.jobCard,
                    borderColor: isUnread ? '#0284c7' : '#e2e8f0',
                    backgroundColor: isUnread ? '#f0f9ff' : '#ffffff',
                  }}
                  onClick={() => markAsSeen(job.id)}
                >
                  <div style={styles.jobHeader}>
                    <div style={styles.tagsContainer}>
                      {isUnread && <span style={styles.badgeNew}>NOUVELLE</span>}
                      {job.contractType && (
                        <span style={styles.tag}>{job.contractType}</span>
                      )}
                      {job.location && <span style={styles.tag}>{job.location}</span>}
                      {job.department && (
                        <span style={{ ...styles.tag, backgroundColor: '#f1f5f9' }}>
                          {job.department}
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 style={styles.jobTitle}>{job.title}</h2>

                  <div style={styles.jobFooter}>
                    <span style={styles.jobDate}>
                      {job.date ? `Publié : ${job.date}` : `Société : ${job.company}`}
                    </span>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.viewOfferBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsSeen(job.id);
                      }}
                    >
                      Consulter l'offre &rarr;
                    </a>
                  </div>
                </article>
              );
            })
          )}
        </main>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '780px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1e293b',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    marginBottom: '16px',
  },
  appTitle: {
    margin: '0 0 4px 0',
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 14px 0',
    fontSize: '0.9rem',
    color: '#64748b',
    textAlign: 'center',
  },
  banner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '12px 16px',
  },
  bannerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    color: '#1e40af',
  },
  bannerIcon: {
    fontSize: '1.2rem',
  },
  markAllBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '7px 14px',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  filtersCard: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  searchRow: {
    width: '100%',
  },
  inputSearch: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  dropdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '10px',
  },
  filterLabel: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#475569',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '0.88rem',
    color: '#334155',
    outline: 'none',
  },
  quickOptionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    paddingTop: '6px',
    borderTop: '1px solid #f1f5f9',
  },
  checkboxOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.88rem',
    cursor: 'pointer',
    color: '#334155',
    userSelect: 'none',
  },
  resultCount: {
    fontSize: '0.82rem',
    color: '#64748b',
    fontWeight: '500',
  },
  jobList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  jobCard: {
    padding: '16px',
    borderRadius: '10px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  jobHeader: {
    marginBottom: '8px',
  },
  tagsContainer: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  badgeNew: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '0.7rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
  },
  tag: {
    backgroundColor: '#e2e8f0',
    color: '#334155',
    fontSize: '0.75rem',
    fontWeight: '500',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  jobTitle: {
    margin: '4px 0 12px 0',
    fontSize: '1.08rem',
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: '1.35',
  },
  jobFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },
  jobDate: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
  viewOfferBtn: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
  stateNotice: {
    textAlign: 'center',
    padding: '32px 16px',
    color: '#64748b',
    fontSize: '0.95rem',
  },
};
