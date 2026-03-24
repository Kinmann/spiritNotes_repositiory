import React, { useState } from 'react';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.scss';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  const { login, register, loginWithGoogle } = useAuthStore();
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
    <div className={`${styles.container} ${showEmailForm ? styles.emailFormActive : ''}`}>
      {!showEmailForm ? (
        <>
          <div className={styles.ambientBg}>
            <div className={styles.blob1} />
            <div className={styles.blob2} />
          </div>

          <main className={styles.main}>
            <div className={styles.logoSection}>
              <div className={styles.logoContainer}>
                <img 
                  src="/logo.png" 
                  alt="Spirit Notes Gold Logo" 
                />
              </div>
              <div className={styles.textContainer}>
                <h1>Welcome to Spirit Notes</h1>
                <p>Your personal whiskey companion</p>
              </div>
            </div>

            <div className={styles.authCard}>
              <div className={styles.socialSection}>
                <button className={styles.googleButton} onClick={handleGoogleLogin}>
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
                <button 
                  className={styles.emailButton} 
                  onClick={() => setShowEmailForm(true)}
                >
                  <span className="material-symbols-outlined">mail</span>
                  <span>Sign in with Email</span>
                </button>
              </div>

              <div className={styles.footerLinks}>
                <button className={styles.forgotBtn}>Forgot your password?</button>
                <p className={styles.signupText}>
                  New to the collection? <button className={styles.signupBtn}>Request Access</button>
                </p>
              </div>
            </div>

            <div className={styles.legalSection}>
              <p>
                By entering, you confirm you are of legal drinking age.<br/>
                Crafted for those who appreciate the amber spirit.
              </p>
            </div>
          </main>

          <div className={styles.decorativeIcon}>
            <span className="material-symbols-outlined icon">liquor</span>
          </div>
        </>
      ) : (
        <>
          <header className={styles.header}>
            <button className={styles.backBtn} onClick={() => setShowEmailForm(false)}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </header>

          <main className={`${styles.main} ${styles.emailMain}`}>
            <div className={styles.brandSection}>
              <div className={styles.logoWrapper}>
                <img 
                  src="/logo.png" 
                  alt="Spirit Notes Gold Logo" 
                />
              </div>
              <h1>
                {isRegistering ? 'Create Your Account' : 'Sign In with Email'}
              </h1>
              <p>Continue your sensory journey.</p>
            </div>

            <div className={`${styles.authCard} ${styles.emailCard}`}>
              <form onSubmit={handleAuth} className="space-y-8">
                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email Address</label>
                  <div className={styles.inputWrapper}>
                    <input 
                      type="email" 
                      id="email"
                      placeholder="name@cellar.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <div className={styles.labelRow}>
                    <label htmlFor="password">Password</label>
                    <button type="button" className={styles.forgotTextBtn}>
                      Forgot?
                    </button>
                  </div>
                  <div className={styles.inputWrapper}>
                    <input 
                      type="password" 
                      id="password"
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <p className={styles.formFooter}>
                  {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsRegistering(!isRegistering);
                    }}
                  >
                    {isRegistering ? 'Login here' : 'Create Entry'}
                  </a>
                </p>
              </form>
            </div>

            <div className={styles.primaryActionWrapper}>
              <button 
                className={styles.primaryBtn} 
                onClick={handleAuth}
              >
                <span>
                  {isRegistering ? 'Request Access' : 'Sign In'}
                </span>
              </button>
              <p className={styles.legalFooter}>
                By entering you confirm you are of legal drinking age in your territory.
              </p>
            </div>
          </main>

          <div className={styles.tonalLayer}>
            <div className={styles.gradient} />
          </div>
        </>
      )}
    </div>
  );
};

export default Login;
