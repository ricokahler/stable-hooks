import { useRef, useEffect, useCallback, useLayoutEffect } from 'react';

// Removes the `useLayoutEffect` warning on the server
// https://github.com/reduxjs/react-redux/blob/0f1ab0960c38ac61b4fe69285a5b401f9f6e6177/src/utils/useIsomorphicLayoutEffect.js
const useUniversalLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useStableGetter<T>(value: T): () => T {
  const ref = useRef(value);

  useUniversalLayoutEffect(() => {
    ref.current = value;
  }, [value]);

  const getValue = useCallback(() => {
    return ref.current;
  }, []);

  return getValue;
}
