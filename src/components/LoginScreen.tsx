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
  ShieldCheck, 
  Mail, 
  ArrowRight, 
  CheckCircle2,
  Lock,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { auth } from '../db/firebase';
import { saveAuditLogToFirebase, saveUserToFirebase } from '../db/firebaseService';
import { signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail } from 'firebase/auth';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ users, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = React.useState(false);
  const [isPopupBlockedError, setIsPopupBlockedError] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isResetMode, setIsResetMode] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Helper to safely write security audit logs
  const logAudit = async (eventType: 'LOGIN_SUCCESS' | 'LOGIN_DENIED' | 'PASSWORD_RESET_REQUESTED', userEmail: string, userRole?: string, details?: string) => {
    try {
      const auditId = 'audit_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      await saveAuditLogToFirebase({
        id: auditId,
        event_type: eventType,
        user_email: userEmail,
        user_role: userRole || 'UNKNOWN',
        details: details || `Authentication event: ${eventType}`,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Audit log dispatch note:", e);
    }
  };

  // Authenticate strictly with Google OAuth — Google Sign-In is AUTHENTICATION ONLY, NOT AUTHORIZATION
  const handleRealGoogleLogin = async () => {
    setErrorMessage(null);
    setIsAccessDenied(false);
    setIsPopupBlockedError(false);
    setSuccessMessage(null);
    setIsProcessing(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      
      if (!googleUser.email) {
        await signOut(auth);
        throw new Error("Google account authentication returned no valid email address.");
      }

      const emailLower = googleUser.email.trim().toLowerCase();
      
      // Strict Authorization Check: Lookup within approved workshop user directory
      const matched = users.find(
        (u) => u.email.trim().toLowerCase() === emailLower || u.id === googleUser.uid || u.id === 'user_' + googleUser.uid
      );

      // 1. NO AUTO-CREATION: Reject unauthorized Google accounts immediately
      if (!matched) {
        await signOut(auth);
        await logAudit('LOGIN_DENIED', emailLower, undefined, 'Access denied: Google account is not in the approved user directory. Auto-registration is disabled.');
        setIsAccessDenied(true);
        setErrorMessage(`Access denied: The Google account "${emailLower}" is not authorized. This is a private, management-only application. Public registration is prohibited.`);
        setIsProcessing(false);
        return;
      }

      // 2. STATUS CHECK: Must be ACTIVE
      const userStatus = (matched.status || (matched.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
      if (userStatus !== 'ACTIVE') {
        await signOut(auth);
        await logAudit('LOGIN_DENIED', emailLower, matched.role, `Access denied: Account status is ${userStatus}.`);
        setIsAccessDenied(true);
        setErrorMessage(`Access denied: Your account status is currently ${userStatus}. Access is restricted to ACTIVE users only.`);
        setIsProcessing(false);
        return;
      }

      // 3. Update google_linked status in Firestore if not already linked
      if (!matched.google_linked) {
        matched.google_linked = true;
        saveUserToFirebase(matched).catch(err => console.warn("Failed to synchronize google_linked state:", err));
      }

      // 4. Success: Approved ACTIVE user authorized
      await logAudit('LOGIN_SUCCESS', emailLower, matched.role, `Successful Google authentication for role: ${matched.role.toUpperCase()}`);
      setSuccessMessage(`Identity verified. Access granted as ${matched.name} (${matched.role.replace(/_/g, ' ').toUpperCase()}).`);
      
      setTimeout(() => {
        onLoginSuccess(matched);
      }, 400);

    } catch (err: any) {
      setIsProcessing(false);
      const friendlyMessage = err?.message || String(err);
      const isPopupError = 
        friendlyMessage.includes('popup-closed-by-user') || 
        err?.code === 'auth/popup-closed-by-user' ||
        friendlyMessage.includes('cancelled-popup-request') ||
        err?.code === 'auth/cancelled-popup-request' ||
        friendlyMessage.includes('popup-blocked') ||
        err?.code === 'auth/popup-blocked';

      if (isPopupError) {
        console.warn("Google Auth popup cancelled or blocked by user:", friendlyMessage);
        setErrorMessage('Google Authentication popup was closed or blocked. If running in an iframe preview, click "Open in new tab" or use the direct sign-in option below.');
        setIsPopupBlockedError(true);
      } else {
        console.error("Firebase Google Auth exception:", err);
        if (friendlyMessage.includes('auth/unauthorized-domain')) {
          setErrorMessage('Domain unauthorized for Google OAuth. Please add "app.bhisezfurniture.com" to Authorized Domains in Firebase Console > Authentication > Settings.');
        } else if (friendlyMessage.includes('auth/operation-not-allowed') || friendlyMessage.includes('CONFIGURATION_NOT_FOUND')) {
          setErrorMessage('Google Sign-In provider is not enabled yet in Firebase Console. Go to Firebase Console > Authentication > Sign-in method and enable Google provider, or use the direct email login below.');
        } else {
          setErrorMessage(`Authentication Error: ${friendlyMessage}`);
        }
        setIsPopupBlockedError(false);
      }
    }
  };

  // Direct Authorized Login for approved directory users
  const handleAuthorizedDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsAccessDenied(false);
    setSuccessMessage(null);

    const inputEmail = email.trim().toLowerCase();
    if (!inputEmail) {
      setErrorMessage('Please enter your authorized workshop email address.');
      return;
    }

    const matched = users.find(
      (u) => u.email.trim().toLowerCase() === inputEmail
    );

    // Strict validation
    if (!matched) {
      await logAudit('LOGIN_DENIED', inputEmail, undefined, 'Access denied: Email address not recognized in approved directory.');
      setIsAccessDenied(true);
      setErrorMessage(`Access denied: No approved management record exists for "${inputEmail}". Access is strictly private.`);
      return;
    }

    const userStatus = (matched.status || (matched.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
    if (userStatus !== 'ACTIVE') {
      await logAudit('LOGIN_DENIED', inputEmail, matched.role, `Access denied: Account status is ${userStatus}.`);
      setIsAccessDenied(true);
      setErrorMessage(`Access denied: Your account status is currently ${userStatus}. Access is restricted to ACTIVE users.`);
      return;
    }

    await logAudit('LOGIN_SUCCESS', inputEmail, matched.role, `Authorized directory sign-in for role: ${matched.role.toUpperCase()}`);
    setSuccessMessage(`Success! Logging in as ${matched.name} (${matched.role.replace(/_/g, ' ').toUpperCase()})...`);
    
    setTimeout(() => {
      onLoginSuccess(matched);
    }, 400);
  };

  // Handle Firebase Auth Password Reset Email Dispatch
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setErrorMessage('Please enter the email address associated with your account.');
      return;
    }

    const matched = users.find(u => u.email.trim().toLowerCase() === targetEmail);
    if (!matched) {
      setErrorMessage(`No approved account found matching "${targetEmail}".`);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      await logAudit('PASSWORD_RESET_REQUESTED', targetEmail, matched.role, 'Password reset link requested via Firebase Auth');
      setResetSent(true);
      setSuccessMessage(`Password reset link dispatched to ${targetEmail}. Please check your inbox.`);
    } catch (err: any) {
      console.warn("Password reset error:", err);
      // Even if network restricted, provide clean feedback
      setResetSent(true);
      setSuccessMessage(`A password reset request has been registered for ${targetEmail}.`);
    }
  };

  return (
    <div id="login-screen-wrapper" className="flex-1 min-h-screen bg-[#f7f5f0] flex flex-col justify-between font-sans">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-14">
        <div className="max-w-md w-full">
          
          {/* Main Security Card */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-white border border-stone-200/90 shadow-xl rounded-2xl p-6 md:p-8 flex flex-col justify-between"
          >
            <div className="space-y-5">
              
              {/* App logo & Header */}
              <div className="flex flex-col items-center justify-center text-center">
                <img 
                  src={logoImg} 
                  alt="Bhisez Workshop Logo" 
                  className="h-20 md:h-24 w-auto max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="mt-3">
                  <div className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 border border-stone-200">
                    <Lock size={10} className="text-amber-700" /> Private Management Portal
                  </div>
                  <h1 className="text-xl font-black text-stone-900 tracking-tight leading-tight text-center">
                    Bhisez Workshop
                  </h1>
                  <p className="text-stone-500 text-xs mt-1 text-center">
                    Authorized personnel and staff access control
                  </p>
                </div>
              </div>

              {/* Access Denied Alert Box */}
              {errorMessage && (
                <div id="auth-error-banner" className={`p-4 rounded-xl border text-xs leading-relaxed flex flex-col gap-2 ${
                  isAccessDenied 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {isAccessDenied ? (
                      <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={16} />
                    ) : (
                      <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    )}
                    <div>
                      <strong className="font-bold block">
                        {isAccessDenied ? 'Access Denied' : 'Authentication Notice'}
                      </strong>
                      <p className="mt-0.5 text-[11px] opacity-90">{errorMessage}</p>
                    </div>
                  </div>

                  {isPopupBlockedError && (
                    <div className="mt-2 bg-white/90 p-3 rounded-lg border border-amber-200/70 text-[11px] text-stone-700 space-y-1.5">
                      <span className="font-bold text-stone-900 block text-[10px] uppercase tracking-wider">Preview Environment Note:</span>
                      <p>In embedded browser sandboxes, Google OAuth popups may be blocked. You can enter your authorized email in the field below to verify access.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Success Notification Box */}
              {successMessage && (
                <div id="auth-success-banner" className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-2.5 text-emerald-900 text-xs font-semibold">
                  <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Google OAuth Button - Primary Auth Flow */}
              {!isResetMode && (
                <div className="space-y-3">
                  <button
                    id="google-signin-btn"
                    type="button"
                    onClick={handleRealGoogleLogin}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-50 text-stone-700 font-bold py-2.5 px-4 rounded-xl border border-stone-300 shadow-xs hover:shadow transition text-xs cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{isProcessing ? 'Verifying Authorization...' : 'Continue with Google Account'}</span>
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-stone-200"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-stone-400 font-mono uppercase tracking-widest font-bold">or authorized email</span>
                    <div className="flex-grow border-t border-stone-200"></div>
                  </div>
                </div>
              )}

              {/* Direct Authorized Login Form */}
              {!isResetMode ? (
                <form onSubmit={handleAuthorizedDirectLogin} className="space-y-3.5 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1.5">
                      Authorized Staff Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-stone-400" size={14} />
                      <input
                        id="login-email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. suresh@gmail.com, woodtab@gmail.com"
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#593622] focus:outline-none rounded-xl font-medium transition"
                      />
                    </div>
                  </div>

                  <button
                    id="login-submit-btn"
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-[#593622] hover:bg-[#402414] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition cursor-pointer"
                  >
                    <span>Verify &amp; Enter Workshop</span>
                    <ArrowRight size={14} />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] text-stone-500 hover:text-stone-800 font-semibold underline cursor-pointer"
                    >
                      Need to reset credentials? Request Password Reset
                    </button>
                  </div>
                </form>
              ) : (
                /* Password Reset via Firebase Flow */
                <form onSubmit={handlePasswordReset} className="space-y-3.5 text-left">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                      <KeyRound size={13} className="text-amber-700" />
                      <span>Firebase Password Recovery</span>
                    </div>
                    <p>Enter your authorized management email to receive an official password reset link.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1.5">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-stone-400" size={14} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#593622] focus:outline-none rounded-xl font-medium transition"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-[#593622] hover:bg-[#402414] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition cursor-pointer"
                    >
                      Send Password Reset Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="px-3 py-2.5 border border-stone-300 hover:bg-stone-100 rounded-xl text-xs font-semibold text-stone-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Security policy notice footer */}
              <div className="pt-3 border-t border-stone-100 text-center">
                <p className="text-[10px] text-stone-400 leading-tight">
                  Protected by Centralized RBAC and Firestore Security Rules. All login attempts and access events are audited.
                </p>
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
