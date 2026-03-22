import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import useAuthStore from '@/store/authStore';
import styles from './Sidebar.module.scss';

const navItems = [
  { icon: 'home', label: 'Home', path: '/' },
  { icon: 'add_circle', label: 'New Note', path: '/notes/new' },
  { icon: 'fingerprint', label: 'Flavor DNA', path: '/dna' },
  { icon: 'liquor', label: 'Collection', path: '/collection' },
  { icon: 'menu_book', label: 'Encyclopedia', path: '/encyclopedia' },
];

const Sidebar = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navArea}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                styles.navItem,
                isActive ? styles.navItemActive : styles.navItemInactive
              )
            }
          >
            <span 
              className={`material-symbols-outlined ${styles.icon}`}
              style={{ fontVariationSettings: "'FILL' 0" }} // We don't fill icons in sidebar for cleaner look
            >
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      
      <div className={styles.bottomArea}>
        <button className={styles.logoutButton} onClick={handleLogout}>
          <span className="material-symbols-outlined">logout</span>
          Logout
        </button>

      </div>
    </aside>
  );
};

export default Sidebar;
