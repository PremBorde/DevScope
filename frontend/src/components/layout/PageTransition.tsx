import { useEffect, useRef } from "react";
import gsap from "gsap";
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

  // Keep the page visible by default. If the entrance animation fails to run,
  // the user still sees the content instead of a blank screen.
  useEffect(() => {
    if (!ref.current) return;

    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", clearProps: "all" },
    );
  }, []);

  return (
    <div ref={ref} className={`w-full ${className}`} style={{ opacity: 1 }}>
      {children}
    </div>
  );
}
