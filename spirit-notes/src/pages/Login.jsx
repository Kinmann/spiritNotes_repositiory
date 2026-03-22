import React, { useState } from 'react';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.scss';
import { cn } from '@/lib/utils';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const { login, register, loginWithGoogle, error } = useAuthStore();
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isRegistering) {
      const { success, error } = await register(email, password);
      if (!success) toast.error(error);
      else {
        toast.success('Welcome to the Private Reserve');
        navigate('/');
      }
    } else {
      const { success, error } = await login(email, password);
      if (!success) toast.error(error);
      else {
        toast.success('Welcome back, Connoisseur');
        navigate('/');
      }
    }
  };

  const handleGoogleLogin = async () => {
    const { success, error } = await loginWithGoogle();
    if (!success) toast.error(error);
    else {
      toast.success('Authenticated via Google');
      navigate('/');
    }
  };


  return (
    <div className={styles.container}>
      {/* Dynamic Background Elements */}
      <div className={styles.bgBlob1} />
      <div className={styles.bgBlob2} />
      
      <div className={styles.contentWrapper}>
        <div className={styles.header}>
          <div className={styles.iconBox}>
            <span className={`material-symbols-outlined ${styles.icon}`} style={{ fontVariationSettings: "'FILL' 1" }}>cognac</span>
          </div>
          <h1 className={styles.title}>The Private Reserve</h1>
          <p className={styles.subtitle}>Digital Tasting Vault</p>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>
              {isRegistering ? 'Join the Reserve' : 'Verify Identity'}
            </h2>
            <p>
              {isRegistering ? 'Create your profile to start your journey.' : 'Enter your credentials to access your vault.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className={styles.form}>
            <div className={styles.fieldsWrapper}>
              <div className={styles.fieldGroup}>
                <span className={`material-symbols-outlined ${styles.fieldIcon}`}>mail</span>
                <input 
                  type="email" 
                  placeholder="Registry Email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  autoComplete="email"
                  required 
                />
              </div>
              <div className={styles.fieldGroup}>
                <span className={`material-symbols-outlined ${styles.fieldIcon}`}>lock</span>
                <input 
                  type="password" 
                  placeholder="Master Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  autoComplete="current-password"
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
            >
              <span>{isRegistering ? 'Initialize Profile' : 'Access Vault'}</span>
              <span className={`material-symbols-outlined ${styles.submitIcon}`}>arrow_forward</span>
            </button>
          </form>

          <div className={styles.dividerWrapper}>
            <div className={styles.dividerLine}></div>
            <span className={styles.dividerText}>Credential Proxy</span>
            <div className={styles.dividerLine}></div>
          </div>

          <div className={styles.secondaryActions}>
            <button 
              type="button" 
              onClick={handleGoogleLogin}
              className={styles.googleButton}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
              <span>Google Authentication</span>
            </button>
          </div>

          <div className={styles.footerWrapper}>
            <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className={styles.footerLink}
            >
              {isRegistering ? 'Already Enrolled? Sign In' : 'New Member? Create Account'}
            </button>
          </div>
        </div>
        
        <p className={styles.disclaimer}>
          Est. 2024 • Secured by Spirit Protocol
        </p>
      </div>
    </div>
  );
};

export default Login;
