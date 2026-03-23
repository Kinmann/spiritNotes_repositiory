import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TastingNoteCard.module.scss';

const TastingNoteCard = ({ note, variant = 'dashboard' }) => {
  const [imgError, setImgError] = React.useState(false);
  const { title, spiritName, rating, imageUrl, image, note: teaser } = note;
  const displayImage = imageUrl || image;
  const navigate = useNavigate();

  if (variant === 'stat') {
    return (
      <div 
        onClick={() => navigate(`/notes/${note.id}`)}
        className={styles.statCard}
      >
        <div className={styles.statImageWrapper}>
          {displayImage && !imgError ? (
            <img src={displayImage} alt={spiritName} onError={() => setImgError(true)} />
          ) : (
            <div className={styles.placeholder}>
              <span className="material-symbols-outlined">liquor</span>
            </div>
          )}
          <div className={styles.statRatingBadge}>
            <span className="material-symbols-outlined">star</span>
            <span className={styles.ratingValue}>{rating?.toFixed(1) || '0.0'}</span>
          </div>
        </div>
        
        <div className={styles.statContent}>
          <div className={styles.statTitles}>
            <h5 className={styles.statName}>{title || spiritName}</h5>
          </div>

          <div className={styles.statSpecList}>
            <div className={styles.statSpecItem}>
              <span className={styles.statSpecLabel}>Category</span>
              <span className={styles.statSpecValue}>{note.category || "Whiskey > Scotch"}</span>
            </div>
            <div className={styles.statSpecItem}>
              <span className={styles.statSpecLabel}>Spirit</span>
              <span className={styles.statSpecValue}>{spiritName || "Unknown"}</span>
            </div>
          </div>

          <div className={styles.statSpecGrid}>
            <div className={styles.statSmallSpec}>
              <p className={styles.smallSpecLabel}>ABV</p>
              <p className={styles.smallSpecValue}>{note.abv || "40.0%"}</p>
            </div>
            <div className={styles.statSmallSpec}>
              <p className={styles.smallSpecLabel}>Vol</p>
              <p className={styles.smallSpecValue}>{note.volume || "700ml"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'collection') {
    // Robust date parsing
    let dateObj = null;
    if (note.date instanceof Date) {
      dateObj = note.date;
    } else if (note.date && typeof note.date.toDate === 'function') {
      dateObj = note.date.toDate();
    } else if (note.date) {
      dateObj = new Date(note.date);
    }

    const formattedDate = (dateObj && !isNaN(dateObj)) 
      ? dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        })
      : "Oct 12, 2023"; // Fallback

    return (
      <div 
        onClick={() => navigate(`/notes/${note.id}`)}
        className={styles.bentoCard}
      >
        <div className={styles.bentoImageWrapper}>
          {displayImage && !imgError ? (
            <img 
              src={displayImage} 
              alt={spiritName} 
              className={styles.bentoImage}
              onError={() => setImgError(true)} 
            />
          ) : (
            <div className={styles.bentoPlaceholder}>
              <span className="material-symbols-outlined">liquor</span>
            </div>
          )}
          <div className={styles.bentoRatingBadge}>
            <span className="material-symbols-outlined">star</span>
            <span>{rating?.toFixed(1) || '0.0'}</span>
          </div>
        </div>

        <div className={styles.bentoContent}>
          <div className={styles.bentoTitles}>
            <h5 className={styles.bentoName}>{title || spiritName}</h5>
          </div>

          <div className={styles.bentoMeta}>
            <div className={styles.bentoMetaItem}>
              <span className={styles.bentoMetaLabel}>
                <span className="material-symbols-outlined">liquor</span>
                Spirit
              </span>
              <span className={styles.bentoMetaValue}>{spiritName || "Unknown"}</span>
            </div>
            <div className={styles.bentoMetaItem}>
              <span className={styles.bentoMetaLabel}>
                <span className="material-symbols-outlined">calendar_today</span>
                Tasted on
              </span>
              <span className={styles.bentoMetaValue}>{formattedDate || "Oct 12, 2023"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard / Slider Variant (Default)
  return (
    <div 
      onClick={() => navigate(`/notes/${note.id}`)}
      className={styles.dashboardCard}
    >
      <div className={styles.imageContainer}>
        {displayImage && !imgError ? (
          <img src={displayImage} alt={spiritName} onError={() => setImgError(true)} />
        ) : (
          <div className={styles.placeholder}>
            <span className="material-symbols-outlined">liquor</span>
          </div>
        )}
        <div className={styles.ratingBadge}>
          <span className={`material-symbols-outlined ${styles.starIcon}`}>star</span>
          <span className={styles.ratingValue}>{rating?.toFixed(1) || '0.0'}</span>
        </div>
      </div>
      <div className={styles.info}>
        <div className={styles.cardHeader}>
          <h4>{title || spiritName}</h4>
          <span className="material-symbols-outlined text-gold">more_vert</span>
        </div>
        {title && <p className={styles.spiritName}>{spiritName}</p>}
        <p className={styles.teaser}>
          {teaser || "Intense peat smoke with a rich, dried fruit sweetness..."}
        </p>
      </div>
    </div>
  );
};

export default TastingNoteCard;

