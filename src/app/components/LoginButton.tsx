import { useAuth } from '@/lib/hooks/useAuth';
import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';

export default function LoginButton() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (user) {
        await signOut();
      } else {
        await signInWithGoogle();
      }
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAuth}
      disabled={isLoading}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg
        transition-all duration-200 ease-in-out
        ${user 
          ? 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400'
          : 'bg-white hover:bg-gray-50 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200'
        }
        shadow-sm border border-gray-200 dark:border-gray-700
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {isLoading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-current" />
      ) : user ? (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </>
      ) : (
        <>
          <FcGoogle className="h-5 w-5" />
          <span>Sign in with Google</span>
        </>
      )}
    </button>
  );
} 