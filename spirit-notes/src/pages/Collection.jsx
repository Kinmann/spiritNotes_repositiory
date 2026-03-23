import React, { useEffect, useState } from 'react';
import { db, auth } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import TastingNoteCard from '@/components/common/TastingNoteCard';
import styles from './Collection.module.scss';

const Collection = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' or 'rating'

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'users', auth.currentUser.uid, 'notes'),
          orderBy(sortBy === 'latest' ? 'createdAt' : 'rating', 'desc')
        );
        const querySnapshot = await getDocs(q);
        setNotes(querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            spiritName: data.name,
            rating: data.rating,
            date: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
            image: data.image || null,
            ...data
          };
        }));

        // Spirits data fetching removed as Catalog tab is deleted
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sortBy]);

  const filteredNotes = notes.filter(note => 
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.spiritName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.distillery && note.distillery.toLowerCase().includes(searchQuery.toLowerCase()))
  );


  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <span className={`material-symbols-outlined ${styles.loadingIcon}`}>liquor</span>
        <p className={styles.loadingText}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.collectionPage}>
      {/* Title & Search Section */}
      <section className={styles.heroSection}>
        <div className={styles.titleGroup}>
          <span className={styles.subtitle}>The Curated Journal</span>
          <h1 className={styles.title}>
            Personal <span className={styles.primaryText}>Vault</span>
          </h1>
        </div>

        <div className={styles.actionGroup}>
          <div className={styles.searchContainer}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input 
              className={styles.searchInput}
              placeholder="Search within vault" 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.filterChips}>
            <button 
              className={`${styles.filterChip} ${sortBy === 'latest' ? styles.active : ''}`}
              onClick={() => setSortBy('latest')}
            >
              <span className="material-symbols-outlined">tune</span>
              Latest
            </button>
            <button 
              className={`${styles.filterChip} ${sortBy === 'rating' ? styles.active : ''}`}
              onClick={() => setSortBy('rating')}
            >
              <span className="material-symbols-outlined">star</span>
              Rating
            </button>
          </div>
        </div>
      </section>

      {/* Spirit List / Content Grid */}
      {filteredNotes.length > 0 ? (
        <section className={styles.contentGrid}>
          {filteredNotes.map((note) => (
            <TastingNoteCard key={note.id} note={note} variant="collection" />
          ))}
        </section>
      ) : (
        <EmptyState 
          icon="liquor"
          title="아직 노트가 없어요"
          description="첫 번째 테이스팅 노트를 작성해 보세요."
        />
      )}
    </div>
  );
};

const EmptyState = ({ icon, title, description }) => (
  <div className={styles.emptyState}>
    <div className={styles.iconWrapper}>
      <span className={`material-symbols-outlined ${styles.icon}`}>
        {icon}
      </span>
    </div>
    <div className={styles.textGroup}>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyDescription}>{description}</p>
    </div>
  </div>
);

export default Collection;
