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
            <p className={styles.distilleryTiny}>{note.distillery || "Distillery"}</p>
            <h5 className={styles.statName}>{title || spiritName}</h5>
          </div>

          <div className={styles.statSpecList}>
            <div className={styles.statSpecItem}>
              <span className={styles.statSpecLabel}>Category</span>
              <span className={styles.statSpecValue}>{note.category || "Whiskey > Scotch"}</span>
            </div>
            <div className={styles.statSpecItem}>
              <span className={styles.statSpecLabel}>Origin</span>
              <span className={styles.statSpecValue}>{note.origin || "Scotland > Speyside"}</span>
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
    return (
      <div 
        onClick={() => navigate(`/notes/${note.id}`)}
        className={styles.collectionCard}
      >
        <div className={styles.imageWrapper}>
          {displayImage && !imgError ? (
            <img src={displayImage} alt={spiritName} onError={() => setImgError(true)} />
          ) : (
            <div className={styles.placeholder}>
              <span className="material-symbols-outlined">liquor</span>
            </div>
          )}
        </div>
        <div className={styles.overlay}></div>
        <div className={styles.content}>
          <p className={styles.title}>{title || spiritName}</p>
          {title && <p className={styles.spiritSubtitle}>{spiritName}</p>}
          <div className={styles.ratingRow}>
            <span className={`material-symbols-outlined ${styles.starIcon}`}>star</span>
            <span className={styles.ratingText}>{rating?.toFixed(1) || '0.0'} Rating</span>
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

