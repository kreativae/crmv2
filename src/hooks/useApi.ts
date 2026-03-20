import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | undefined>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export function useApi<T>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  initialData: T | null = null
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | undefined> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        return undefined;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

// Hook for handling API calls with optimistic updates
export function useOptimisticApi<T, U>(
  apiFunction: (data: U) => Promise<T>,
  onOptimisticUpdate: (data: U) => void,
  onRevert: () => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (data: U): Promise<T | undefined> => {
      setLoading(true);
      setError(null);

      // Apply optimistic update
      onOptimisticUpdate(data);

      try {
        const result = await apiFunction(data);
        setLoading(false);
        return result;
      } catch (err) {
        // Revert on error
        onRevert();
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        setLoading(false);
        return undefined;
      }
    },
    [apiFunction, onOptimisticUpdate, onRevert]
  );

  return { execute, loading, error };
}

export default useApi;
