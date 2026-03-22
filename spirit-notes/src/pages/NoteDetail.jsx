import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '@/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import FlavorRadarChart from '@/components/common/FlavorRadarChart';
import { toast } from 'sonner';
import styles from './NoteDetail.module.scss';

const NoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'notes', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNote({ id: docSnap.id, ...docSnap.data() });
        } else {
          navigate('/collection');
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!auth.currentUser || !note) return;
    if (!confirm('이 노트를 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'notes', note.id));
      toast.success('노트가 삭제되었습니다.');
      navigate('/collection');
    } catch {
      toast.error('삭제 중 오류 발생');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>노트 불러오는 중...</p>
      </div>
    );
  }

  if (!note) return null;

  const flavorFields = [
    { name: 'peat', label: 'Peat' },
    { name: 'floral', label: 'Floral' },
    { name: 'fruity', label: 'Fruity' },
    { name: 'woody', label: 'Woody' },
    { name: 'spicy', label: 'Spicy' },
    { name: 'sweet', label: 'Sweet' },
  ];

  const chartData = flavorFields.map(f => ({
    subject: f.label,
    value: note.flavor_axes?.[f.name] || 0
  }));

  return (
    <div className={styles.noteDetailPage}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        {note.imageUrl ? (
          <img src={note.imageUrl} alt={note.name} className={styles.heroImage} />
        ) : note.image ? (
          <img src={note.image} alt={note.name} className={styles.heroImage} />
        ) : (
          <div className={styles.placeholderIconWrapper}>
            <span className={`material-symbols-outlined ${styles.placeholderIcon}`}>liquor</span>
          </div>
        )}
        <div className={styles.overlay} />
        
        {/* Back button */}
        <button 
          onClick={() => navigate(-1)} 
          className={styles.backButton}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        {/* Title overlay */}
        <div className={styles.titleOverlay}>
          <div className={styles.contentMaxWidth}>
            <div className={styles.ratingRow}>
              <span className={`material-symbols-outlined ${styles.starIcon}`}>star</span>
              <span className={styles.ratingLabel}>
                {note.rating?.toFixed(1) || '0.0'} Rating
              </span>
            </div>
            {note.title ? (
              <>
                <h1>{note.title}</h1>
                <h2 className={styles.subtitle}>{note.name}</h2>
              </>
            ) : (
              <h1>{note.name}</h1>
            )}
            <div className={styles.metaInfo}>
              <span>{note.distillery || note.brand}</span>
              <span className={styles.dot} />
              <span>{note.category}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content Panel */}
      <div className={styles.contentPanel}>
        <div className={styles.panelContainer}>
          
          {/* Flavor Analysis */}
          <section className={styles.sectionGroup}>
            <h2>Flavor Analysis</h2>
            <div className={styles.flavorAnalysisBox}>
              <div className={styles.analysisContent}>
                <div className={styles.chartWrapper}>
                  <FlavorRadarChart data={chartData} color="var(--primary)" height={280} />
                </div>
                <div className={styles.slidersGrid}>
                  {flavorFields.map(f => (
                    <div key={f.name} className={styles.sliderItem}>
                      <span className={styles.sliderLabel}>{f.label}</span>
                      <div className={styles.sliderBarRow}>
                        <div className={styles.barTrack}>
                          <div 
                            className={styles.barFill} 
                            style={{ width: `${(note.flavor_axes?.[f.name] || 0) * 10}%` }}
                          />
                        </div>
                        <span className={styles.barValue}>{note.flavor_axes?.[f.name] || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Spirit Details */}
          <section className={styles.sectionGroup}>
            <h2>Spirit Details</h2>
            <div className={styles.spiritDetailsBox}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Liquor Name</span>
                <span className={styles.detailValue}>{note.name}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Category</span>
                <span className={styles.detailValue}>
                  {note.categoryHierarchy && note.categoryHierarchy.length > 0 
                    ? note.categoryHierarchy.join(' > ') 
                    : note.category}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Origin</span>
                <span className={styles.detailValue}>
                  {note.locationHierarchy && note.locationHierarchy.length > 0 
                    ? note.locationHierarchy.join(' > ') 
                    : '-'}
                </span>
              </div>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Distillery / Brand</span>
                  <span className={styles.detailValue}>{note.distillery || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>ABV / Volume</span>
                  <span className={styles.detailValue}>
                    {note.abv ? `${note.abv}%` : '-'} / {note.volume ? `${note.volume}ml` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Tasting Note */}
          <section className={`${styles.sectionGroup} ${styles.tastingRecord}`}>
            <h2>Tasting Record</h2>
            <p className={styles.commentText}>
              {note.comment || '작성된 테이스팅 노트가 없습니다.'}
            </p>
          </section>

          {/* Metadata */}
          <section className={styles.metadataSection}>
            <div className={styles.metaItem}>
              <span className={`material-symbols-outlined ${styles.icon}`}>calendar_today</span>
              <span>{note.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}</span>
            </div>
            {note.abv && (
              <div className={styles.metaItem}>
                <span className={`material-symbols-outlined ${styles.icon}`}>percent</span>
                <span>{note.abv}% ABV</span>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className={styles.floatingActionBar}>
        <button 
          onClick={() => navigate(`/notes/${note.id}/edit`)}
          className={styles.editButton}
        >
          <span className="material-symbols-outlined">edit</span>
          <span>Edit</span>
        </button>
        <div className={styles.divider} />
        <button className={styles.iconButton}>
          <span className="material-symbols-outlined">share</span>
        </button>
        <button 
          onClick={handleDelete}
          className={`${styles.iconButton} ${styles.delete}`}
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  );
};

export default NoteDetail;
