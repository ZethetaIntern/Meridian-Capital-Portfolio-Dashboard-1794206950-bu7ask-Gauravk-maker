
type Events = {
  SYMBOL_SELECTED: {
    symbol: string;
  };

  DATE_RANGE_CHANGED: {
    range: string;
  };

  ALERT_CLICKED: {
    widget: string;
  };

  PRICE_TICK: {
    ticker: string;
    price: number;
    changePct: number;
    timestamp: number;
    sequence: number;
  };
};

type EventName = keyof Events;

type Listener<T> = (payload: T) => void;

type ListenerMap = {
  [K in EventName]?: Set<Listener<Events[K]>>;
};

const listeners: ListenerMap = {};

export const eventBus = {
  on<K extends EventName>(
    event: K,
    handler: Listener<Events[K]>
  ): () => void {
    // Store the listener using a type-safe event-specific set.
    const eventListeners = listeners[event] as
      | Set<Listener<Events[K]>>
      | undefined;

    const listenerSet =
      eventListeners ?? new Set<Listener<Events[K]>>();

    if (!eventListeners) {
      listeners[event] = listenerSet as ListenerMap[K];
    }

    listenerSet.add(handler);

    return () => {
      listenerSet.delete(handler);
    };
  },

  emit<K extends EventName>(
    event: K,
    payload: Events[K]
  ): void {
    const eventListeners = listeners[event] as
      | Set<Listener<Events[K]>>
      | undefined;

    eventListeners?.forEach((handler) => {
      handler(payload);
    });
  },

  clear(): void {
    (Object.keys(listeners) as EventName[]).forEach((event) => {
      delete listeners[event];
    });
  },
};
