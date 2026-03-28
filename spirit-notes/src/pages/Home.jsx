import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getRecommendations } from '@/api/recommendations';
import { getUserNotes } from '@/api/notes';
import api from '@/api';
import { auth, db } from '@/firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import FlavorRadarChart from '@/components/common/FlavorRadarChart';
import TastingNoteCard from '@/components/common/TastingNoteCard';
import SpiritCatalogCard from '@/components/common/SpiritCatalogCard';
import styles from './Home.module.scss';
import { cn } from '@/lib/utils';

const Home = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [flavorDnaData, setFlavorDnaData] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [persona, setPersona] = useState(null);
  const [userName, setUserName] = useState('');

  // Mock weekly data
  const weeklyData = [
    { day: 'Mon', count: 1 },
    { day: 'Tue', count: 0 },
    { day: 'Wed', count: 2 },
    { day: 'Thu', count: 1 },
    { day: 'Fri', count: 3 },
    { day: 'Sat', count: 2 },
    { day: 'Sun', count: 0 },
  ];

  const fetchDashboardData = async () => {
    const uid = auth.currentUser?.uid || 'guest';
    setLoadingRecs(true);
    setUserName(auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Connoisseur');
    
    try {
      if (uid !== 'guest') {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.flavorDNA) {
          const dna = data.flavorDNA;
          const mappedData = [
            { subject: 'Peaty', value: dna.peat || 0 },
            { subject: 'Floral', value: dna.floral || 0 },
            { subject: 'Fruity', value: dna.fruity || 0 },
            { subject: 'Woody', value: dna.woody || 0 },
            { subject: 'Spicy', value: dna.spicy || 0 },
            { subject: 'Sweet', value: dna.sweet || 0 },
          ];
          setFlavorDnaData(mappedData);
        }
        
        if (data.persona) {
          setPersona(data.persona);
        }
      }
    }

      if (uid !== 'guest') {
        const data = await getUserNotes(uid);
        const fetchedNotes = data.slice(0, 6).map(note => ({
          ...note,
          id: note.id,
          spiritName: note.name,
          rating: note.rating,
          date: note.createdAt?._seconds ? new Date(note.createdAt._seconds * 1000) : (note.createdAt ? new Date(note.createdAt) : new Date()),
          tags: Object.entries(note.flavor_axes || {}).filter(([,v]) => v > 6).map(([k]) => k),
          image: note.image || note.imageUrl || null,
        }));
        setRecentNotes(fetchedNotes);
      }

      const recs = await getRecommendations(uid);
      setRecommendations(recs.recommendations || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [auth.currentUser]);

  return (
    <div className={styles.container}>
      {/* 1. Welcome Header */}
      <section className={styles.welcomeSection}>
        <p className={styles.curatedLabel}>Curated for you</p>
        <h2 className={styles.welcomeTitle}>Welcome back, {userName}</h2>
      </section>

      {/* 2. Taste Persona Section */}
      <section className={styles.personaSection}>
        <div className={styles.personaCard}>
          <div className={styles.personaBackgroundIcon}>
            <span className="material-symbols-outlined">insights</span>
          </div>
          <div className={styles.personaContent}>
            <p className={styles.personaLabel}>Your Taste Persona</p>
            <div className={styles.personaDescription}>
              <h3>{persona?.title || 'Discovery in Progress'}</h3>
              <p>
                {persona?.description || 'A deep biological mapping of your olfactory and palate preferences.'}
              </p>
            </div>
            <Link to="/dna" className={styles.personaLink}>
              View Style Guidelines
              <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          </div>
        </div>

      </section>

      {/* 3. Today's Curation (Hero) */}
      {recommendations.length > 0 && (
        <section className={styles.curationSection}>
          <div className={styles.sectionHeader}>
            <h3>Today's Curation</h3>
            <span className={styles.dailyRefresh}>
              <span className="material-symbols-outlined">auto_awesome</span>
              Daily Refresh
            </span>
          </div>
          <SpiritCatalogCard 
            spirit={recommendations[0]} 
            matchPercent={recommendations[0].matchRate}
            onAdd={(s) => navigate('/notes/new', { state: { spirit: s } })}
            variant="hero"
          />
        </section>
      )}

      {/* 4. Recent Notes */}
      <section className={styles.recentSection}>
        <div className={styles.sectionHeader}>
          <h3>Recent Notes</h3>
          <Link to="/collection" className={styles.seeAllButton}>
            See All
          </Link>
        </div>
        {recentNotes.length > 0 ? (
          <div className={styles.notesScroll}>
            {recentNotes.map((note) => (
              <div key={note.id} className={styles.noteCardWrapper}>
                {/* Note cards will use the new stat-card style via global components or specific styles */}
                <TastingNoteCard note={note} variant="collection" />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>아직 작성된 테이스팅 노트가 없습니다.</p>
            <Link to="/notes/new" className={styles.addFirstNote}>
              <span className="material-symbols-outlined">add</span>
              <span>첫 번째 노트 작성하기</span>
            </Link>
          </div>
        )}
      </section>

      {/* Optional: Keeping DNA and Frequency at the bottom but styled subtly if needed */}
      {/* For now, focus on matching the reference layout which ends here */}
    </div>
  );
};

export default Home;

