import { useContext, useEffect } from "react";
import { AuthContext } from "../contexts/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);

  useEffect(() => {
    console.log('Current auth state:', {
      isAuthenticated: !!context.user,
      isLoading: context.loading
    });
  }, [context.user, context.loading]);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}