import { useRef } from "react";
import { usePageEntrance } from "@/hooks/useAnimations";

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a page in a brief GSAP fade+slide entrance animation.
 * `will-change` is NOT set permanently — GSAP manages it for the 0.3s
 * animation duration only, then clears all promoted properties.
 */
export default function PageTransition({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  usePageEntrance(ref);
  return (
    <div ref={ref} className={`w-full ${className}`} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
