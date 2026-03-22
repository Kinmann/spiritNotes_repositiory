import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import FlavorRadarChart from '@/components/common/FlavorRadarChart';
import styles from './SpiritDetail.module.scss';

const SpiritDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [spirit, setSpirit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryHierarchy, setCategoryHierarchy] = useState([]);
  const [locationHierarchy, setLocationHierarchy] = useState([]);

  useEffect(() => {
    const fetchSpirit = async () => {
      try {
        const docRef = doc(db, 'spirits', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSpirit({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("No such spirit!");
        }
      } catch (error) {
        console.error("Error fetching spirit:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpirit();
  }, [id]);

  useEffect(() => {
    if (!spirit) return;

    const fetchHierarchy = async (id, collectionName) => {
      let path = [];
      let currentId = id;
      while (currentId) {
        try {
          const docRef = doc(db, collectionName, currentId);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) break;
          const data = docSnap.data();
          path.unshift(data.name);
          currentId = data.parentId;
        } catch (error) {
          console.error(`Error fetching ${collectionName} hierarchy:`, error);
          break;
        }
      }
      return path;
    };

    const loadHierarchies = async () => {
      if (spirit.categoryId) {
        const catPath = await fetchHierarchy(spirit.categoryId, 'categories');
        setCategoryHierarchy(catPath);
      }
      if (spirit.locationId) {
        const locPath = await fetchHierarchy(spirit.locationId, 'locations');
        setLocationHierarchy(locPath);
      }
    };

    loadHierarchies();
  }, [spirit]);

  if (loading) {
    return (
      <div className={styles.spiritDetailPage}>
        <div className={styles.loadingWrapper}>
          <span className={`material-symbols-outlined ${styles.loadingIcon}`}>cyclone</span>
          <p className={styles.loadingText}>Accessing Records...</p>
        </div>
      </div>
    );
  }

  if (!spirit) {
    return (
      <div className={styles.spiritDetailPage}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Archives
        </button>
        <div className={styles.errorState}>
          <h2>Spirit Not Found</h2>
          <p>The requested record does not exist in our archives.</p>
        </div>
      </div>
    );
  }

  // Format flavor data for Radar Chart
  const flavorData = spirit.flavor_axes ? [
    { subject: 'Peat', value: spirit.flavor_axes.peat || 0 },
    { subject: 'Floral', value: spirit.flavor_axes.floral || 0 },
    { subject: 'Fruity', value: spirit.flavor_axes.fruity || 0 },
    { subject: 'Woody', value: spirit.flavor_axes.woody || 0 },
    { subject: 'Spicy', value: spirit.flavor_axes.spicy || 0 },
    { subject: 'Sweet', value: spirit.flavor_axes.sweet || 0 }
  ] : [];


  return (
    <div className={styles.spiritDetailPage}>
      <button onClick={() => navigate(-1)} className={styles.backButton}>
        <span className={`material-symbols-outlined ${styles.backIcon}`}>arrow_back</span>
        Back to Archives
      </button>

      <div className={styles.mainContent}>
        {/* Left: Image & Stats */}
        <div className={styles.imageSection}>
          <div className={styles.imageWrapper}>
            {spirit.image ? (
              <img src={spirit.image} alt={spirit.name} />
            ) : (
              <span className={`material-symbols-outlined ${styles.placeholderIcon}`}>liquor</span>
            )}
          </div>
          
          <div className={styles.quickStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>ABV</span>
              <span className={styles.statValue}>{spirit.abv || '--'}%</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Volume</span>
              <span className={styles.statValue}>{spirit.volume || '--'}ml</span>
            </div>
            {spirit.distillery && (
              <div className={`${styles.statItem} ${styles.distilleryItem}`}>
                <span className={styles.statLabel}>Distillery / Brand</span>
                <span className={styles.statValue}>{spirit.distillery}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Info & Profiles */}
        <div className={styles.detailsSection}>
          <header className={styles.header}>
            <span className={styles.category}>
              {categoryHierarchy.length > 0 ? categoryHierarchy.join(' > ') : spirit.category}
            </span>
            <h1>{spirit.name}</h1>
            {spirit.distillery && (
              <div className={styles.distillery}>
                <span className={`material-symbols-outlined ${styles.distilleryIcon}`}>factory</span>
                {spirit.distillery}
              </div>
            )}
            {locationHierarchy.length > 0 && (
              <div className={styles.origin}>
                <span className={`material-symbols-outlined ${styles.originIcon}`}>location_on</span>
                {locationHierarchy.join(' > ')}
              </div>
            )}
            <p className={styles.description}>
              {spirit.description || "Detailed description for this spirit is currently being archived by our curators."}
            </p>
          </header>

          <h3 className={styles.sectionTitle}>
            <span className={`material-symbols-outlined ${styles.sectionIcon}`}>insights</span>
            Flavor Profile
          </h3>
          
          <div className={styles.radarWrapper}>
            <FlavorRadarChart data={flavorData} height={350} />
          </div>


          <div className={styles.actions}>
            <button 
              className={styles.primaryButton}
              onClick={() => navigate('/notes/new', { state: { spirit: spirit } })}
            >
              <span className="material-symbols-outlined">add_circle</span>
              Write a Tasting Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpiritDetail;
