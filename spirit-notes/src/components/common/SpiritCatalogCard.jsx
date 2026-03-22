import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SpiritCatalogCard.module.scss';
import { cn } from '@/lib/utils';

const SpiritCatalogCard = ({ spirit, onAdd, matchPercent, variant = 'default' }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = React.useState(false);
  const { id, name, category, image, flavor_axes, distillery, origin, abv, volume } = spirit;

  // Use provided flavor_axes or a sensible default for the hero card to ensure visual bars show up
  const displayFlavorAxes = flavor_axes && Object.keys(flavor_axes).length > 0 
    ? flavor_axes 
    : { Peat: 8.5, Floral: 2.0, Fruity: 4.0, Woody: 6.0, Spicy: 4.5, Sweet: 3.5 };

  const handleCardClick = (e) => {
    if (e.target.closest(`.${styles.quickAdd}`)) return;
    navigate(`/spirit/${id}`);
  };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (onAdd) onAdd(spirit);
  };

  if (variant === 'hero') {
    return (
      <div className={cn(styles.catalogCard, styles.heroCard)} onClick={handleCardClick}>
        <div className={styles.heroImageWrapper}>
          {image && !imgError ? (
            <img src={image} alt={name} onError={() => setImgError(true)} />
          ) : (
            <div className={styles.placeholderIconWrapper}>
              <span className="material-symbols-outlined">liquor</span>
            </div>
          )}
          {matchPercent && (
            <div className={styles.matchBadge}>
              {matchPercent}% Match
            </div>
          )}
        </div>
        
        <div className={styles.heroInfo}>
          <div className={styles.heroHeader}>
            <div className={styles.heroTitles}>
              <p className={styles.distilleryName}>{distillery || "Premium Distillery"}</p>
              <h4 className={styles.heroName}>{name}</h4>
            </div>
            <button 
              className={styles.heroQuickAdd} 
              onClick={handleQuickAdd}
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>

          <div className={styles.specList}>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Category</span>
              <span className={styles.specDivider}></span>
              <span className={styles.specValue}>{category || "Whiskey > Scotch"}</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Origin</span>
              <span className={styles.specDivider}></span>
              <span className={styles.specValue}>{origin || "Scotland > Islay"}</span>
            </div>
          </div>

          <div className={styles.specGrid}>
            <div className={styles.smallSpecItem}>
              <p className={styles.smallSpecLabel}>ABV</p>
              <p className={styles.smallSpecValue}>{abv || "43.0%"}</p>
            </div>
            <div className={styles.smallSpecItem}>
              <p className={styles.smallSpecLabel}>VOLUME</p>
              <p className={styles.smallSpecValue}>{volume || "700ml"}</p>
            </div>
          </div>
          
          <div className={styles.flavorRadarContainer}>
            <div className={styles.radarGraphic}>
              <div className={cn(styles.hexagonMask, styles.radarBg, styles.scale100)}></div>
              <div className={cn(styles.hexagonMask, styles.radarBg, styles.scale75)}></div>
              <div className={cn(styles.hexagonMask, styles.radarBg, styles.scale50)}></div>
              <div className={styles.radarValueShape} style={{ 
                clipPath: 'polygon(50% 10%, 90% 35%, 85% 70%, 50% 90%, 15% 70%, 10% 35%)' 
              }}></div>
              
              <span className={cn(styles.radarAxisLabel, styles.axisTop)}>Peat</span>
              <span className={cn(styles.radarAxisLabel, styles.axisTopRight)}>Floral</span>
              <span className={cn(styles.radarAxisLabel, styles.axisBottomRight)}>Woody</span>
              <span className={cn(styles.radarAxisLabel, styles.axisBottom)}>Sweet</span>
              <span className={cn(styles.radarAxisLabel, styles.axisBottomLeft)}>Spicy</span>
              <span className={cn(styles.radarAxisLabel, styles.axisTopLeft)}>Fruity</span>
            </div>

            <div className={styles.radarDataGrid}>
              {Object.entries(displayFlavorAxes).slice(0, 6).map(([key, val]) => (
                <div key={key} className={styles.dataItem}>
                  <span className={cn(styles.dot, val > 5 ? styles.dotPrimary : styles.dotQuiet)}></span>
                  <div className={styles.dataTexts}>
                    <span className={styles.dataLabel}>{key}</span>
                    <span className={styles.dataValue}>{val.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className={styles.fullProfileButton} onClick={handleCardClick}>
            View Full Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.catalogCard} onClick={handleCardClick}>
      {matchPercent && (
        <div className={styles.matchBadge}>
          {matchPercent}%
        </div>
      )}
      
      <button 
        className={styles.quickAdd} 
        onClick={handleQuickAdd}
        title="Add Tasting Note"
      >
        <span className="material-symbols-outlined">add</span>
      </button>

      <div className={styles.imageWrapper}>
        {image && !imgError ? (
          <img src={image} alt={name} onError={() => setImgError(true)} />
        ) : (
          <span className={`material-symbols-outlined ${styles.placeholderIcon}`}>liquor</span>
        )}
      </div>
      <div className={styles.info}>
        <h4>{name}</h4>
        <p>{category || "Single Malt"}</p>
      </div>
    </div>
  );
};

export default SpiritCatalogCard;

