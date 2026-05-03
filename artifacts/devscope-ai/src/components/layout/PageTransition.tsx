import { useRef } from "react";
import { usePageEntrance } from "@/hooks/useAnimations";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function PageTransition({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  usePageEntrance(ref);
  return (
    <div ref={ref} className={`will-change-transform w-full ${className}`} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
