import React from 'react';
import useAuthStore from '@/store/authStore';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.scss';

const Navbar = () => {
  const { user } = useAuthStore();

  return (
    <header className={styles.navbar}>
      <div className={styles.brand}>
        <Link to="/" className={styles.logoLink}>
          <img 
            alt="Spirit Notes Logo" 
            className={styles.logoImg} 
            src="https://lh3.googleusercontent.com/aida/ADBb0ugcO_nGc0111O0_g0Mmzs6UyuQn7ck3T8ZLJArKvJugR6Wc-9UVIG4mivMF4ebOVVFe9jYDpB2O4iSIAlv_5hxN4TSdjyePn5YnZoW5Cx2AS_7lBavk1gycTxlQi_9iGYWjpDWsxPRgDZbX7_aE-Wl-hERwVDinXf0ed29OzuNuucXaAE1DxIYqqX0cvQo0crb3Bzgkj4O_uuyYySefPXQLP3y8zLh39unIGXqyuLklfqhgz8z6_jzDjLHpLA9-JFZ9yOx1bHA"
          />
        </Link>
      </div>
      
      <h1 className={styles.title}>Spirit Notes</h1>

      <div className={styles.actions}>
        <button className={styles.notificationBtn}>
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;

