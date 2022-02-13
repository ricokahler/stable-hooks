import { useState, useEffect } from 'react';
import { create, act } from 'react-test-renderer';
import { createEmitter } from './create-emitter';
import { createRerenderer } from './create-rerenderer';
import { useStableCallback } from './use-stable-callback';

describe('useStableCallback', () => {
  it('returns a stable callback that keeps a pointer to the latest instance', async () => {
    const { rerender, useRerenderer } = createRerenderer();

    // these will be used to create a dynamic value in the component
    const valueEmitter = createEmitter<string>();
    function useValue() {
      const [value, setValue] = useState('initial value');
      useEffect(() => valueEmitter.subscribe(setValue), []);
      return value;
    }

    // this will capture the stable callback
    const effectHandler = jest.fn();

    function Test() {
      useRerenderer();

      const value = useValue();

      // notice how this function closes over `value`
      // if the callback is not backed by a pointer,
      // invoking `stableCallback` will result in the
      // initial value instead of the current value
      const stableCallback = useStableCallback(() => {
        return value;
      });

      useEffect(() => {
        effectHandler(stableCallback);
      }, [stableCallback]);

      return null;
    }

    create(<Test />);

    // render the component once and get the stable callback
    await act(rerender);
    const stableCallback = effectHandler.mock.calls[0][0];
    expect(stableCallback()).toBe('initial value');

    // change the value and re-render
    act(() => valueEmitter.notify('next value'));
    await act(rerender);

    // since the callback is stable, it shouldn't have changed
    expect(effectHandler).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    // calling the getter should return the next value
    expect(stableCallback()).toBe('next value');
  });
});
