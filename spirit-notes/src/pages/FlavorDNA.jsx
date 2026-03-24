import React, { useEffect, useState } from 'react';
import { auth, db } from '@/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import FlavorRadarChart from '@/components/common/FlavorRadarChart';
import { updateFlavorDNA } from '@/api/flavorDna';
import { getRecommendations } from '@/api/recommendations';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import styles from './FlavorDNA.module.scss';
import { cn } from '@/lib/utils';

const FlavorDNA = () => {
  const navigate = useNavigate();
  const [dna, setDna] = useState(null);
  const [persona, setPersona] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState({ totalNotes: 0, totalBottles: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDNAData = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    
    try {
      // 1. Fetch User DNA
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.flavorDNA) {
          const mappedData = [
            { subject: 'Peaty', value: data.flavorDNA.peat || 0 },
            { subject: 'Floral', value: data.flavorDNA.floral || 0 },
            { subject: 'Fruity', value: data.flavorDNA.fruity || 0 },
            { subject: 'Woody', value: data.flavorDNA.woody || 0 },
            { subject: 'Spicy', value: data.flavorDNA.spicy || 0 },
            { subject: 'Sweet', value: data.flavorDNA.sweet || 0 },
          ];
          setDna(mappedData);
        }
      }

      try {
        const res = await fetch(`http://localhost:5000/api/persona/${uid}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setPersona(data.persona);
        } else {
          setPersona({
            title: 'Oak & Smoke Master',
            description: 'A deep biological mapping of your olfactory and palate preferences.'
          });
        }
      } catch (e) {
        setPersona({
          title: 'Oak & Smoke Master',
          description: 'A deep biological mapping of your olfactory and palate preferences.'
        });
      }

      // 3. Fetch Recommendations
      try {
        const recData = await getRecommendations(uid);
        if (recData && recData.recommendations) {
          setRecommendations(recData.recommendations.slice(0, 5));
        }
      } catch (e) {
        console.error('Recommendations fetch failed:', e);
      }

      // 4. Fetch Stats (Note Count)
      const notesSnap = await getDocs(collection(db, 'users', uid, 'notes'));
      setStats({
        totalNotes: notesSnap.size,
        totalBottles: Array.from(new Set(notesSnap.docs.map(doc => doc.data().name))).length
      });

    } catch (error) {
      console.error('Error fetching DNA Data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!auth.currentUser) return;
    setRefreshing(true);
    try {
      await updateFlavorDNA(auth.currentUser.uid);
      await fetchDNAData();
      toast.success('Flavor DNA가 업데이트되었습니다.');
    } catch {
      toast.error('업데이트 중 오류가 발생했습니다.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDNAData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={`material-symbols-outlined ${styles.loadingIcon}`}>genetics</span>
        <p>DNA 분석 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero DNA Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroHeader}>
          <span className={styles.subtitle}>Personal Profile</span>
          <h1 className={styles.title}>
            My Flavor <span className={styles.primaryText}>DNA</span>
          </h1>
        </div>

        {/* Persona Card */}
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
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statGrid}>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Unique Spirits</p>
            <p className={styles.statValue}>{stats.totalBottles}</p>
          </div>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Journal Entries</p>
            <p className={styles.statValue}>{stats.totalNotes}</p>
          </div>
        </div>
      </section>

      {/* Palate Distribution Chart Section */}
      <section className={styles.radarSection}>
        {!dna ? (
          <div className={styles.lockedDNA}>
            <div className={styles.lockIconWrapper}>
              <span className={`material-symbols-outlined ${styles.lockIcon}`}>lock</span>
            </div>
            <h3>DNA 잠금 해제하기</h3>
            <p>최소 3개의 테이스팅 노트를 작성하여 나만의 Flavor DNA를 발견하세요.</p>
            <Link to="/notes/new" className={styles.unlockButton}>노트 작성하기</Link>
          </div>
        ) : (
          <div className={styles.palateCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleGroup}>
                <h3>Palate Distribution</h3>
                <p>Aggregated from your collection</p>
              </div>
              <span className={`material-symbols-outlined ${styles.headerIcon}`}>query_stats</span>
            </div>

            <div className={styles.radarContent}>
              <div className={styles.radarWrapper}>
                <FlavorRadarChart data={dna} color="var(--primary)" height={300} />
              </div>

              {/* Numeric Data Grid */}
              <div className={styles.markersGrid}>
                {dna.map((axis) => (
                  <div key={axis.subject} className={styles.markerItem}>
                    <span className={cn(styles.indicator, axis.value > 0 && styles.active)} />
                    <div className={styles.markerInfo}>
                      <span className={cn(styles.markerLabel, axis.value > 0 && styles.active)}>{axis.subject}</span>
                      <span className={styles.markerValue}>{axis.value.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        )}
      </section>

      {/* Recommendation Section */}
      {recommendations.length > 0 && (
        <section className={styles.recommendationSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.subtitle}>Curated For You</span>
            <h2>Spirits You Might Like</h2>
          </div>

          <div className={cn(styles.carousel, 'hide-scrollbar')}>
            {recommendations.map((rec) => (
              <div 
                key={rec.id} 
                className={styles.recommendationCard}
                onClick={() => navigate(`/spirit/${rec.id}`)}
              >
                <div className={styles.imageWrapper}>
                  <img 
                    src={rec.image} 
                    alt={rec.name} 
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1582819509237-d5b75f20ff7c?w=600'; }}
                  />
                  <div className={styles.overlay} />
                  {rec.matchRate != null && (
                    <div className={styles.matchBadge}>
                      <span>{rec.matchRate}% Match</span>
                    </div>
                  )}
                </div>
                
                <div className={styles.cardContent}>
                  <div className={styles.headerGroup}>
                    <div className={styles.titles}>
                      <span className={styles.distillery}>{rec.distillery || "Distillery Unknown"}</span>
                      <h5 className={styles.spiritName}>{rec.name}</h5>
                    </div>
                    <button 
                      className={styles.quickAdd} 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/notes/new', { state: { spirit: rec } });
                      }}
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>

                  <div className={styles.specList}>
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Category</span>
                      <span className={styles.specDivider}></span>
                      <span className={styles.specValue}>{rec.category?.split(' > ')[0] || 'Spirit'}</span>
                    </div>
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Origin</span>
                      <span className={styles.specDivider}></span>
                      <span className={styles.specValue}>{rec.origin?.split(' > ')[0] || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FlavorDNA;
