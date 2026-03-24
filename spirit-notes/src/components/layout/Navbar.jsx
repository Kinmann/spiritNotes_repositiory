import React, { useState, useRef, useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.scss';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    navigate('/login');
  };

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

      <div className={styles.actions} ref={dropdownRef}>
        <button 
          className={styles.profileBtn}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {user?.photoURL ? (
            <div className={styles.avatarContainer}>
              <img src={user.photoURL} alt={user.displayName || "Profile"} />
            </div>
          ) : (
            <span className="material-symbols-outlined">account_circle</span>
          )}
        </button>

        {showDropdown && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span className={styles.userName}>{user?.displayName || user?.email || 'User'}</span>
            </div>
            <div className={styles.dropdownDivider} />
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

