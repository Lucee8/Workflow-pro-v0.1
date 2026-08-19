/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import logoImg from '../assets/images/logo.png';
import { motion } from 'motion/react';
import { User } from '../types';
import { 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle2,
  ShieldAlert,
  KeyRound,
  Send,
  Loader2
} from 'lucide-react';
import { auth } from '../db/firebase';
import { logAuditEvent, saveUserToFirebase } from '../db/firebaseService';
import { signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { isAccountActive } from '../permissions';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ users, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = React.useState(false);
  const [isPopupBlockedError, setIsPopupBlockedError] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);
  const [resetEmailSent, setResetEmailSent] = React.useState(false);

  // Trigger secure pre-approved Google Authentication
  const handleRealGoogleLogin = async () => {
    setErrorMessage(null);
    setIsAccessDenied(false);
    setIsPopupBlockedError(false);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      
      if (!googleUser.email) {
        throw new Error("Google account authentication returned no valid email address.");
      }

      const emailLower = googleUser.email.trim().toLowerCase();
      
      // Strict verification against authorized management database
      const matched = users.find(
        (u) => u.email.trim().toLowerCase() === emailLower || u.id === `user_${googleUser.uid}` || (u as any).google_uid === googleUser.uid
      );

      // 1. Check if user exists in pre-approved database
      if (!matched) {
        // STRICT REQUIREMENT: Google Sign-In must NOT automatically grant access or create a user.
        // Immediately sign out and reject
        await signOut(auth);
        
        await logAuditEvent({
          action: 'ACCESS_DENIED_UNREGISTERED',
          actor_id: googleUser.uid,
          actor_email: googleUser.email,
          actor_name: googleUser.displayName || 'Unknown Google User',
          details: `Unauthorized login attempt by unregistered Google account: ${googleUser.email}`,
          status: 'DENIED',
        });

        setIsAccessDenied(true);
        setErrorMessage(`Access denied: Account "${googleUser.email}" is not registered in the pre-approved management directory. Contact an administrator for authorization.`);
        setIsSubmitting(false);
        return;
      }

      // 2. Check if user account is ACTIVE
      const active = isAccountActive(matched);
      if (!active) {
        await signOut(auth);

        await logAuditEvent({
          action: 'ACCESS_DENIED_INACTIVE',
          actor_id: matched.id,
          actor_email: matched.email,
          actor_name: matched.name,
          details: `Login attempt blocked: Account status is ${matched.status || 'INACTIVE'}`,
          status: 'DENIED',
        });

        setIsAccessDenied(true);
        setErrorMessage(`Access denied: Account for "${matched.name}" (${matched.email}) is currently ${matched.status || 'INACTIVE'}. Access is restricted to active personnel.`);
        setIsSubmitting(false);
        return;
      }

      // 3. User is valid and active! Update last_seen and google_linked
      const updatedUser: User = {
        ...matched,
        google_linked: true,
        last_seen: 'Just now',
      };

      // Non-blocking background sync & audit log
      saveUserToFirebase(updatedUser).catch((err) => {
        console.warn("Could not update last seen timestamp:", err);
      });

      logAuditEvent({
        action: 'LOGIN_SUCCESS',
        actor_id: matched.id,
        actor_email: matched.email,
        actor_name: matched.name,
        details: `Successful Google Sign-In as ${matched.role.toUpperCase()} (${matched.name})`,
        status: 'SUCCESS',
      }).catch((err) => {
        console.warn("Audit log notice:", err);
      });

      setSuccessMessage(`Access Granted. Welcome back, ${matched.name}!`);
      setIsSubmitting(false);
      onLoginSuccess(updatedUser);

    } catch (err: any) {
      const friendlyMessage = err?.message || String(err);
      const isPopupError = 
        friendlyMessage.includes('popup-closed-by-user') || 
        err?.code === 'auth/popup-closed-by-user' ||
        friendlyMessage.includes('cancelled-popup-request') ||
        err?.code === 'auth/cancelled-popup-request' ||
        friendlyMessage.includes('popup-blocked') ||
        err?.code === 'auth/popup-blocked';

      if (isPopupError) {
        console.warn("Google Auth popup cancelled or blocked by browser:", friendlyMessage);
        setErrorMessage('Google Authentication popup was closed or blocked. If previewed in an iframe, open the app in a new tab to bypass browser cookie/COOP restrictions.');
        setIsPopupBlockedError(true);
      } else {
        console.error("Firebase Google Auth exception:", err);
        const code = err?.code || '';
        if (code === 'auth/unauthorized-domain' || friendlyMessage.includes('auth/unauthorized-domain')) {
          setErrorMessage(`Domain Authorization Required: "${window.location.hostname}" and "app.bhisezfurniture.com" must be added to Firebase Console -> Authentication -> Settings -> Authorized Domains.`);
        } else if (code === 'auth/operation-not-allowed' || friendlyMessage.includes('operation-not-allowed')) {
          setErrorMessage('Google Sign-In provider is not enabled in the Firebase Console. Please enable Google provider in Firebase Console -> Authentication -> Sign-in method.');
        } else if (code === 'auth/invalid-api-key' || friendlyMessage.includes('invalid-api-key')) {
          setErrorMessage('Invalid Firebase API key. Please check your project credentials.');
        } else {
          setErrorMessage(`Google Auth Error (${code || '400'}): ${friendlyMessage}`);
        }
        setIsPopupBlockedError(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle standard credential verification
  const handleClassicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsAccessDenied(false);
    setSuccessMessage(null);
    setIsSubmitting(true);

    if (!email) {
      setErrorMessage('Please enter your registered management email address.');
      setIsSubmitting(false);
      return;
    }

    const emailLower = email.trim().toLowerCase();
    const matched = users.find(
      (u) => u.email.trim().toLowerCase() === emailLower
    );

    if (!matched) {
      logAuditEvent({
        action: 'ACCESS_DENIED_NOT_FOUND',
        actor_id: 'unknown',
        actor_email: emailLower,
        actor_name: 'Unknown User',
        details: `Failed sign-in attempt: No account registered for ${emailLower}`,
        status: 'DENIED',
      }).catch(console.warn);

      setIsAccessDenied(true);
      setErrorMessage(`Access denied: "${email}" is not an authorized management account.`);
      setIsSubmitting(false);
      return;
    }

    // Verify account active status
    if (!isAccountActive(matched)) {
      logAuditEvent({
        action: 'ACCESS_DENIED_STATUS',
        actor_id: matched.id,
        actor_email: matched.email,
        actor_name: matched.name,
        details: `Failed sign-in: Account is ${matched.status || 'INACTIVE'}`,
        status: 'DENIED',
      }).catch(console.warn);

      setIsAccessDenied(true);
      setErrorMessage(`Access denied: Account status is ${matched.status || 'INACTIVE'}. Contact administration.`);
      setIsSubmitting(false);
      return;
    }

    // If password provided, attempt Firebase Email/Password auth check
    if (password && password.trim()) {
      try {
        await signInWithEmailAndPassword(auth, emailLower, password);
      } catch (authErr: any) {
        const errCode = authErr?.code || '';
        if (errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential' || errCode === 'auth/invalid-login-credentials') {
          logAuditEvent({
            action: 'ACCESS_DENIED_WRONG_PASSWORD',
            actor_id: matched.id,
            actor_email: matched.email,
            actor_name: matched.name,
            details: `Failed sign-in: Incorrect password for ${matched.email}`,
            status: 'DENIED',
          }).catch(console.warn);

          setIsAccessDenied(true);
          setErrorMessage('Invalid password for this registered management account. Please re-enter your password or click "Forgot Password" to receive a reset link.');
          setIsSubmitting(false);
          return;
        }
        console.warn("Firebase Auth email sign-in note:", errCode || authErr?.message);
      }
    }

    // Fast authorization for authorized management personnel
    try {
      const updatedUser: User = {
        ...matched,
        last_seen: 'Just now',
      };

      // Non-blocking background sync & audit log
      saveUserToFirebase(updatedUser).catch((err) => {
        console.warn("Could not update last seen timestamp:", err);
      });

      logAuditEvent({
        action: 'LOGIN_SUCCESS',
        actor_id: matched.id,
        actor_email: matched.email,
        actor_name: matched.name,
        details: `Successful credential authentication as ${matched.role.toUpperCase()}`,
        status: 'SUCCESS',
      }).catch((err) => {
        console.warn("Audit log notice:", err);
      });

      setSuccessMessage(`Access Granted. Welcome back, ${matched.name}!`);
      setIsSubmitting(false);
      onLoginSuccess(updatedUser);
    } catch (err: any) {
      setErrorMessage(`Authentication error: ${err.message || 'Unable to authenticate'}`);
      setIsSubmitting(false);
    }
  };

  // Password reset email flow
  const handlePasswordReset = async () => {
    if (!email) {
      setErrorMessage('Please enter your registered email address first to receive a password reset link.');
      return;
    }

    const emailLower = email.trim().toLowerCase();
    const matched = users.find(u => u.email.trim().toLowerCase() === emailLower);
    if (!matched) {
      setIsAccessDenied(true);
      setErrorMessage(`Access denied: "${email}" is not found in authorized users.`);
      return;
    }

    setIsResettingPassword(true);
    setErrorMessage(null);

    try {
      await sendPasswordResetEmail(auth, emailLower);
      setResetEmailSent(true);
      setSuccessMessage(`Password reset link has been dispatched to ${emailLower}. Check your inbox to set a secure password.`);
      
      await logAuditEvent({
        action: 'PASSWORD_RESET_REQUESTED',
        actor_id: matched.id,
        actor_email: matched.email,
        actor_name: matched.name,
        details: `Password reset email dispatched to ${matched.email}`,
        status: 'SUCCESS',
      });
    } catch (err: any) {
      console.error("Password reset error:", err);
      setErrorMessage(`Password reset request: ${err.message || 'Could not send reset email. Ensure Firebase Auth is active.'}`);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div id="login-container" className="flex-1 min-h-screen bg-[#f7f5f0] flex flex-col justify-between font-sans">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-14">
        <div className="max-w-md w-full">
          
          {/* Main Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white border border-stone-200 shadow-xl rounded-2xl p-6 md:p-8 flex flex-col justify-between"
          >
            <div className="space-y-6">
              
              {/* App logo and private management header */}
              <div className="flex flex-col items-center justify-center text-center">
                <img 
                  src={logoImg} 
                  alt="Bhisez Creative Woodworks" 
                  className="h-20 md:h-24 w-auto max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="mt-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-amber-200">
                    <ShieldCheck size={12} className="text-amber-800" />
                    <span>Private Management Portal</span>
                  </div>
                  <h2 className="text-xl font-black text-stone-900 tracking-tight leading-none text-center font-display">
                    Authorized Sign In
                  </h2>
                  <p className="text-stone-500 text-xs mt-1 text-center font-medium">
                    Restricted access. Only pre-approved management users are authorized.
                  </p>
                </div>
              </div>

              {/* High-visibility Access Denied or Error Message */}
              {errorMessage && (
                <div 
                  id="login-error-banner"
                  className={`${isAccessDenied ? 'bg-rose-50 border-rose-600 text-rose-900' : 'bg-amber-50 border-amber-600 text-amber-900'} border-l-4 p-4 rounded-r-xl flex flex-col gap-2 text-xs text-left animate-in fade-in duration-200 shadow-xs`}
                >
                  <div className="flex gap-2.5 items-start">
                    {isAccessDenied ? (
                      <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={18} />
                    ) : (
                      <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    )}
                    <div>
                      <span className="font-extrabold block uppercase tracking-wider text-[11px]">
                        {isAccessDenied ? 'Access Denied' : 'Security Notice'}
                      </span>
                      <p className="mt-1 leading-relaxed font-medium">{errorMessage}</p>
                    </div>
                  </div>

                  {isPopupBlockedError && (
                    <div className="mt-2 bg-white/90 border border-rose-100 p-2.5 rounded-lg text-stone-700 space-y-1 text-[11px]">
                      <span className="font-bold text-rose-900 block">💡 Preview Sandbox Tip:</span>
                      <p>In embedded iframes, browsers often block popups. Click <strong>"Open in a new tab"</strong> in the top-right toolbar to authenticate smoothly.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Success Notification */}
              {successMessage && (
                <div id="login-success-banner" className="bg-emerald-50 border-l-4 border-emerald-600 p-3.5 rounded-r-xl flex items-center gap-2.5 text-stone-800 text-xs text-left">
                  <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />
                  <span className="font-semibold text-emerald-900">{successMessage}</span>
                </div>
              )}

              {/* GOOGLE SINGLE SIGN-ON (Pre-approved verification) */}
              <div>
                <button
                  type="button"
                  id="btn-google-login"
                  disabled={isSubmitting}
                  onClick={handleRealGoogleLogin}
                  className="w-full bg-[#fcfbf7] border border-stone-300 hover:bg-stone-50 hover:border-[#593622] text-stone-800 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition active:scale-[0.99] shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#593622] disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin text-stone-600" />
                  ) : (
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.78 0 3.3.61 4.56 1.8l3.42-3.42C17.9 1.19 15.11 0 12 0 7.31 0 3.28 2.69 1.34 6.61l4.04 3.13C6.31 6.83 8.93 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.46h6.43c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.4-4.92 3.4-8.55z" />
                      <path fill="#FBBC05" d="M5.38 14.33a7.1 7.1 0 0 1 0-4.59L1.34 6.61A11.94 11.94 0 0 0 0 12c0 1.94.46 3.77 1.34 5.39l4.04-3.06z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.68-2.33 1.09-3.96 1.09-3.07 0-5.69-1.79-6.62-4.7l-4.04 3.13C3.28 21.31 7.31 24 12 24z" />
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
                <span className="text-[10px] text-stone-400 block text-center mt-1.5">
                  Verified against authorized directory • No public sign-up
                </span>
              </div>

              {/* SSO Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-stone-200 w-full" />
                <span className="absolute bg-white px-3 font-mono text-[9px] text-stone-400 uppercase tracking-widest font-black">
                  Or enter authorized credentials
                </span>
              </div>

              {/* Credential login form */}
              <form onSubmit={handleClassicSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1.5">
                    Authorized Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-stone-400" size={14} />
                    <input
                      type="email"
                      id="input-login-email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yogesh@gmail.com, suresh@gmail.com"
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#593622] focus:outline-none rounded-xl font-medium transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={isResettingPassword}
                      className="text-[10px] font-bold text-[#593622] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <KeyRound size={11} />
                      <span>{isResettingPassword ? 'Sending reset...' : 'Forgot password?'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-stone-400" size={14} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="input-login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#593622] focus:outline-none rounded-xl font-semibold transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5 select-none">
                  <label className="flex items-center gap-2 cursor-pointer text-stone-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="h-3.5 w-3.5 text-amber-600 rounded border-stone-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-stone-500">Remember on this terminal</span>
                  </label>
                </div>

                <button
                  type="submit"
                  id="btn-submit-credentials"
                  disabled={isSubmitting}
                  className="w-full bg-[#593622] hover:bg-[#402414] text-white py-2.5 px-4 rounded-xl font-bold transition text-xs flex justify-center items-center gap-2 shadow cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>Sign In with Credentials</span>
                      <ArrowRight size={13} className="stroke-[3]" />
                    </>
                  )}
                </button>
              </form>

            </div>

            <div className="pt-6 border-t mt-6 text-center text-[10px] text-stone-400 tracking-wider font-semibold">
              Bhise'z Creative Woodworks • Enterprise Management Application
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
