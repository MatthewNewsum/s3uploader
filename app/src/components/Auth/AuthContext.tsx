// src/components/Auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CognitoUser } from 'amazon-cognito-identity-js';
import * as authUtils from '@/utils/auth';

interface AuthContextType {
  user: CognitoUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authUtils.getCurrentUser()
      .then(currentUser => setUser(currentUser))
      .finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    signIn: async (email: string, password: string) => {
      const result = await authUtils.signIn(email, password);
      const currentUser = await authUtils.getCurrentUser();
      setUser(currentUser);
      return result;
    },
    signUp: async (email: string, password: string) => {
      return authUtils.signUp(email, password);
    },
    signOut: () => {
      authUtils.signOut();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};