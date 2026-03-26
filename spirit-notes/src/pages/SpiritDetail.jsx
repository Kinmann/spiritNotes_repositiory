import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSpiritById } from '@/api/spirits';
import { auth, db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import FlavorRadarChart from '@/components/common/FlavorRadarChart';
import styles from './SpiritDetail.module.scss';
import { cn } from '@/lib/utils';

const SpiritDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spirit, setSpirit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchRate, setMatchRate] = useState(null);

  useEffect(() => {
    const fetchSpiritData = async () => {
      try {
        const data = await getSpiritById(id);
        if (data && data.success) {
          setSpirit(data.spirit);
          
          // Try to calculate/get match rate if user is logged in
          const uid = auth.currentUser?.uid;
          if (uid) {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists() && userDoc.data().flavorDNA && data.spirit.flavor_axes) {
              const dna = userDoc.data().flavorDNA;
              const axes = data.spirit.flavor_axes;
              // Simple similarity calculation (simplified cosine or Euclidean)
              const keys = ['peat', 'floral', 'fruity', 'woody', 'spicy', 'sweet'];
              let dotProduct = 0;
              let normA = 0;
              let normB = 0;
              keys.forEach(k => {
                const a = dna[k] || 0;
                const b = axes[k] || 0;
                dotProduct += a * b;
                normA += a * a;
                normB += b * b;
              });
              if (normA > 0 && normB > 0) {
                const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                setMatchRate(Math.round(similarity * 100));
              } else {
                setMatchRate(92); // fallback to reference value
              }
            } else {
              setMatchRate(92); // fallback
            }
          } else {
            setMatchRate(88); // guest fallback
          }
        } else {
          console.error("No such spirit!");
        }
      } catch (error) {
        console.error("Error fetching spirit:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpiritData();
  }, [id]);

  // Hexagon Radar Calculation (from SpiritCatalogCard reference)
  const radarPolygon = useMemo(() => {
    if (!spirit || !spirit.flavor_axes) return '';
    const axes = spirit.flavor_axes;
    const keys = ['peat', 'floral', 'woody', 'sweet', 'spicy', 'fruity']; // matching hex order
    const center = 50;
    const maxRadius = 40;
    const points = keys.map((key, i) => {
      const val = Math.min(Math.max(axes[key] || 0, 0), 10) / 10;
      const angle = (i * 60 - 90) * (Math.PI / 180);
      const x = center + Math.cos(angle) * maxRadius * val;
      const y = center + Math.sin(angle) * maxRadius * val;
      return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    });
    return `polygon(${points.join(', ')})`;
  }, [spirit]);

  if (loading) {
    return (
      <div className={styles.spiritDetailPage}>
        <div className={styles.loadingState}>
          <span className={`material-symbols-outlined ${styles.spin}`}>cyclone</span>
          <p>Analyzing Spirit Essence...</p>
        </div>
      </div>
    );
  }

  if (!spirit) {
    return (
      <div className={styles.spiritDetailPage}>
        <div className={styles.errorState}>
          <h2>Spirit Not Found</h2>
          <p>The cosmic archives do not contain this record.</p>
          <button onClick={() => navigate(-1)} className={styles.backLink}>
            Return to Encyclopedia
          </button>
        </div>
      </div>
    );
  }

  const dominantFlavor = Object.entries(spirit.flavor_axes || {})
    .sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

  return (
    <div className={styles.spiritDetailPage}>
      {/* Header */}
      <header className={styles.backHeader}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <span className={`material-symbols-outlined ${styles.backIcon}`}>arrow_back</span>
        </button>
      </header>

      <main className={styles.maxContainer}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.titleArea}>
            <span className={styles.distilleryLabel}>
              {spirit.distilleryName || spirit.distillery || "Unknown Distillery"}
            </span>
            <h1 className={styles.spiritName}>{spirit.name}</h1>
          </div>

          <div className={styles.imageContainer}>
            <div className={styles.imageWrapper}>
              {spirit.image ? (
                <img src={spirit.image} alt={spirit.name} />
              ) : (
                <div className="flex items-center justify-center h-full bg-surface-container/30">
                  <span className="material-symbols-outlined text-7xl opacity-10">liquor</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.infoContainer}>

            <div className={styles.hierarchyArea}>
              <div className={styles.hierarchyItem}>
                <span className={styles.label}>Category</span>
                <span className={styles.divider}></span>
                <span className={styles.value}>{spirit.category}</span>
              </div>
              <div className={styles.hierarchyItem}>
                <span className={styles.label}>Origin</span>
                <span className={styles.divider}></span>
                <span className={styles.value}>{spirit.origin}</span>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <p className={styles.statLabel}>ABV</p>
                <p className={styles.statValue}>{spirit.abv}%</p>
              </div>
              <div className={styles.statBox}>
                <p className={styles.statLabel}>Volume</p>
                <p className={styles.statValue}>{spirit.volume}ml</p>
              </div>
            </div>

            <div className={styles.recordBtnDesktop}>
              <button 
                className={styles.primaryBtn}
                onClick={() => navigate('/notes/new', { state: { spirit: spirit } })}
              >
                Record New Note
              </button>
            </div>

          </div>
        </section>

        {/* Bento Grid */}
        <div className={styles.bentoGrid}>
          {/* Flavor Profile Box */}
          <div className={styles.flavorCard}>
            <div className={styles.cardHeader}>
              <div>
                <h3>Flavor Profile</h3>
                <p className={styles.subTitle}>
                  Exploring core elements of {spirit.name}
                </p>
              </div>
              <span className={`material-symbols-outlined ${styles.headerIcon}`}>insights</span>
            </div>

            <div className={styles.radarContainer}>
              <div className={styles.radarWrapper}>
                <FlavorRadarChart 
                  data={[
                    { subject: 'Peaty', value: spirit.flavor_axes?.peat || 0 },
                    { subject: 'Floral', value: spirit.flavor_axes?.floral || 0 },
                    { subject: 'Fruity', value: spirit.flavor_axes?.fruity || 0 },
                    { subject: 'Woody', value: spirit.flavor_axes?.woody || 0 },
                    { subject: 'Spicy', value: spirit.flavor_axes?.spicy || 0 },
                    { subject: 'Sweet', value: spirit.flavor_axes?.sweet || 0 },
                  ]} 
                  color="var(--primary)" 
                  height={240} 
                />
              </div>

              <div className={styles.dataGrid}>
                {[
                  { key: 'peat', label: 'Peaty' },
                  { key: 'floral', label: 'Floral' },
                  { key: 'fruity', label: 'Fruity' },
                  { key: 'woody', label: 'Woody' },
                  { key: 'spicy', label: 'Spicy' },
                  { key: 'sweet', label: 'Sweet' },
                ].map(({ key, label }) => (
                  <div key={key} className={styles.dataItem}>
                    <span className={cn(styles.dot, (spirit.flavor_axes?.[key] || 0) > 6 ? styles.activeDot : null)}></span>
                    <div className={styles.dataTexts}>
                      <span className={cn(styles.label, (spirit.flavor_axes?.[key] || 0) > 6 ? styles.activeLabel : null)}>{label}</span>
                      <span className={styles.value}>{Math.round(spirit.flavor_axes?.[key] || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.matchFooter}>
              <div className={styles.matchHeader}>
                <span className={styles.dominant}>Dominant: {dominantFlavor[0]}</span>
                <span className={styles.percentage}>{matchRate}% Match</span>
              </div>
              <div className={styles.progressTrack}>
                <div 
                  className={styles.progressBar} 
                  style={{ width: `${matchRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Details Bento Row (Full Width on Grid) */}
          <div className={styles.detailsBento}>
            <div className={styles.bentoItem}>
              <span className={styles.bentoLabel}>Distillery Info</span>
              <h4>{spirit.distilleryName || spirit.distillery}</h4>
              <p>
                {spirit.distilleryDescription || "Detailed distillery background and production process currently being updated."}
              </p>
            </div>
            <div className={styles.bentoItem}>
              <span className={styles.bentoLabel}>Terroir & Region</span>
              <h4>{spirit.origin.split(' > ').pop()}</h4>
              <p>
                {spirit.originDescription || `The unique climate and water sources of ${spirit.origin} contribute to the distinct ${dominantFlavor[0]} characteristics found in this expression.`}
              </p>
            </div>
            <div className={styles.bentoItem}>
              <span className={styles.bentoLabel}>Production Notes</span>
              <h4>{spirit.productionTitle}</h4>
              <p>
                {spirit.productionDescription}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Bottom Footer (Mobile) */}
      <div className={styles.fixedFooter}>
        <button 
          className={styles.bottomBtn}
          onClick={() => navigate('/notes/new', { state: { spirit: spirit } })}
        >
          Record New Note
        </button>
      </div>
    </div>
  );
};

export default SpiritDetail;
