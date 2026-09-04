import { useEffect, useState } from 'react';
import { getToken } from '../api/auth-storage';

export function useAuthToken() {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getToken().then((value) => {
      if (mounted) {
        setTokenState(value);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { token, isAuthenticated: token !== null, isLoading };
}
