import React from 'react';
import styles from './RatingPicker.module.scss';

/**
 * RatingPicker Component
 * Interactive rating picker from 0 to 5 in 0.5 increments.
 * 
 * @param {Object} props
 * @param {number} props.value - Current rating
 * @param {Function} props.onChange - Callback for rating change
 */
const RatingPicker = ({ value = 0, onChange }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={styles.ratingPicker}>
      <div className={styles.ratingDisplay}>
        {typeof value === 'number' ? value.toFixed(1) : '0.0'}
      </div>
      <div className={styles.starsContainer}>
        {stars.map((star) => {
          const isFull = value >= star;
          const isHalf = value >= star - 0.5 && value < star;

          return (
            <div key={star} className={styles.starWrapper}>
              <div className={styles.touchAreas}>
                <div 
                  className={styles.halfTouch} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(star - 0.5);
                  }}
                />
                <div 
                  className={styles.fullTouch} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(star);
                  }}
                />
              </div>
              <div className={styles.starIconWrapper}>
                <span 
                  className={`material-symbols-outlined ${styles.starIcon} ${(isFull || isHalf) ? styles.active : styles.inactive}`}
                  style={{ 
                    fontVariationSettings: isFull ? "'FILL' 1" : isHalf ? "'FILL' 0.5" : "'FILL' 0"
                  }}
                >
                  star
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className={styles.hintText}>
        Tap to rate your experience
      </p>
    </div>
  );
};

export default RatingPicker;
