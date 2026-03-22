import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpiritCatalogCard from '@/components/common/SpiritCatalogCard';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import styles from './Encyclopedia.module.scss';

const Encyclopedia = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [spirits, setSpirits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchSpirits = async () => {
      try {
        const q = query(collection(db, 'spirits'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        setSpirits(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching spirits:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpirits();
  }, []);

  const categories = ['All', 'Whisky', 'Gin', 'Rum', 'Tequila', 'Cognac'];

  const filteredSpirits = spirits.filter(spirit => {
    const matchesSearch = spirit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (spirit.brand && spirit.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'All' || spirit.category?.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <span className={`material-symbols-outlined ${styles.loadingIcon}`}>cyclone</span>
        <p className={styles.loadingText}>Accessing Archives...</p>
      </div>
    );
  }

  return (
    <div className={styles.encyclopediaPage}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div className={styles.iconContainer}>
            <span className={`material-symbols-outlined ${styles.icon}`}>menu_book</span>
          </div>
          <h1>The Archives</h1>
        </div>
        <p className={styles.description}>
          Explore the world's finest spirits and discover your next masterwork.
        </p>
      </header>

      {/* Search & Categories */}
      <section className={styles.searchSection}>
        <div className={styles.searchBar}>
          <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
          <input 
            placeholder="Search by name, distillery, or region..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.categoryList}>
          {categories.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`${styles.categoryButton} ${activeCategory === cat ? styles.active : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className={styles.gridSection}>
        {filteredSpirits.length > 0 ? (
          filteredSpirits.map((spirit) => (
            <SpiritCatalogCard 
              key={spirit.id} 
              spirit={spirit} 
              onAdd={(s) => navigate('/notes/new', { state: { spirit: s } })}
            />
          ))
        ) : (
          <div className={styles.noResults}>
            <span className={`material-symbols-outlined ${styles.noIcon}`}>search_off</span>
            <p className={styles.noText}>No matching entries found in the archives.</p>
          </div>
        )}
      </section>

      {/* Discovery CTA */}
      <section className={styles.discoveryCta}>
        <span className={`material-symbols-outlined ${styles.bgIcon}`}>auto_awesome</span>
        <div className={styles.ctaHeader}>
          <h3 className={styles.ctaTitle}>
            <span className={`material-symbols-outlined ${styles.ctaIcon}`}>auto_awesome</span>
            AI Curator
          </h3>
          <p className={styles.ctaText}>
            Looking for something tailored specifically to your palate? Let our AI suggest your next pour.
          </p>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className={styles.ctaButton}
        >
          Check Recommendations
        </button>
      </section>
    </div>
  );
};

export default Encyclopedia;
