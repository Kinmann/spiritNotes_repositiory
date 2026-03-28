import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '@/firebase';
import FlavorRadarChart from '@/components/common/FlavorRadarChart';
import { getNoteById } from '@/api/notes';
import { toast } from 'sonner';
import styles from './NoteDetail.module.scss';

const NoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNoteByApi = async () => {
      if (!auth.currentUser) return;
      try {
        setLoading(true);
        const data = await getNoteById(auth.currentUser.uid, id);
        if (data) {
          setNote(data);
        } else {
          toast.error('노트를 찾을 수 없습니다.');
          navigate('/collection');
        }
      } catch (error) {
        console.error("Error fetching document:", error);
        toast.error('노트를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchNoteByApi();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!auth.currentUser || !note) return;
    if (!confirm('이 노트를 삭제하시겠습니까?')) return;
    try {
      await deleteNote(auth.currentUser.uid, note.id);
      toast.success('노트가 삭제되었습니다.');
      navigate('/collection');
    } catch (error) {
      console.error('Error deleting note:', error);
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

  // Sample data for UI preview if note fetching failed or is empty
  const displayNote = note || {
    name: "Spirit Name",
    title: "Note Title",
    distillery: " Distillery Name",
    category: "Category > Sub-category",
    locationHierarchy: ["Origin", "Region"],
    rating: 4.8,
    createdAt: { toDate: () => new Date() },
    abv: 43.0,
    volume: 700,
    comment: "This is a sample tasting note. Deep and complex aroma, smooth finish.",
    flavor_axes: { peat: 8, floral: 2, fruity: 4, woody: 6, spicy: 5, sweet: 3 }
  };

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
    value: displayNote.flavor_axes?.[f.name] || 0
  }));

  // Helper to format date
  const getNoteDate = () => {
    if (displayNote.createdAt?._seconds) return new Date(displayNote.createdAt._seconds * 1000);
    if (displayNote.createdAt?.toDate) return displayNote.createdAt.toDate();
    if (displayNote.createdAt) return new Date(displayNote.createdAt);
    return new Date();
  };

  const formattedDate = getNoteDate().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <div className={styles.noteDetailPage}>
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
            <h1 className={styles.spiritName}>{displayNote.title || displayNote.name}</h1>
            <p className={styles.subtitle}>{displayNote.name}</p>

            {/* Rating & Date - Now below Title */}
            <div className={styles.metaRow}>
              <div className={styles.ratingBox}>
                <span className="material-symbols-outlined starIcon">star</span>
                <span>{displayNote.rating?.toFixed(1) || '0.0'}</span>
              </div>
              <span className={styles.dateDot}></span>
              <span className={styles.dateText}>{formattedDate}</span>
            </div>
          </div>

          <div className={styles.imageContainer}>
            <div className={styles.imageWrapper}>
              {(displayNote.imageUrl || displayNote.image) ? (
                <img 
                  src={displayNote.imageUrl || displayNote.image} 
                  alt={displayNote.name} 
                />
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
                <span className={styles.label}>Distillery</span>
                <span className={styles.divider}></span>
                <span className={styles.value}>
                  {displayNote.distillery || displayNote.brand || "Unknown Distillery"}
                </span>
              </div>
              <div className={styles.hierarchyItem}>
                <span className={styles.label}>Category</span>
                <span className={styles.divider}></span>
                <span className={styles.value}>
                  {displayNote.categoryHierarchy?.join(' > ') || displayNote.category || '-'}
                </span>
              </div>
              <div className={styles.hierarchyItem}>
                <span className={styles.label}>Origin</span>
                <span className={styles.divider}></span>
                <span className={styles.value}>
                  {displayNote.locationHierarchy?.join(' > ') || displayNote.origin || '-'}
                </span>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <p className={styles.statLabel}>ABV</p>
                <p className={styles.statValue}>{displayNote.abv ? `${displayNote.abv}%` : '-'}</p>
              </div>
              <div className={styles.statBox}>
                <p className={styles.statLabel}>Volume</p>
                <p className={styles.statValue}>{displayNote.volume ? `${displayNote.volume}ml` : '-'}</p>
              </div>
            </div>

            <div className={styles.recordBtnDesktop}>
              <button 
                className={styles.primaryBtn}
                onClick={() => navigate(`/notes/${displayNote.id}/edit`)}
              >
                Edit Note
              </button>
            </div>

            {/* Flavor Profile Card */}
            <div className={styles.flavorCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h3>Flavor Profile</h3>
                  <p className={styles.subTitle}>Taste distribution analysis</p>
                </div>
                <span className={`material-symbols-outlined ${styles.headerIcon}`}>insights</span>
              </div>

              <div className={styles.radarContainer}>
                <div className={styles.radarWrapper}>
                  <FlavorRadarChart data={chartData} color="var(--primary)" height={200} />
                </div>

                <div className={styles.dataGrid}>
                  {flavorFields.map(f => {
                    const value = displayNote.flavor_axes?.[f.name] || 0;
                    const isActive = value > 7;
                    return (
                      <div key={f.name} className={styles.dataItem}>
                        <span className={`${styles.dot} ${isActive ? styles.activeDot : ''}`}></span>
                        <div className={styles.dataTexts}>
                          <span className={`${styles.label} ${isActive ? styles.activeLabel : ''}`}>{f.label}</span>
                          <span className={styles.value}>{value.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tasting Section */}
        <section className={styles.tastingSection}>
          <div className={styles.tastingCard}>
            <span className={styles.bentoLabel}>Tasting Experience</span>
            <p className={styles.mainComment}>
              {displayNote.comment || 'No tasting notes recorded yet.'}
            </p>
            {!displayNote.comment && (
              <p className={styles.subComment}>
                Add more details about your experience with this spirit to help build your flavor profile.
              </p>
            )}
          </div>
        </section>
      </main>

      {/* Fixed Bottom Footer (Mobile) */}
      <div className={styles.fixedFooter}>
        <button 
          className={styles.bottomBtn}
          onClick={() => navigate(`/notes/${displayNote.id}/edit`)}
        >
          Edit Note
        </button>
      </div>
    </div>
  );
};

export default NoteDetail;
