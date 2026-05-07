export type GreeterEvent =
  | { type: "score";      score: number  }
  | { type: "tip";        msg: string    }
  | { type: "error";      msg?: string   }
  | { type: "celebrate";  msg: string    }
  | { type: "watching"                   }
  | { type: "typing";     value: string  }
  | { type: "inputBlur";  value: string  };

type Listener = (e: GreeterEvent) => void;
const listeners = new Set<Listener>();

export const greeterBus = {
  emit: (e: GreeterEvent) => listeners.forEach((f) => f(e)),
  on:   (f: Listener) => { listeners.add(f); return () => listeners.delete(f); },
};

/* When the character is grabbed we must NOT treat the resulting input-blur
   as the user leaving the field — set this flag in the drag mousedown
   handler (which fires before blur) so the blur handler can skip it. */
let _skipNextInputBlur = false;
export function suppressNextInputBlur() {
  _skipNextInputBlur = true;
  // Auto-reset after a tick so a stale flag never blocks a real blur
  setTimeout(() => { _skipNextInputBlur = false; }, 400);
}
export function consumeInputBlurSuppressed(): boolean {
  const v = _skipNextInputBlur;
  _skipNextInputBlur = false;
  return v;
}
