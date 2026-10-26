import React, { useState, useEffect, useMemo } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';

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

export interface UserCriteria {
  keywords: string;
  locations: string[]; // Choix multiple pour les localisations
  contract: string;
  department: string;
  notificationsEnabled: boolean;
  checkIntervalMinutes: number;
}

const STORAGE_KEY_SEEN = 'ta_jobs_seen_ids_v2';
const STORAGE_KEY_CRITERIA = 'ta_user_alert_criteria_v2';
const STORAGE_KEY_LAST_NOTIFIED = 'ta_last_notified_job_ids_v2';

const DEFAULT_CRITERIA: UserCriteria = {
  keywords: '',
  locations: [], // Tableau vide = Toutes les localisations
  contract: 'ALL',
  department: 'ALL',
  notificationsEnabled: true,
  checkIntervalMinutes: 30,
};

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  // Critères de veille personnalisés sauvegardés
  const [criteria, setCriteria] = useState<UserCriteria>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CRITERIA);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migration rétrocompatible si l'ancien format 'location' était utilisé
        if (parsed.location && !parsed.locations) {
          parsed.locations = parsed.location === 'ALL' ? [] : [parsed.location];
        }
        return { ...DEFAULT_CRITERIA, ...parsed };
      }
      return DEFAULT_CRITERIA;
    } catch {
      return DEFAULT_CRITERIA;
    }
  });

  const [notificationPermission, setNotificationPermission] = useState<string>('prompt');
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'all'>('matches');

  // Historique des offres consultées
  const [seenIds, setSeenIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SEEN);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Historique des offres déjà notifiées
  const [notifiedIds, setNotifiedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAST_NOTIFIED);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CRITERIA, JSON.stringify(criteria));
  }, [criteria]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(seenIds));
  }, [seenIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LAST_NOTIFIED, JSON.stringify(notifiedIds));
  }, [notifiedIds]);

  // Initialisation et permission notifications Android
  useEffect(() => {
    async function initNotifications() {
      try {
        const perm = await LocalNotifications.checkPermissions();
        setNotificationPermission(perm.display);
        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          setNotificationPermission(req.display);
        }
      } catch (e) {
        console.warn('LocalNotifications non supporté :', e);
      }
    }
    initNotifications();
  }, []);

  // Déclencher une notification push
  const triggerNotificationForNewJobs = async (matchingNewJobs: Job[]) => {
    if (!criteria.notificationsEnabled || matchingNewJobs.length === 0) return;

    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') return;

      const count = matchingNewJobs.length;
      const firstJob = matchingNewJobs[0];
      const title = count === 1
        ? `🔔 Nouvelle offre : ${firstJob.title}`
        : `🔔 ${count} nouvelles offres TechnicAtome !`;

      const body = count === 1
        ? `${firstJob.location || ''} • ${firstJob.contractType || ''} (${firstJob.department || ''})`
        : `Correspondant à vos critères : ${firstJob.title} et ${count - 1} autre(s)...`;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'beep.wav',
            smallIcon: 'ic_launcher',
          },
        ],
      });

      const newNotified = Array.from(new Set([...notifiedIds, ...matchingNewJobs.map((j) => j.id)]));
      setNotifiedIds(newNotified);
    } catch (e) {
      console.warn('Erreur notification :', e);
    }
  };

  // Chargement des données
  const fetchJobsData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      let data: any = null;
      try {
        const res = await fetch('./jobs.json', { cache: 'no-cache' });
        if (res.ok) data = await res.json();
      } catch (e) {
        console.warn('Erreur fetch local jobs.json:', e);
      }

      if (!data) {
        const fallbackRes = await fetch(
          'https://raw.githubusercontent.com/heyhacene/Technicajob/main/frontend/public/jobs.json?t=' + Date.now()
        );
        if (fallbackRes.ok) data = await fallbackRes.json();
        else throw new Error(`Erreur réseau: ${fallbackRes.status}`);
      }

      let rawList: any[] = [];
      if (Array.isArray(data)) rawList = data;
      else if (data && typeof data === 'object') rawList = Object.values(data);

      const normalized: Job[] = rawList.map((item: any) => {
        const loc = (item.location || item.site || '').trim();
        const contract = (item.contract || item.contractType || '').trim();
        const dept =
          item.department ||
          item.domain ||
          (loc.toLowerCase().includes('saclay') ? 'Ingénierie & Projets' : 'Opérations');

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
      setLastChecked(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));

      // Vérifier si de nouvelles offres correspondent aux critères
      const freshMatching = normalized.filter((job) => {
        const isAlreadyNotified = notifiedIds.includes(job.id);
        const isSeen = seenIds.includes(job.id);
        if (isAlreadyNotified || isSeen) return false;
        return testJobMatchesCriteria(job, criteria);
      });

      if (freshMatching.length > 0 && notifiedIds.length > 0) {
        triggerNotificationForNewJobs(freshMatching);
      } else if (notifiedIds.length === 0 && normalized.length > 0) {
        setNotifiedIds(normalized.map((j) => j.id));
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les offres.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsData();
    const intervalMs = Math.max(criteria.checkIntervalMinutes, 5) * 60 * 1000;
    const timer = setInterval(() => fetchJobsData(true), intervalMs);
    return () => clearInterval(timer);
  }, [criteria.checkIntervalMinutes]);

  // Logique de test de correspondance avec multi-sélection des localisations
  function testJobMatchesCriteria(job: Job, crit: UserCriteria) {
    // Si des localisations sont sélectionnées, le job doit être dans l'une d'elles
    if (crit.locations && crit.locations.length > 0) {
      const matchLoc = crit.locations.some(
        (loc) => loc.toLowerCase() === (job.location || '').toLowerCase()
      );
      if (!matchLoc) return false;
    }

    if (crit.contract !== 'ALL' && job.contractType !== crit.contract) return false;
    if (crit.department !== 'ALL' && job.department !== crit.department) return false;

    if (crit.keywords && crit.keywords.trim()) {
      const words = crit.keywords.toLowerCase().split(/\s+/).filter(Boolean);
      const text = `${job.title} ${job.location} ${job.department}`.toLowerCase();
      const hasMatch = words.some((word) => text.includes(word));
      if (!hasMatch) return false;
    }

    return true;
  }

  // Toggle d'une localisation dans les critères
  const toggleLocationCriteria = (loc: string) => {
    setCriteria((prev) => {
      const current = prev.locations || [];
      const next = current.includes(loc)
        ? current.filter((l) => l !== loc)
        : [...current, loc];
      return { ...prev, locations: next };
    });
  };

  const selectAllLocations = () => {
    setCriteria((prev) => ({ ...prev, locations: [] }));
  };

  // Extraction unique des données
  const locations: string[] = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.location).filter((loc): loc is string => Boolean(loc)))).sort();
  }, [jobs]);

  const contracts: string[] = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.contractType).filter((c): c is string => Boolean(c)))).sort();
  }, [jobs]);

  const departments: string[] = useMemo(() => {
    return Array.from(new Set(jobs.map((j) => j.department).filter((d): d is string => Boolean(d)))).sort();
  }, [jobs]);

  const matchingJobs = useMemo(() => {
    return jobs.filter((j) => testJobMatchesCriteria(j, criteria));
  }, [jobs, criteria]);

  const newMatchesCount = useMemo(() => {
    return matchingJobs.filter((j) => !seenIds.includes(j.id)).length;
  }, [matchingJobs, seenIds]);

  const markJobAsSeen = (id: string) => {
    if (!seenIds.includes(id)) {
      setSeenIds((prev) => [...prev, id]);
    }
  };

  const markAllMatchesAsSeen = () => {
    const ids = matchingJobs.map((j) => j.id);
    setSeenIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const displayedJobs = activeTab === 'matches' ? matchingJobs : jobs;

  return (
    <div style={styles.container}>
      {/* En-tête */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.appTitle}>Veille TechnicAtome</h1>
            <p style={styles.subtitle}>
              Surveillance automatique des offres • Mis à jour à {lastChecked || '...'}
            </p>
          </div>
          <button
            onClick={() => setIsCriteriaOpen(!isCriteriaOpen)}
            style={{
              ...styles.criteriaBtn,
              backgroundColor: isCriteriaOpen ? '#003366' : '#004a99',
            }}
          >
            ⚙️ Mes Critères {criteria.notificationsEnabled ? '🔔' : '🔕'}
          </button>
        </div>

        {/* Panneau de configuration avec CHOIX MULTIPLE des localisations */}
        {isCriteriaOpen && (
          <div style={styles.criteriaPanel}>
            <div style={styles.criteriaPanelHeader}>
              <h3 style={styles.criteriaTitle}>🎯 Définir vos critères d'alerte</h3>
              <span style={styles.savedBadge}>✓ Sauvegarde automatique</span>
            </div>
            <p style={styles.criteriaDesc}>
              Sélectionnez une ou plusieurs localisations (ex: Aix-en-Provence ET Cadarache).
              L'application vous enverra une alerte dès qu'une offre y est publiée.
            </p>

            {/* Mots-clés */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Mots-clés recherchés (titre, spécialité)</label>
              <input
                type="text"
                placeholder="Ex: Sûreté, Mécanique, Chef de projet, Cyber..."
                value={criteria.keywords}
                onChange={(e) => setCriteria({ ...criteria, keywords: e.target.value })}
                style={styles.input}
              />
            </div>

            {/* CHOIX MULTIPLE DES LOCALISATIONS */}
            <div style={styles.formGroup}>
              <div style={styles.labelWithAction}>
                <label style={styles.label}>Localisations surveillées (Choix multiples)</label>
                <button
                  type="button"
                  onClick={selectAllLocations}
                  style={styles.textLinkBtn}
                >
                  {(!criteria.locations || criteria.locations.length === 0)
                    ? '✓ Tous les sites sélectionnés'
                    : 'Sélectionner tous les sites'}
                </button>
              </div>

              <div style={styles.pillsContainer}>
                {locations.map((loc) => {
                  const isSelected = criteria.locations && criteria.locations.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => toggleLocationCriteria(loc)}
                      style={{
                        ...styles.pillBtn,
                        backgroundColor: isSelected ? '#004a99' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : '#334155',
                        borderColor: isSelected ? '#003366' : '#cbd5e1',
                        fontWeight: isSelected ? '700' : '500',
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {loc}
                    </button>
                  );
                })}
              </div>
              <p style={styles.fieldHint}>
                {(!criteria.locations || criteria.locations.length === 0)
                  ? '🌍 Vous surveillez toutes les implantations TechnicAtome.'
                  : `📍 ${criteria.locations.length} site(s) sélectionné(s) : ${criteria.locations.join(', ')}`}
              </p>
            </div>

            {/* Contrat et Département */}
            <div style={styles.row}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Type de contrat</label>
                <select
                  value={criteria.contract}
                  onChange={(e) => setCriteria({ ...criteria, contract: e.target.value })}
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

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Département / Domaine</label>
                <select
                  value={criteria.department}
                  onChange={(e) => setCriteria({ ...criteria, department: e.target.value })}
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

            {/* Notification Toggle */}
            <div style={styles.notificationsToggleBox}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={criteria.notificationsEnabled}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setCriteria({ ...criteria, notificationsEnabled: checked });
                    if (checked) {
                      await LocalNotifications.requestPermissions();
                    }
                  }}
                />
                <strong>Recevoir une notification push lors d'une nouvelle correspondance</strong>
              </label>
              <span style={styles.notificationStatus}>
                Statut Android :{' '}
                {notificationPermission === 'granted' ? '✅ Activé' : '⚠️ Autorisation requise'}
              </span>
            </div>

            <div style={{ textAlign: 'right', marginTop: '14px' }}>
              <button
                onClick={() => {
                  setIsCriteriaOpen(false);
                  fetchJobsData();
                }}
                style={styles.closeCriteriaBtn}
              >
                Valider mes critères
              </button>
            </div>
          </div>
        )}

        {/* Résumé de veille active & bandeau alertes */}
        <div style={styles.alertBanner}>
          <div style={styles.alertBannerLeft}>
            <span style={styles.bellIcon}>🔔</span>
            <div>
              <div style={styles.alertHeadline}>
                <strong>{newMatchesCount} nouvelle(s) offre(s)</strong> correspondant à vos critères
              </div>
              <div style={styles.activeCriteriaSummary}>
                Filtre actif :{' '}
                {criteria.keywords ? `"${criteria.keywords}" • ` : ''}
                {(!criteria.locations || criteria.locations.length === 0)
                  ? 'Tous sites • '
                  : `📍 ${criteria.locations.join(' + ')} • `}
                {criteria.contract !== 'ALL' ? `${criteria.contract} • ` : 'Tous contrats • '}
                {criteria.department !== 'ALL' ? criteria.department : 'Tous départements'}
              </div>
            </div>
          </div>

          <div style={styles.bannerActions}>
            <button onClick={() => fetchJobsData(false)} style={styles.refreshBtn}>
              🔄 Actualiser
            </button>
            {newMatchesCount > 0 && (
              <button onClick={markAllMatchesAsSeen} style={styles.markSeenBtn}>
                Tout marquer comme vu
              </button>
            )}
          </div>
        </div>

        {/* Sélecteur d'onglets */}
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab('matches')}
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'matches' ? '3px solid #004a99' : '3px solid transparent',
              color: activeTab === 'matches' ? '#004a99' : '#64748b',
              fontWeight: activeTab === 'matches' ? 'bold' : 'normal',
            }}
          >
            Mes alertes ({matchingJobs.length})
            {newMatchesCount > 0 && <span style={styles.badgeCount}>{newMatchesCount}</span>}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              ...styles.tabBtn,
              borderBottom: activeTab === 'all' ? '3px solid #004a99' : '3px solid transparent',
              color: activeTab === 'all' ? '#004a99' : '#64748b',
              fontWeight: activeTab === 'all' ? 'bold' : 'normal',
            }}
          >
            Toutes les offres ({jobs.length})
          </button>
        </div>
      </header>

      {/* État de chargement / Erreurs */}
      {loading && <div style={styles.centerMessage}>Recherche des opportunités TechnicAtome...</div>}
      {error && <div style={{ ...styles.centerMessage, color: '#dc2626' }}>{error}</div>}

      {/* Liste des offres */}
      {!loading && !error && (
        <main style={styles.jobsList}>
          {displayedJobs.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                Aucune offre ne correspond à vos critères actuels.
              </p>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Vous pouvez ajuster vos localisations ou vos mots-clés dans ⚙️ <strong>Mes Critères</strong>.
              </p>
            </div>
          ) : (
            displayedJobs.map((job) => {
              const isUnread = !seenIds.includes(job.id);
              const matchesUser = testJobMatchesCriteria(job, criteria);

              return (
                <article
                  key={job.id}
                  style={{
                    ...styles.jobCard,
                    borderColor: isUnread ? '#0284c7' : '#e2e8f0',
                    backgroundColor: isUnread ? '#f0f9ff' : '#ffffff',
                  }}
                  onClick={() => markJobAsSeen(job.id)}
                >
                  <div style={styles.jobTopRow}>
                    <div style={styles.badgeRow}>
                      {isUnread && <span style={styles.newBadge}>NOUVELLE</span>}
                      {matchesUser && <span style={styles.matchBadge}>CORRESPOND À VOS CRITÈRES</span>}
                      {job.contractType && <span style={styles.tag}>{job.contractType}</span>}
                      {job.location && <span style={styles.tagLoc}>📍 {job.location}</span>}
                    </div>
                  </div>

                  <h2 style={styles.jobTitle}>{job.title}</h2>
                  {job.department && <p style={styles.jobDept}>🏢 {job.department}</p>}

                  <div style={styles.jobBottomRow}>
                    <span style={styles.jobDate}>
                      {job.date ? `Publié : ${job.date}` : `Découvert récemment`}
                    </span>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.applyBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        markJobAsSeen(job.id);
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
    maxWidth: '750px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '16px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  appTitle: {
    margin: '0 0 4px 0',
    fontSize: '1.35rem',
    fontWeight: '800',
    color: '#004a99',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.82rem',
    color: '#64748b',
  },
  criteriaBtn: {
    backgroundColor: '#004a99',
    color: '#ffffff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  criteriaPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #cbd5e1',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  },
  criteriaPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  criteriaTitle: {
    margin: 0,
    fontSize: '1.05rem',
    color: '#0f172a',
  },
  savedBadge: {
    fontSize: '0.75rem',
    color: '#16a34a',
    fontWeight: '600',
  },
  criteriaDesc: {
    fontSize: '0.82rem',
    color: '#64748b',
    margin: '0 0 14px 0',
  },
  formGroup: {
    marginBottom: '14px',
  },
  labelWithAction: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  textLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#0284c7',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  pillsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '4px',
  },
  pillBtn: {
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #cbd5e1',
    fontSize: '0.82rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  fieldHint: {
    fontSize: '0.75rem',
    color: '#64748b',
    margin: '6px 0 0 2px',
  },
  row: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  label: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#475569',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.88rem',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  },
  notificationsToggleBox: {
    marginTop: '12px',
    padding: '10px 12px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    border: '1px solid #bfdbfe',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: '#1e40af',
    cursor: 'pointer',
  },
  notificationStatus: {
    fontSize: '0.78rem',
    color: '#475569',
  },
  closeCriteriaBtn: {
    backgroundColor: '#004a99',
    color: '#ffffff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  alertBanner: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '14px',
  },
  alertBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  bellIcon: {
    fontSize: '1.4rem',
  },
  alertHeadline: {
    fontSize: '0.92rem',
    color: '#0f172a',
  },
  activeCriteriaSummary: {
    fontSize: '0.78rem',
    color: '#64748b',
    marginTop: '2px',
  },
  bannerActions: {
    display: 'flex',
    gap: '8px',
  },
  refreshBtn: {
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  markSeenBtn: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  tabBar: {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    padding: '8px 4px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badgeCount: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '0.72rem',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '10px',
  },
  jobsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '12px',
  },
  jobCard: {
    padding: '14px',
    borderRadius: '10px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  jobTopRow: {
    marginBottom: '6px',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  newBadge: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '0.68rem',
    fontWeight: '800',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  matchBadge: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    fontSize: '0.68rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  tag: {
    backgroundColor: '#e2e8f0',
    color: '#334155',
    fontSize: '0.72rem',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  tagLoc: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: '0.72rem',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  jobTitle: {
    margin: '4px 0 6px 0',
    fontSize: '1.02rem',
    color: '#0f172a',
    lineHeight: '1.35',
  },
  jobDept: {
    margin: '0 0 10px 0',
    fontSize: '0.82rem',
    color: '#64748b',
  },
  jobBottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #f1f5f9',
    flexWrap: 'wrap',
    gap: '8px',
  },
  jobDate: {
    fontSize: '0.78rem',
    color: '#94a3b8',
  },
  applyBtn: {
    backgroundColor: '#004a99',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  centerMessage: {
    textAlign: 'center',
    padding: '30px',
    color: '#64748b',
    fontSize: '0.95rem',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '30px 20px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    marginTop: '12px',
  },
};
