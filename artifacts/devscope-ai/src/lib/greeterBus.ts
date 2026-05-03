export type GreeterEvent =
  | { type: "score"; score: number }
  | { type: "tip";   msg: string  };

type Listener = (e: GreeterEvent) => void;
const listeners = new Set<Listener>();

export const greeterBus = {
  emit: (e: GreeterEvent) => listeners.forEach((f) => f(e)),
  on:   (f: Listener) => { listeners.add(f); return () => listeners.delete(f); },
};
