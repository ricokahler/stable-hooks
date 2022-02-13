import { useEffect } from 'react';
import { create, act } from 'react-test-renderer';
import { createRerenderer } from './create-rerenderer';
import { useStableValue } from './use-stable-value';

describe('useStableValue', () => {
  it('preserves the value between renders according to the hash function', async () => {
    const { rerender, useRerenderer } = createRerenderer();

    // these are used as the `useEffect` callback implementations
    const stableEffectHandler = jest.fn();
    const unstableEffectHandler = jest.fn();

    const hashFn = jest.fn(JSON.stringify);

    function Test() {
      useRerenderer();

      // this is an object created during the render so it's unstable and will
      // change on every render. the hooks linter will warn about it
      //
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const unstableValue = ['one', 'two'];
      const stableValue = useStableValue(unstableValue, { hashFn });

      useEffect(() => stableEffectHandler(), [stableValue]);
      useEffect(() => unstableEffectHandler(), [unstableValue]);

      return null;
    }

    create(<Test />);

    await act(rerender);

    expect(hashFn).toHaveBeenCalled();

    // this will only have been called once
    expect(stableEffectHandler).toBeCalledTimes(1);
    // this will have been called on every re-render
    expect(unstableEffectHandler).toBeCalledTimes(2);
  });

  it("doesn't re-run the hash function if the reference/instance is the same", async () => {
    const { rerender, useRerenderer } = createRerenderer();

    // this is used in the `useEffect` callback implementation
    const stableEffectHandler = jest.fn();

    const hashFn = jest.fn(JSON.stringify);

    // this is a stable value that won't change anyway
    const externalValue = { hello: 'there' };

    function Test() {
      useRerenderer();

      const redundantStableValue = useStableValue(externalValue, { hashFn });
      useEffect(() => stableEffectHandler(), [redundantStableValue]);

      return null;
    }

    create(<Test />);

    await act(rerender);
    await act(rerender);
    await act(rerender);

    // these will both be only called once
    expect(hashFn).toBeCalledTimes(1);
    expect(stableEffectHandler).toBeCalledTimes(1);
  });
});
