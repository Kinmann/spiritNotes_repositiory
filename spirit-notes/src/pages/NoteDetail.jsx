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
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </header>

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.imageWrapper}>
            {(displayNote.imageUrl || displayNote.image) ? (
              <img 
                src={displayNote.imageUrl || displayNote.image} 
                alt={displayNote.name} 
                className={styles.heroImage} 
              />
            ) : (
              <div className={styles.placeholderIconWrapper}>
                <span className={`material-symbols-outlined ${styles.placeholderIcon}`}>liquor</span>
              </div>
            )}
          </div>
        </section>

        {/* Title Section */}
        <section className={styles.titleSection}>
          <h1>{displayNote.title || displayNote.name}</h1>
          <p className={styles.subtitle}>{displayNote.name}</p>
        </section>

        {/* Info Section */}
        <section className={styles.infoSection}>
          {/* Rating & Date */}
          <div className={`${styles.glassCard} ${styles.ratingBox}`}>
            <div className={styles.rating}>
              <span className="material-symbols-outlined starIcon">star</span>
              <span>{displayNote.rating?.toFixed(1) || '0.0'}</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.date}>{formattedDate}</div>
          </div>

          {/* Specifications */}
          <div className={styles.specs}>
            <div className={styles.specItem}>
              <span className={styles.label}>Distillery</span>
              <span className={styles.line}></span>
              <span className={styles.value}>{displayNote.distillery || displayNote.brand || '-'}</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.label}>Category</span>
              <span className={styles.line}></span>
              <span className={styles.value}>
                {displayNote.categoryHierarchy?.join(' > ') || displayNote.category || '-'}
              </span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.label}>Origin</span>
              <span className={styles.line}></span>
              <span className={styles.value}>
                {displayNote.locationHierarchy?.join(' > ') || displayNote.origin || '-'}
              </span>
            </div>

            <div className={styles.specGrid}>
              <div className={styles.gridItem}>
                <p className={styles.gridLabel}>ABV</p>
                <p className={styles.gridValue}>{displayNote.abv ? `${displayNote.abv}%` : '-'}</p>
              </div>
              <div className={styles.gridItem}>
                <p className={styles.gridLabel}>VOLUME</p>
                <p className={styles.gridValue}>{displayNote.volume ? `${displayNote.volume}ml` : '-'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tasting Section */}
        <section className={styles.tastingSection}>
          <div className={`${styles.glassCard} ${styles.tastingCard}`}>
            <h4>Tasting Experience</h4>
            <p className={styles.mainComment}>
              {displayNote.comment || 'No tasting notes recorded yet.'}
            </p>
            {/* Added some decorative text if it's too short */}
            {!displayNote.comment && (
              <p className={styles.subComment}>
                Add more details about your experience with this spirit to help build your flavor profile.
              </p>
            )}
          </div>
        </section>

        {/* Flavor Profile Section */}
        <section className={styles.flavorSection}>
          <div className={`${styles.glassCard} ${styles.flavorCard}`}>
            <div className={styles.cardHeader}>
              <div>
                <h3>Flavor Profile</h3>
                <p>Taste distribution analysis</p>
              </div>
              <span className={`material-symbols-outlined ${styles.icon}`}>insights</span>
            </div>

            <div className={styles.flavorContent}>
              {/* Radar Chart Visual */}
              <div className={styles.radarWrapper}>
                <div className={styles.chartContainer}>
                  <FlavorRadarChart data={chartData} color="#e9c176" height={224} />
                </div>
              </div>

              {/* Data Grid */}
              <div className={styles.dataGrid}>
                {flavorFields.map(f => {
                  const value = displayNote.flavor_axes?.[f.name] || 0;
                  const isActive = value > 7;
                  return (
                    <div key={f.name} className={styles.dataItem}>
                      <span className={`${styles.marker} ${isActive ? styles.active : ''}`}></span>
                      <div className={styles.dataInfo}>
                        <span className={`${styles.dataLabel} ${isActive ? styles.active : ''}`}>{f.label}</span>
                        <span className={styles.dataValue}>{value.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Fixed Action */}
      <div className={styles.bottomAction}>
        <button 
          className={styles.editBtn} 
          onClick={() => navigate(`/notes/${displayNote.id}/edit`)}
        >
          <span>Edit Note</span>
        </button>
      </div>
    </div>
  );
};

export default NoteDetail;
