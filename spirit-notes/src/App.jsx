import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import NewNote from './pages/NewNote';
import FlavorDNA from './pages/FlavorDNA';
import Collection from './pages/Collection';
import Encyclopedia from './pages/Encyclopedia';
import NoteDetail from './pages/NoteDetail';
import SpiritDetail from './pages/SpiritDetail';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import useAuthStore from './store/authStore';
import styles from './App.module.scss';

const AppContent = () => {
  const { user, initiationInProgress, firebaseConfigured, init } = useAuthStore();
  const location = useLocation();
  const isSpiritDetail = location.pathname.startsWith('/spirit/');

  useEffect(() => {
    const unsubscribe = init();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [init]);

  if (initiationInProgress) {
    return <div className={styles.loadingScreen}>Loading Spirit Notes...</div>;
  }

  if (!firebaseConfigured) {
    return (
      <div className={styles.loadingScreen}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
          <h2 style={{ marginBottom: 12 }}>Firebase Not Configured</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
            Set the following environment variables in Netlify:<br />
            <code style={{ fontSize: '0.85em' }}>
              VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
              VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      {user && <Navbar />}
      <div className={styles.mainLayout}>
        {user && <Sidebar />}
        <main className={styles.mainContent}>
          <Routes>
            <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/notes/new" element={user ? <NewNote /> : <Navigate to="/login" />} />
            <Route path="/notes/:id/edit" element={user ? <NewNote /> : <Navigate to="/login" />} />
            <Route path="/notes/:id" element={user ? <NoteDetail /> : <Navigate to="/login" />} />
            <Route path="/dna" element={user ? <FlavorDNA /> : <Navigate to="/login" />} />
            <Route path="/collection" element={user ? <Collection /> : <Navigate to="/login" />} />
            <Route path="/encyclopedia" element={user ? <Encyclopedia /> : <Navigate to="/login" />} />
            <Route path="/spirit/:id" element={user ? <SpiritDetail /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
      {user && !isSpiritDetail && <BottomNav />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
