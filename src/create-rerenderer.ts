import { useState, useEffect } from 'react';
import { createEmitter } from './create-emitter';

/**
 * returns a `useRerenderer` hook to call within the component as well as a
 * `renderer()` function to call that causes the component to hook to rerender
 *
 * used for testing
 */
export function createRerenderer() {
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
