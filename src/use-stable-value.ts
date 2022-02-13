import { useMemo } from 'react';

export interface UseStableValueOptions<T> {
  hashFn?: (value: T) => unknown;
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
