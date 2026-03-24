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
            src="/logo.png"
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

