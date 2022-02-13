/**
 * returns a simple pub-sub subscribe and notify method
 */
export function createEmitter<T = void>() {
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
