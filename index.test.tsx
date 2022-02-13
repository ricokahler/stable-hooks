import { create, act } from 'react-test-renderer';
import { useState, useEffect } from 'react';
import { useStableValue, useStableGetter, useStableCallback } from './index';

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

describe('useStableGetter', () => {
  it('returns a stable function that pulls the most recent value', async () => {
    const { rerender, useRerenderer } = createRerenderer();

    // these will be used to create a dynamic value in the component
    const valueEmitter = createEmitter<string>();
    function useValue() {
      const [value, setValue] = useState('initial value');
      useEffect(() => valueEmitter.subscribe(setValue), []);
      return value;
    }

    // this will capture the value getter
    const effectHandler = jest.fn();

    function Test() {
      useRerenderer();
      const getValue = useStableGetter(useValue());
      useEffect(() => effectHandler(getValue), [getValue]);

      return null;
    }

    create(<Test />);

    // render the component once and get the value getter
    await act(rerender);
    const valueGetter = effectHandler.mock.calls[0][0];
    expect(valueGetter()).toBe('initial value');

    // change the value and re-render
    act(() => valueEmitter.notify('next value'));
    await act(rerender);

    // since the getter is stable, it shouldn't have changed
    expect(effectHandler).toHaveBeenCalledTimes(1);
    // calling the getter should return the next value
    expect(valueGetter()).toBe('next value');
  });
});

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

/**
 * returns a `useRerenderer` hook to call within the component as well as a
 * `renderer()` function to call that causes the component to hook to rerender
 */
function createRerenderer() {
  const stateSetters = createEmitter<string>();
  const acks = createEmitter<string>();

  async function rerender() {
    const id = Array.from({ length: 5 })
      .map(() => Math.floor(Math.random() * 255).toString(16))
      .join('');

    setTimeout(() => stateSetters.notify(id), 0);

    await new Promise<void>((resolve) => {
      const unsubscribe = acks.subscribe((renderId) => {
        if (renderId !== id) return;

        unsubscribe();
        resolve();
      });
    });
  }

  function useRerenderer() {
    const [renderId, setRenderId] = useState('');
    useEffect(() => stateSetters.subscribe(setRenderId), []);
    useEffect(() => acks.notify(renderId), [renderId]);
  }

  return { rerender, useRerenderer };
}

function createEmitter<T = void>() {
  type Subscriber = (t: T) => void;
  const subscribers = new Set<Subscriber>();

  return {
    subscribe: (subscriber: Subscriber) => {
      subscribers.add(subscriber);
      return () => {
        subscribers.delete(subscriber);
      };
    },
    notify: (t: T) => {
      for (const subscriber of subscribers) {
        subscriber(t);
      }
    },
  };
}
