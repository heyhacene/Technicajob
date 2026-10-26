import React, { useState, useEffect } from 'react';
import './App.css';

interface Job {
  id: string;
  title: string;
  location: string;
  contractType: string;
  department: string;
  publishedDate: string;
  url: string;
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // États pour TOUS vos filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedContract, setSelectedContract] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  // État pour les nouvelles offres détectées
  const [newJobsCount, setNewJobsCount] = useState(0);

  // Chargement des offres (depuis votre fichier jobs.json synchronisé)
  useEffect(() => {
    fetch('/data/jobs.json')
      .then((res) => res.json())
      .then((data: Job[]) => {
        setJobs(data);
        setFilteredJobs(data);
        setLoading(false);

        // Vérification des nouveautés par rapport à la dernière visite
        const lastSeenIds = JSON.parse(localStorage.getItem('seen_jobs') || '[]');
        if (lastSeenIds.length > 0) {
          const fresh = data.filter((job) => !lastSeenIds.includes(job.id));
          setNewJobsCount(fresh.length);
        }

        // Sauvegarde des IDs actuels comme vus après un court délai ou clic
        const allIds = data.map((j) => j.id);
        localStorage.setItem('seen_jobs', JSON.stringify(allIds));
      })
      .catch((err) => {
        console.error('Erreur chargement offres:', err);
        setLoading(false);
      });
  }, []);

  // Application de TOUS les filtres simultanément
  useEffect(() => {
    let result = jobs;

    // Filtre par mot-clé (titre)
    if (searchTerm.trim() !== '') {
      result = result.filter((job) =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par Localisation
    if (selectedLocation !== 'ALL') {
      result = result.filter((job) => job.location === selectedLocation);
    }

    // Filtre par Type de Contrat
    if (selectedContract !== 'ALL') {
      result = result.filter((job) => job.contractType === selectedContract);
    }

    // Filtre par Département / Service
    if (selectedDepartment !== 'ALL') {
      result = result.filter((job) => job.department === selectedDepartment);
    }

    setFilteredJobs(result);
  }, [searchTerm, selectedLocation, selectedContract, selectedDepartment, jobs]);

  // Extraction des listes uniques pour alimenter les menus déroulants de filtres
  const locations = Array.from(new Set(jobs.map((j) => j.location))).filter(Boolean);
  const contracts = Array.from(new Set(jobs.map((j) => j.contractType))).filter(Boolean);
  const departments = Array.from(new Set(jobs.map((j) => j.department))).filter(Boolean);

  if (loading) {
    <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>
      Chargement des offres TechnicAtome...
    </div>;
  }

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', color: '#333' }}>
      <header style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '22px', color: '#004a99', marginBottom: '8px' }}>
          TechnicAtome Job Alert
        </h1>
        {newJobsCount > 0 && (
          <div style={{ background: '#e6f4ea', color: '#137333', padding: '8px', borderRadius: '6px', fontSize: '14px', marginBottom: '10px' }}>
            🔔 <strong>{newJobsCount} nouvelle(s) offre(s)</strong> depuis votre dernière visite !
          </div>
        )}
        <p style={{ fontSize: '13px', color: '#666' }}>
          {filteredJobs.length} offre(s) trouvée(s) sur {jobs.length} totales
        </p>
      </header>

      {/* Bloc de TOUS les filtres */}
      <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #dee2e6' }}>
        <h3 style={{ fontSize: '15px', marginTop: '0', marginBottom: '10px' }}>Filtres de recherche</h3>

        {/* Recherche par mot-clé */}
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Rechercher par mot-clé (ex: Sûreté, Projets...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Filtre Localisation */}
          <div style={{ flex: '1', minWidth: '45%' }}>
            <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Localisation</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="ALL">Toutes les localisations</option>
              {locations.map((loc, idx) => (
                <option key={idx} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Filtre Type de Contrat */}
          <div style={{ flex: '1', minWidth: '45%' }}>
            <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Contrat</label>
            <select
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="ALL">Tous les contrats</option>
              {contracts.map((con, idx) => (
                <option key={idx} value={con}>{con}</option>
              ))}
            </select>
          </div>

          {/* Filtre Département / Service */}
          <div style={{ flex: '1', minWidth: '100%' }}>
            <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Domaine / Département</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="ALL">Tous les départements</option>
              {departments.map((dep, idx) => (
                <option key={idx} value={dep}>{dep}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des offres filtrées */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredJobs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#777', padding: '20px' }}>Aucune offre ne correspond à vos filtres actuels.</p>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '15px', margin: '0 0 6px 0', color: '#004a99' }}>{job.title}</h2>
              <div style={{ fontSize: '12px', color: '#555', display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span>📍 {job.location}</span>
                <span>📄 {job.contractType}</span>
                <span>🏷️ {job.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>Publié le : {job.publishedDate}</span>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: '#004a99', color: '#fff', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}
                >
                  Voir l'offre →
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
