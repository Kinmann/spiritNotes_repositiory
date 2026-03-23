import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SpiritCatalogCard.module.scss';
import { cn } from '@/lib/utils';

const SpiritCatalogCard = ({ spirit, onAdd, matchPercent, variant = 'default' }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = React.useState(false);
  const { id, name, category, image, flavor_axes, distillery, origin, abv, volume, reason } = spirit;

  // Use provided flavor_axes or a sensible default for visual demonstration if data missing
  const defaultAxes = { peat: 0, floral: 0, fruity: 0, woody: 0, spicy: 0, sweet: 0 };
  const combinedAxes = { ...defaultAxes, ...(flavor_axes || {}) };
  
  // Format for display (TitleCase)
  const displayFlavorAxes = {
    Peat: combinedAxes.peat || combinedAxes.Peat || 0,
    Floral: combinedAxes.floral || combinedAxes.Floral || 0,
    Woody: combinedAxes.woody || combinedAxes.Woody || 0,
    Sweet: combinedAxes.sweet || combinedAxes.Sweet || 0,
    Spicy: combinedAxes.spicy || combinedAxes.Spicy || 0,
    Fruity: combinedAxes.fruity || combinedAxes.Fruity || 0
  };

  // Calculate dynamic clip-path for radar shape
  const calculateRadarPolygon = (axes) => {
    // Exact order matching the radar labels and hexagon layout
    const keys = ['Peat', 'Floral', 'Woody', 'Sweet', 'Spicy', 'Fruity'];
    const center = 50;
    const maxRadius = 40; // max value radius from 50% center
    const points = keys.map((key, i) => {
      const val = Math.min(Math.max(axes[key] || 0, 0), 10) / 10;
      const angle = (i * 60 - 90) * (Math.PI / 180);
      const x = center + Math.cos(angle) * maxRadius * val;
      const y = center + Math.sin(angle) * maxRadius * val;
      return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
    });
    return `polygon(${points.join(', ')})`;
  };

  const handleCardClick = (e) => {
    if (e.target.closest(`.${styles.quickAdd}`)) return;
    navigate(`/spirit/${id}`);
  };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (onAdd) onAdd(spirit);
  };

  const radarPolygon = calculateRadarPolygon(displayFlavorAxes);

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
          {matchPercent != null && (
            <div className={styles.matchBadge}>
              {matchPercent}% Match
            </div>
          )}
        </div>
        
        <div className={styles.heroInfo}>
          <div className={styles.heroHeader}>
            <div className={styles.heroTitles}>
              <p className={styles.distilleryName}>{distillery || "Information Unavailable"}</p>
              <h4 className={styles.heroName}>{name}</h4>
            </div>
            <button 
              className={styles.heroQuickAdd} 
              onClick={handleQuickAdd}
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
          
          {reason && (
            <p className={styles.recommendationReason}>
              {reason}
            </p>
          )}

          <div className={styles.specList}>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Category</span>
              <span className={styles.specDivider}></span>
              <span className={styles.specValue}>{category || "Unknown Category"}</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Origin</span>
              <span className={styles.specDivider}></span>
              <span className={styles.specValue}>{origin || "Unknown Origin"}</span>
            </div>
          </div>

          <div className={styles.specGrid}>
            <div className={styles.smallSpecItem}>
              <p className={styles.smallSpecLabel}>ABV</p>
              <p className={styles.smallSpecValue}>{abv ? `${abv}%` : "—"}</p>
            </div>
            <div className={styles.smallSpecItem}>
              <p className={styles.smallSpecLabel}>VOLUME</p>
              <p className={styles.smallSpecValue}>{volume ? `${volume}ml` : "—"}</p>
            </div>
          </div>
          
          <div className={styles.flavorRadarContainer}>
            <div className={styles.radarGraphic}>
              <div className={cn(styles.hexagonMask, styles.radarBg, styles.scale100)}></div>
              <div className={cn(styles.hexagonMask, styles.radarBg, styles.scale75)}></div>
              <div className={cn(styles.hexagonMask, styles.radarBg, styles.scale50)}></div>
              <div className={styles.radarValueShape} style={{ clipPath: radarPolygon }}></div>
              
              <span className={cn(styles.radarAxisLabel, styles.axisTop)}>Peat</span>
              <span className={cn(styles.radarAxisLabel, styles.axisTopRight)}>Floral</span>
              <span className={cn(styles.radarAxisLabel, styles.axisBottomRight)}>Woody</span>
              <span className={cn(styles.radarAxisLabel, styles.axisBottom)}>Sweet</span>
              <span className={cn(styles.radarAxisLabel, styles.axisBottomLeft)}>Spicy</span>
              <span className={cn(styles.radarAxisLabel, styles.axisTopLeft)}>Fruity</span>
            </div>

            <div className={styles.radarDataGrid}>
              {Object.entries(displayFlavorAxes).map(([key, val]) => (
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
      {matchPercent != null && (
        <div className={styles.matchBadge}>
          {matchPercent}% Match
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
        <div className={styles.gradientOverlay}></div>
      </div>
      
      <div className={styles.info}>
        <div className={styles.titles}>
          <span className={styles.distillery}>{distillery || "Distillery Unknown"}</span>
          <h4>{name}</h4>
        </div>

        <div className={styles.specs}>
          <div className={styles.specRow}>
            <span className={styles.label}>
              <span className="material-symbols-outlined">water_drop</span>
              Category
            </span>
            <span className={styles.value}>{category || "Spirit"}</span>
          </div>
          <div className={styles.specRow}>
            <span className={styles.label}>
              <span className="material-symbols-outlined">location_on</span>
              Origin
            </span>
            <span className={styles.value}>{origin || "Unknown"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpiritCatalogCard;

