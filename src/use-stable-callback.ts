import { useCallback } from 'react';
import { useStableGetter } from './use-stable-getter';

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
