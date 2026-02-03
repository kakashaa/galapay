import { useState, useEffect, useCallback } from 'react';

// Admin codes mapping
const ADMIN_CODES: Record<string, { username: string; role: 'admin' | 'super_admin' }> = {
  '165381': { username: 'naz', role: 'super_admin' },
  '482751': { username: 'جنجون', role: 'admin' },
  '639284': { username: 'بيسو', role: 'admin' },
  '571943': { username: 'ريلاكس', role: 'admin' },
};

const ADMIN_SESSION_KEY = 'ghala_admin_session';

interface AdminSession {
  username: string;
  role: 'admin' | 'super_admin';
  loginAt: number;
}

export const useAdminAuth = () => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const stored = localStorage.getItem(ADMIN_SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdminSession;
        // Session expires after 24 hours
        if (Date.now() - parsed.loginAt < 24 * 60 * 60 * 1000) {
          setSession(parsed);
        } else {
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((code: string): { success: boolean; error?: string } => {
    const admin = ADMIN_CODES[code];
    if (!admin) {
      return { success: false, error: 'الرمز غير صحيح' };
    }

    const newSession: AdminSession = {
      username: admin.username,
      role: admin.role,
      loginAt: Date.now(),
    };

    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setSession(null);
  }, []);

  const isSuperAdmin = session?.role === 'super_admin';
  const isAdmin = session?.role === 'admin' || isSuperAdmin;

  return {
    session,
    loading,
    login,
    logout,
    isAuthenticated: !!session,
    isSuperAdmin,
    isAdmin,
  };
};

export const verifyAdminCode = (code: string) => {
  return ADMIN_CODES[code] || null;
};
