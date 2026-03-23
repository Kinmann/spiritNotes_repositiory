import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpiritCatalogCard from '@/components/common/SpiritCatalogCard';
import { getAllSpirits } from '@/api/spirits';
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
        const data = await getAllSpirits();
        if (data.success) {
          setSpirits(data.spirits);
        }
      } catch (error) {
        console.error('Error fetching spirits:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpirits();
  }, []);

  const categories = ['All', 'Whiskey', 'Gin', 'Rum', 'Tequila', 'Vodka'];
  const categoryMap = {
    'Whiskey': '위스키',
    'Gin': '진',
    'Rum': '럼',
    'Tequila': '데킬라',
    'Vodka': '보드카'
  };

  const filteredSpirits = spirits.filter(spirit => {
    const searchLower = searchQuery.toLowerCase();
    
    // Expanded search scope: name, distillery, brand, category (hierarchical), origin (hierarchical)
    const matchesSearch = 
      spirit.name.toLowerCase().includes(searchLower) ||
      (spirit.brand && spirit.brand.toLowerCase().includes(searchLower)) ||
      (spirit.distillery && spirit.distillery.toLowerCase().includes(searchLower)) ||
      (spirit.category && spirit.category.toLowerCase().includes(searchLower)) ||
      (spirit.origin && spirit.origin.toLowerCase().includes(searchLower));
    
    let matchesCategory = activeCategory === 'All';
    if (!matchesCategory && spirit.category) {
      // User wants to match the first level of the category hierarchy
      const firstLevel = spirit.category.split(' > ')[0];
      const targetCategory = categoryMap[activeCategory];
      
      matchesCategory = firstLevel === targetCategory;
    }
    
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
      {/* Page Title & Search */}
      <section className={styles.heroSection}>
        <h1>
          Spirit <span>Encyclopedia</span>
        </h1>
        
        <div className={styles.searchSection}>
          <div className={styles.searchBarWrapper}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input 
              className={styles.searchInput}
              placeholder="Search brands, categories..." 
              type="text"
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
        </div>
      </section>

      {/* Spirit List */}
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
