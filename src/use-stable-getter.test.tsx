import { useState, useEffect } from 'react';
import { create, act } from 'react-test-renderer';
import { createEmitter } from './create-emitter';
import { createRerenderer } from './create-rerenderer';
import { useStableGetter } from './use-stable-getter';

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
