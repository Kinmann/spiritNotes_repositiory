import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import styles from './BottomNav.module.scss';

const BottomNav = () => {
  const location = useLocation();

  if (location.pathname === '/login') return null;

  const navItems = [
    { icon: 'home', label: 'Home', path: '/' },
    { icon: 'liquor', label: 'Collection', path: '/collection' },
    { icon: 'add', label: 'Add', path: '/notes/new', isFAB: true },
    { icon: 'menu_book', label: 'Encyclopedia', path: '/encyclopedia' },
    { icon: 'query_stats', label: 'DNA', path: '/dna' },
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        
        if (item.isFAB) {
          return (
            <NavLink 
              key={item.path}
              to={item.path} 
              className={cn(styles.fabContainer, isActive && styles.fabActive)}
            >
              <div className={styles.fabWrapper}>
                <div className={styles.fabButton}>
                  <span className="material-symbols-outlined">add</span>
                </div>
              </div>
              <span className={styles.fabLabel}>{item.label}</span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={item.label}
            to={item.path}
            className={cn(
              styles.navItem,
              isActive ? styles.navItemActive : styles.navItemInactive
            )}
          >
            <span className={`material-symbols-outlined ${styles.itemIcon}`}>
              {item.icon}
            </span>
            <span className={styles.itemLabel}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;

