/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import logoImg from '../assets/images/logo.png';
import { motion } from 'motion/react';
import { User, UserRole } from '../types';
import {
  AlertCircle,
  ShieldCheck,
  Mail,
  ArrowRight,
  CheckCircle2,
  Lock,
  KeyRound,
  ShieldAlert,
  Copy,
  ExternalLink,
  Globe,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { auth } from '../db/firebase';
import {
  saveAuditLogToFirebase,
  saveUserToFirebase,
  updateUserLoginMetadataInFirebase,
  syncUserAuthMapToFirebase,
  syncOperatorInviteToFirebase,
  markOperatorInvitePasswordConfigured,
  checkOperatorInviteByEmail,
  resolveAuthenticatedUserFromFirebase,
} from '../db/firebaseService';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { isAdminRole, isUserActiveStatus } from './cncHelpers';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

type AuthMode = 'signin' | 'activate' | 'reset';

export default function LoginScreen({ users, onLoginSuccess }: LoginScreenProps) {
  const [authMode, setAuthMode] = React.useState<AuthMode>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = React.useState(false);
  const [isPopupBlockedError, setIsPopupBlockedError] = React.useState(false);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = React.useState(false);
  const [isEmailProviderDisabled, setIsEmailProviderDisabled] = React.useState(false);
  const [offerActivationForEmail, setOfferActivationForEmail] = React.useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyDomain = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2200);
    }
  };

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsAccessDenied(false);
    setIsPopupBlockedError(false);
    setIsUnauthorizedDomain(false);
    setIsEmailProviderDisabled(false);
    setOfferActivationForEmail(null);
  };

  const logAudit = async (
    eventType: 'LOGIN_SUCCESS' | 'LOGIN_DENIED' | 'PASSWORD_RESET_REQUESTED',
    userEmail: string,
    userRole?: string,
    details?: string
  ) => {
    try {
      const auditId = 'audit_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      await saveAuditLogToFirebase({
        id: auditId,
        event_type: eventType,
        user_email: userEmail,
        user_role: userRole || 'UNKNOWN',
        details: details || `Authentication event: ${eventType}`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit log dispatch note:', e);
    }
  };

  /**
   * Resolves an authorized staff member from local cache OR non-PII Firestore operatorInvites.
   */
  const resolvePreApprovedUser = async (targetEmail: string): Promise<User | null> => {
    const emailLower = targetEmail.trim().toLowerCase();
    const localMatch = users.find((u) => u.email.trim().toLowerCase() === emailLower);
    if (localMatch) return localMatch;

    const invite = await checkOperatorInviteByEmail(emailLower);
    if (invite && invite.userId) {
      const fallbackName = invite.name || emailLower.split('@')[0];
      return {
        id: invite.userId,
        name: fallbackName,
        email: emailLower,
        role: (invite.role || 'cnc_operator') as UserRole,
        initials: invite.initials || fallbackName.slice(0, 2).toUpperCase(),
        status: (invite.status || 'ACTIVE') as User['status'],
        is_active: String(invite.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
        password_configured: Boolean(invite.password_configured),
        activation_status: invite.password_configured ? 'ACTIVE' : 'PENDING_ACTIVATION',
        created_at: new Date().toISOString(),
        google_linked: false,
      };
    }
    return null;
  };

  /**
   * Finalizes authenticated Firebase Auth user mapping and enters application.
   */
  const finalizeAuthenticatedSession = async (
    matched: User,
    firebaseUid: string,
    authMethod: 'google' | 'password' | 'activation'
  ) => {
    const emailLower = matched.email.trim().toLowerCase();
    const isBootstrapAdmin = emailLower === 'admin@bhisesworkshop.com';
    const updatedUser: User = {
      ...matched,
      email: emailLower,
      auth_uid: firebaseUid,
      google_linked: authMethod === 'google' ? true : matched.google_linked,
      password_configured: authMethod === 'password' || authMethod === 'activation' ? true : matched.password_configured,
      activation_status: 'ACTIVE',
    };

    try {
      // Bootstrap admin on a fresh DB may need their /users doc created before /userAuthMap
      if (isBootstrapAdmin) {
        await saveUserToFirebase(updatedUser);
      }
      await syncUserAuthMapToFirebase(firebaseUid, updatedUser);
    } catch (mapErr: any) {
      console.error('Firebase UID mapping failed:', mapErr);
      await signOut(auth).catch(() => {});
      await logAudit(
        'LOGIN_DENIED',
        emailLower,
        updatedUser.role,
        `UID mapping failed (${mapErr?.code || mapErr?.message || 'unknown error'}).`
      );
      setIsProcessing(false);
      setIsAccessDenied(true);
      const errCode = mapErr?.code || '';
      const errText = mapErr?.message || String(mapErr);
      setErrorMessage(
        errCode === 'permission-denied' || errText.includes('Missing or insufficient permissions')
          ? `Sign-in succeeded, but Firebase authorization mapping (/userAuthMap) failed for "${emailLower}". Verify your /users record matches this exact email, active status, and role, or contact an Administrator.`
          : `Failed to verify Firebase authorization mapping for "${emailLower}": ${errText}`
      );
      return;
    }

    try {
      if (!isBootstrapAdmin) {
        await updateUserLoginMetadataInFirebase(updatedUser.id, {
          auth_uid: firebaseUid,
          google_linked: updatedUser.google_linked,
          password_configured: updatedUser.password_configured,
          activation_status: 'ACTIVE',
        });
      }
      if (authMethod === 'password' || authMethod === 'activation') {
        if (isAdminRole(updatedUser.role)) {
          await syncOperatorInviteToFirebase(updatedUser);
        } else {
          await markOperatorInvitePasswordConfigured(emailLower);
        }
      }
    } catch (syncErr) {
      console.warn('Post-auth user metadata update notice:', syncErr);
    }

    await logAudit(
      'LOGIN_SUCCESS',
      emailLower,
      updatedUser.role,
      `Authenticated via ${authMethod.toUpperCase()} for role: ${updatedUser.role.toUpperCase()}`
    );

    setSuccessMessage(
      `Identity verified. Entering as ${updatedUser.name} (${updatedUser.role.replace(/_/g, ' ').toUpperCase()}).`
    );

    setTimeout(() => {
      onLoginSuccess(updatedUser);
    }, 350);
  };

  // Authenticate with Google OAuth — Authentication only, checked against directory
  const handleRealGoogleLogin = async () => {
    resetMessages();
    setIsProcessing(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!googleUser.email) {
        await signOut(auth);
        throw new Error('Google account authentication returned no valid email address.');
      }

      const emailLower = googleUser.email.trim().toLowerCase();
      // Prefer authoritative Firestore profile for authenticated user, falling back to local cache or invite
      let matched =
        (await resolveAuthenticatedUserFromFirebase(googleUser.uid, googleUser.email)) ||
        users.find(
          (u) =>
            u.email.trim().toLowerCase() === emailLower ||
            u.auth_uid === googleUser.uid ||
            u.id === googleUser.uid ||
            u.id === 'user_' + googleUser.uid
        ) ||
        (await resolvePreApprovedUser(emailLower)) ||
        undefined;

      if (!matched) {
        await signOut(auth);
        await logAudit(
          'LOGIN_DENIED',
          emailLower,
          undefined,
          'Access denied: Google account is not in the approved user directory.'
        );
        setIsAccessDenied(true);
        setErrorMessage(
          `Access denied: The Google account "${emailLower}" is not authorized. This is a private management application.`
        );
        setIsProcessing(false);
        return;
      }

      if (!isUserActiveStatus(matched)) {
        await signOut(auth);
        const statusLabel = (matched.status || (matched.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
        await logAudit('LOGIN_DENIED', emailLower, matched.role, `Access denied: Account status is ${statusLabel}.`);
        setIsAccessDenied(true);
        setErrorMessage(`Access denied: Your account status is currently ${statusLabel}. Access is restricted to ACTIVE users.`);
        setIsProcessing(false);
        return;
      }

      await finalizeAuthenticatedSession(matched, googleUser.uid, 'google');
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
        setErrorMessage(
          'Google Authentication popup was closed or blocked. Try Email & Password sign-in below or allow popups for this tab.'
        );
        setIsPopupBlockedError(true);
      } else if (
        friendlyMessage.includes('auth/unauthorized-domain') ||
        err?.code === 'auth/unauthorized-domain'
      ) {
        setIsUnauthorizedDomain(true);
        setErrorMessage(
          `The current domain "${currentHostname}" is not yet registered in your Firebase project's Authorized Domains list.`
        );
      } else if (
        friendlyMessage.includes('auth/operation-not-allowed') ||
        friendlyMessage.includes('CONFIGURATION_NOT_FOUND')
      ) {
        setErrorMessage(
          'Google Sign-In provider is not enabled yet in Firebase Console. Enable Google under Authentication → Sign-in method.'
        );
      } else {
        setErrorMessage(`Authentication Error: ${friendlyMessage}`);
      }
    }
  };

  // Sign In with Email + Password (Firebase Auth)
  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const inputEmail = email.trim().toLowerCase();
    if (!inputEmail) {
      setErrorMessage('Please enter your assigned staff email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password (or use "Activate Account" if signing in for the first time).');
      return;
    }

    setIsProcessing(true);
    try {
      // Pre-check if local cache or invite explicitly marks account non-active
      const preCheckMatch = await resolvePreApprovedUser(inputEmail);
      if (preCheckMatch && !isUserActiveStatus(preCheckMatch)) {
        const statusLabel = (preCheckMatch.status || (preCheckMatch.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
        await logAudit('LOGIN_DENIED', inputEmail, preCheckMatch.role, `Access denied: Account status is ${statusLabel}.`);
        setIsAccessDenied(true);
        setErrorMessage(
          `Access denied: Your account status is currently ${statusLabel}. Contact your Administrator to reactivate access.`
        );
        setIsProcessing(false);
        return;
      }

      // Sign in with Firebase Auth first so fresh browsers can read /userAuthMap and /users/{userId}
      const cred = await signInWithEmailAndPassword(auth, inputEmail, password);
      const matched =
        (await resolveAuthenticatedUserFromFirebase(cred.user.uid, cred.user.email || inputEmail)) ||
        preCheckMatch;

      if (!matched) {
        await signOut(auth);
        await logAudit('LOGIN_DENIED', inputEmail, undefined, 'Access denied: Email not in approved directory.');
        setIsAccessDenied(true);
        setErrorMessage(
          `Access denied: "${inputEmail}" is not registered in the approved staff directory. Contact an Administrator.`
        );
        setIsProcessing(false);
        return;
      }

      if (!isUserActiveStatus(matched)) {
        await signOut(auth);
        const statusLabel = (matched.status || (matched.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
        await logAudit('LOGIN_DENIED', inputEmail, matched.role, `Access denied: Account status is ${statusLabel}.`);
        setIsAccessDenied(true);
        setErrorMessage(
          `Access denied: Your account status is currently ${statusLabel}. Contact your Administrator to reactivate access.`
        );
        setIsProcessing(false);
        return;
      }

      await finalizeAuthenticatedSession(matched, cred.user.uid, 'password');
    } catch (err: any) {
      setIsProcessing(false);
      const code = err?.code || '';
      const msg = err?.message || String(err);

      if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        setIsEmailProviderDisabled(true);
        setErrorMessage('Firebase Email/Password sign-in provider is not yet enabled in Firebase Console.');
        return;
      }

      const localUser = users.find((u) => u.email.trim().toLowerCase() === inputEmail);
      const pendingSetup = localUser ? !localUser.password_configured : true;

      if (code === 'auth/user-not-found' || (code === 'auth/invalid-credential' && pendingSetup)) {
        setOfferActivationForEmail(inputEmail);
        setErrorMessage(
          code === 'auth/user-not-found'
            ? `Account "${inputEmail}" has not been activated yet. Set your initial password using "Activate Account".`
            : 'Invalid email/password. If this is your first login, switch to "Activate Account" to configure your password.'
        );
        return;
      }

      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        await logAudit('LOGIN_DENIED', inputEmail, localUser?.role, 'Invalid password attempt.');
        setErrorMessage('Incorrect password. Please try again or use Forgot Password to send a reset link.');
        return;
      }

      if (code === 'auth/too-many-requests') {
        setErrorMessage('Too many unsuccessful login attempts. Please wait a few minutes or reset your password.');
        return;
      }

      setErrorMessage(`Sign-in failed: ${msg}`);
    }
  };

  // First-Time Operator / Staff Account Activation (Sets Firebase Auth Password)
  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const inputEmail = email.trim().toLowerCase();
    if (!inputEmail) {
      setErrorMessage('Enter the staff email assigned by your Administrator.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Choose a strong password of at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter the same password in both fields.');
      return;
    }

    setIsProcessing(true);
    try {
      const matched = await resolvePreApprovedUser(inputEmail);
      if (!matched) {
        await logAudit('LOGIN_DENIED', inputEmail, undefined, 'Activation denied: Email not pre-approved by Admin.');
        setIsAccessDenied(true);
        setErrorMessage(
          `Activation blocked: "${inputEmail}" is not in the approved workshop directory. Public registration is disabled.`
        );
        setIsProcessing(false);
        return;
      }

      if (!isUserActiveStatus(matched)) {
        const statusLabel = (matched.status || (matched.is_active ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
        setIsAccessDenied(true);
        setErrorMessage(`Activation blocked: Account "${inputEmail}" is currently ${statusLabel}.`);
        setIsProcessing(false);
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, inputEmail, password);
      await finalizeAuthenticatedSession(matched, cred.user.uid, 'activation');
    } catch (err: any) {
      setIsProcessing(false);
      const code = err?.code || '';
      const msg = err?.message || String(err);

      if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        setIsEmailProviderDisabled(true);
        setErrorMessage('Firebase Email/Password sign-in provider is not yet enabled in Firebase Console.');
        return;
      }

      if (code === 'auth/email-already-in-use') {
        setErrorMessage(
          `A password has already been configured for "${inputEmail}". Switch to Sign In or use Reset Password.`
        );
        return;
      }

      if (code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Use at least 8 characters with letters and numbers.');
        return;
      }

      setErrorMessage(`Account activation failed: ${msg}`);
    }
  };

  // Password Reset via Firebase Auth
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setErrorMessage('Please enter the email address associated with your account.');
      return;
    }

    setIsProcessing(true);
    try {
      const matched = await resolvePreApprovedUser(targetEmail);
      if (!matched) {
        setErrorMessage(`No approved account found matching "${targetEmail}".`);
        setIsProcessing(false);
        return;
      }

      await sendPasswordResetEmail(auth, targetEmail);
      await logAudit('PASSWORD_RESET_REQUESTED', targetEmail, matched.role, 'Password reset link requested via Firebase Auth');
      setSuccessMessage(`Password reset email sent to ${targetEmail}. Check your inbox and spam folder.`);
      setIsProcessing(false);
    } catch (err: any) {
      setIsProcessing(false);
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setOfferActivationForEmail(targetEmail);
        setErrorMessage(
          `Account "${targetEmail}" hasn't completed first-time password setup yet. Use "Activate Account" to create a password.`
        );
        return;
      }
      if (code === 'auth/operation-not-allowed') {
        setIsEmailProviderDisabled(true);
        setErrorMessage('Firebase Email/Password provider must be enabled in Firebase Console before sending password resets.');
        return;
      }
      setErrorMessage(`Could not send password reset email: ${err?.message || String(err)}`);
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
                    Authorized personnel &amp; CNC operator access control
                  </p>
                </div>
              </div>

              {/* Mode Switcher Tabs: Sign In | Activate Account | Reset Password */}
              <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/80 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    resetMessages();
                  }}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                    authMode === 'signin' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <LogIn size={12} />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('activate');
                    resetMessages();
                  }}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                    authMode === 'activate' ? 'bg-white text-[#115e59] shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <UserPlus size={12} />
                  <span>Activate</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('reset');
                    resetMessages();
                  }}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                    authMode === 'reset' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <KeyRound size={12} />
                  <span>Reset</span>
                </button>
              </div>

              {/* Access Denied / Auth Alert Box */}
              {errorMessage && (
                <div
                  id="auth-error-banner"
                  className={`p-4 rounded-xl border text-xs leading-relaxed flex flex-col gap-2 ${
                    isAccessDenied
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
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

                  {offerActivationForEmail && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(offerActivationForEmail);
                        setPassword('');
                        setConfirmPassword('');
                        setAuthMode('activate');
                        resetMessages();
                      }}
                      className="mt-1 w-full py-2 px-3 bg-[#115e59] hover:bg-[#0f4c4a] text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <UserPlus size={13} />
                      <span>Activate "{offerActivationForEmail}" &amp; Set Password</span>
                    </button>
                  )}

                  {isPopupBlockedError && (
                    <div className="mt-1 bg-white/90 p-3 rounded-lg border border-amber-200/70 text-[11px] text-stone-700 space-y-1">
                      <span className="font-bold text-stone-900 block text-[10px] uppercase tracking-wider">
                        Preview Environment Note:
                      </span>
                      <p>
                        In embedded browser sandboxes, Google OAuth popups may be blocked. Allow popups or sign in with your authorized email and password below.
                      </p>
                    </div>
                  )}

                  {isEmailProviderDisabled && (
                    <div className="mt-1.5 bg-white/95 p-3.5 rounded-xl border border-amber-300 text-[11px] text-stone-800 space-y-2 shadow-2xs">
                      <div className="font-bold text-amber-950 text-xs">
                        Enable Email/Password Provider in Firebase Console
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600">
                        <li>Open Firebase Console → Authentication → Sign-in method.</li>
                        <li>Click <strong>Add new provider</strong> and select <strong>Email/Password</strong>.</li>
                        <li>Toggle <strong>Enable</strong> ON and click <strong>Save</strong>.</li>
                        <li>Return here and retry Sign In or Activate Account.</li>
                      </ol>
                      <a
                        href="https://console.firebase.google.com/project/myworkshop-orderflow/authentication/providers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#115e59] hover:bg-[#0f4c4a] text-white font-bold rounded-lg text-[11px] shadow-2xs transition"
                      >
                        <ExternalLink size={12} />
                        <span>Open Firebase Sign-In Providers</span>
                      </a>
                    </div>
                  )}

                  {isUnauthorizedDomain && (
                    <div className="mt-2 bg-white/95 p-3.5 rounded-xl border border-amber-300 text-[11px] text-stone-800 space-y-2.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                        <Globe size={14} className="text-amber-700 shrink-0" />
                        <span>Firebase Authorized Domain Required</span>
                      </div>
                      <p className="text-stone-600 leading-normal text-[11px]">
                        Add this preview domain to Firebase Console → Authentication → Settings → Authorized domains:
                      </p>
                      <div className="flex items-center justify-between gap-2 bg-stone-100 px-3 py-2 rounded-lg border border-stone-200">
                        <span className="font-mono font-semibold text-stone-800 text-[11px] truncate select-all">
                          {currentHostname}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyDomain}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-300 rounded text-[10px] font-bold text-stone-700 shadow-2xs transition cursor-pointer"
                        >
                          {copiedDomain ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedDomain ? 'Copied!' : 'Copy Domain'}</span>
                        </button>
                      </div>
                      <a
                        href="https://console.firebase.google.com/project/myworkshop-orderflow/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#593622] hover:bg-[#402414] text-white font-bold rounded-lg text-[11px] shadow-2xs transition"
                      >
                        <ExternalLink size={12} />
                        <span>Open Firebase Console Settings</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Success Notification Box */}
              {successMessage && (
                <div
                  id="auth-success-banner"
                  className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-2.5 text-emerald-900 text-xs font-semibold"
                >
                  <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Google OAuth Button (Available in Sign In Mode) */}
              {authMode === 'signin' && (
                <div className="space-y-3">
                  <button
                    id="google-signin-btn"
                    type="button"
                    onClick={handleRealGoogleLogin}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-50 text-stone-700 font-bold py-2.5 px-4 rounded-xl border border-stone-300 shadow-2xs hover:shadow transition text-xs cursor-pointer disabled:opacity-50"
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
                    <span className="flex-shrink mx-3 text-[10px] text-stone-400 font-mono uppercase tracking-widest font-bold">
                      or email &amp; password
                    </span>
                    <div className="flex-grow border-t border-stone-200"></div>
                  </div>
                </div>
              )}

              {/* MODE 1: EMAIL & PASSWORD SIGN IN */}
              {authMode === 'signin' && (
                <form onSubmit={handleEmailPasswordSignIn} className="space-y-3.5 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1.5">
                      Authorized Staff Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-stone-400" size={14} />
                      <input
                        id="login-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. swapnil.demo@example.com"
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#593622] focus:outline-none rounded-xl font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-stone-400" size={14} />
                      <input
                        id="login-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-9 pr-10 py-2.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#593622] focus:outline-none rounded-xl font-medium transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="login-submit-btn"
                    type="submit"
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 bg-[#593622] hover:bg-[#402414] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition cursor-pointer disabled:opacity-50"
                  >
                    <span>{isProcessing ? 'Signing In...' : 'Sign In & Enter Workshop'}</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}

              {/* MODE 2: FIRST-TIME ACCOUNT ACTIVATION (SET PASSWORD) */}
              {authMode === 'activate' && (
                <form onSubmit={handleActivateAccount} className="space-y-3.5 text-left">
                  <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200 text-[11px] text-teal-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <UserPlus size={13} className="text-[#115e59]" />
                      <span>First-Time Operator &amp; Staff Activation</span>
                    </div>
                    <p className="text-teal-800/90">
                      Enter your pre-approved workshop email and create your personal password to activate Firebase authentication.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1.5">
                      Pre-Approved Staff Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-stone-400" size={14} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. swapnil.demo@example.com"
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#115e59] focus:outline-none rounded-xl font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1.5">
                      Create Password (min. 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-stone-400" size={14} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-9 pr-10 py-2.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#115e59] focus:outline-none rounded-xl font-medium transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-3 text-stone-400" size={14} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#115e59] focus:outline-none rounded-xl font-medium transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition cursor-pointer disabled:opacity-50"
                  >
                    <span>{isProcessing ? 'Activating Account...' : 'Set Password & Enter CNC Portal'}</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}

              {/* MODE 3: PASSWORD RESET */}
              {authMode === 'reset' && (
                <form onSubmit={handlePasswordReset} className="space-y-3.5 text-left">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                      <KeyRound size={13} className="text-amber-700" />
                      <span>Firebase Password Recovery</span>
                    </div>
                    <p>Enter your authorized workshop email to receive an official Firebase password reset link.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-widest mb-1.5">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-stone-400" size={14} />
                      <input
                        type="email"
                        required
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
                      disabled={isProcessing}
                      className="flex-1 bg-[#593622] hover:bg-[#402414] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? 'Sending...' : 'Send Password Reset Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        resetMessages();
                      }}
                      className="px-3 py-2.5 border border-stone-300 hover:bg-stone-100 rounded-xl text-xs font-semibold text-stone-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Security policy notice footer */}
              <div className="pt-3 border-t border-stone-100 text-center">
                <p className="text-[10px] text-stone-400 leading-tight">
                  Protected by Centralized RBAC and Firebase Authentication. All login attempts and access events are audited.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
