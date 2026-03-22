import React, { useEffect, useState } from 'react';
import { auth, db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import FlavorRadarChart from '@/components/common/FlavorRadarChart';
import { updateFlavorDNA } from '@/api/flavorDna';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import styles from './FlavorDNA.module.scss';
import { cn } from '@/lib/utils';

const FlavorDNA = () => {
  const [dna, setDna] = useState(null);
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDNA = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.flavorDNA) {
          const mappedData = [
            { subject: 'Peat', value: data.flavorDNA.peat || 0 },
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
          setPersona(await res.json());
        } else {
          setPersona({
            title: 'Oak & Smoke Master',
            description: 'A deep biological mapping of your olfactory and palate preferences.'
          });
        }
      } catch (e) {
        console.error('Persona fetch failed:', e);
        setPersona({
          title: 'Oak & Smoke Master',
          description: 'A deep biological mapping of your olfactory and palate preferences.'
        });
      }
    } catch (error) {
      console.error('Error fetching DNA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!auth.currentUser) return;
    setRefreshing(true);
    try {
      await updateFlavorDNA(auth.currentUser.uid);
      await fetchDNA();
      toast.success('Flavor DNA가 업데이트되었습니다.');
    } catch {
      toast.error('업데이트 중 오류가 발생했습니다.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDNA();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={`material-symbols-outlined ${styles.loadingIcon}`}>genetics</span>
        <p>DNA 분석 중...</p>
      </div>
    );
  }

  const dnaMarkers = dna ? dna : [];

  return (
    <div className={styles.container}>
      {/* Top Section: Badge & Title */}
      <section className={styles.topSection}>
        {persona && (
          <div className={styles.personaBadge}>
            <span className={`material-symbols-outlined ${styles.badgeIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            <span className={styles.badgeText}>{persona.title}</span>
          </div>
        )}
        <h2 className={styles.title}>Taste Profile Analysis</h2>
        <p className={styles.description}>
          {persona?.description || 'A deep biological mapping of your olfactory and palate preferences.'}
        </p>
      </section>

      {/* DNA Radar Chart Area */}
      <section className={styles.radarSection}>
        {!dna ? (
          <div className={styles.lockedDNA}>
            <div className={styles.placeholderCircle}>
              <div className={styles.ring} />
            </div>
            <div className={styles.lockOverlay}>
              <div className={styles.lockIconBox}>
                <span className={`material-symbols-outlined ${styles.lockIcon}`}>lock</span>
              </div>
              <h3>DNA 잠금 해제하기</h3>
              <p>최소 3개의 테이스팅 노트를 작성하여 나만의 Flavor DNA를 발견하세요.</p>
              <Link to="/notes/new" className={styles.unlockLink}>노트 작성하기</Link>
            </div>
          </div>
        ) : (
          <div className={styles.unlockedDNA}>
            <div className={styles.decorativeCircle1} />
            <div className={styles.decorativeCircle2} />
            <div className={styles.canvasBox}>
              <FlavorRadarChart data={dna} color="var(--primary)" height={320} />
            </div>
            <div className={styles.centralIcon}>
              <span className={`material-symbols-outlined ${styles.dnaIcon}`} style={{ fontVariationSettings: "'FILL' 1" }}>genetics</span>
            </div>
            <button 
              type="button"
              onClick={handleRefresh}
              className={styles.refreshButton}
              disabled={refreshing}
            >
              <span className={`material-symbols-outlined ${styles.refreshIcon} ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>
        )}
      </section>

      {/* DNA Markers Section */}
      {dna && (
        <section className={styles.markersSection}>
          <h3>DNA Markers</h3>
          <div className={styles.markersGrid}>
            {dnaMarkers.map(axis => (
              <div key={axis.subject} className={styles.markerItem}>
                <div className={styles.markerHeader}>
                  <div className={styles.markerInfo}>
                    <span className={styles.markerSubject}>{axis.subject}</span>
                    <span className={styles.markerStatus}>
                      {axis.value > 8 ? 'Dominant Trait' : axis.value > 4 ? 'Developed' : 'Subtle'}
                    </span>
                  </div>
                  <span className={styles.markerValue}>{(axis.value * 10).toFixed(0)}%</span>
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.progress}
                    style={{ width: `${(axis.value / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Additional Recommendation Teaser */}
      <section className={styles.teaserCard}>
        <div className={styles.teaserHeader}>
          <h3>92% Match DNA</h3>
          <Link to="/" className={styles.seeAllLink}>See All</Link>
        </div>
        <div className={styles.teaserContent}>
          <div className={styles.bottleIconBox}>
            <span className={`material-symbols-outlined ${styles.bottleIcon}`}>liquor</span>
          </div>
          <div className={styles.teaserText}>
            <h4>Exploring Islay Malts</h4>
            <p>Your profile heavily leans toward peated expressions.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FlavorDNA;
