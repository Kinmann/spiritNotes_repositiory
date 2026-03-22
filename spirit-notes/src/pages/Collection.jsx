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

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'users', auth.currentUser.uid, 'notes'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        setNotes(querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            spiritName: data.name,
            rating: data.rating,
            date: data.createdAt?.toDate() || new Date(),
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
  }, []);

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
      {/* Collection Header & Tabs */}
      <section className={styles.headerSection}>
        <h2 className={styles.title}>Personal Vault</h2>
      </section>

      {/* Search & Filter Section */}
      <section className={styles.searchSection}>
        <div className={styles.searchBar}>
          <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
          <input 
            placeholder="Search your vault..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className={styles.filterButton}>
          <span className="material-symbols-outlined">tune</span>
        </button>
      </section>

      {/* Content Grid */}
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
