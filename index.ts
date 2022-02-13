import {
  useRef,
  useMemo,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';

export interface UseStableValueOptions<T> {
  hashFn?: (value: T) => unknown;
}
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

export function useStableCallback<TArgs extends unknown[], TReturn>(
  callback: (...args: TArgs[]) => TReturn,
): (...args: TArgs[]) => TReturn {
  const getCallback = useStableGetter(callback);

  return useCallback(
    (...args) => {
      const callback = getCallback();
      return callback(...args);
    },
    [getCallback],
  );
}

export function useStableValue<T>(
  value: T,
  { hashFn = JSON.stringify }: UseStableValueOptions<T> = {},
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hash = useMemo(() => hashFn(value), [value]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => value, [hash]);
}
