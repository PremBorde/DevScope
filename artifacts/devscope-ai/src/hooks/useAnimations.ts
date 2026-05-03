import { RefObject, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function usePageEntrance(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 28, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out", clearProps: "transform,opacity" }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [containerRef]);
}

export function useScrollReveal(
  containerRef: RefObject<HTMLElement | null>,
  selector = ".reveal",
  options?: { y?: number }
) {
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray<HTMLElement>(
        containerRef.current!.querySelectorAll(selector)
      );
      elements.forEach((el) => {
        gsap.fromTo(
          el,
          { y: options?.y ?? 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              once: true,
            },
          }
        );
      });
    }, containerRef);
    return () => ctx.revert();
  }, [containerRef, selector]);
}

export function useStaggerEntrance(
  containerRef: RefObject<HTMLElement | null>,
  selector = ".stagger-card",
  options?: { delay?: number; stagger?: number; y?: number }
) {
  useEffect(() => {
    if (!containerRef.current) return;
    const cards = gsap.utils.toArray<HTMLElement>(
      containerRef.current.querySelectorAll(selector)
    );
    if (!cards.length) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { y: options?.y ?? 36, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          stagger: options?.stagger ?? 0.09,
          delay: options?.delay ?? 0,
          ease: "power3.out",
          clearProps: "scale,opacity",
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);
}

export function useCountUp(
  ref: RefObject<HTMLElement | null>,
  target: number,
  options?: { duration?: number; delay?: number; decimals?: number; suffix?: string }
) {
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obj = { val: 0 };
    const decimals = options?.decimals ?? 0;
    const suffix = options?.suffix ?? "";
    const tween = gsap.to(obj, {
      val: target,
      duration: options?.duration ?? 1.8,
      delay: options?.delay ?? 0,
      ease: "power2.out",
      onUpdate() {
        el.textContent = obj.val.toFixed(decimals) + suffix;
      },
    });
    return () => { tween.kill(); };
  }, [target]);
}

export function useProgressBars(
  containerRef: RefObject<HTMLElement | null>,
  selector = ".gsap-bar"
) {
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      const bars = gsap.utils.toArray<HTMLElement>(
        containerRef.current!.querySelectorAll(selector)
      );
      bars.forEach((bar, i) => {
        const target = bar.dataset.width ?? "0%";
        gsap.fromTo(
          bar,
          { width: "0%" },
          {
            width: target,
            duration: 1.1,
            delay: 0.3 + i * 0.12,
            ease: "power3.out",
          }
        );
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);
}

export function useCardHover() {
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, {
      y: -6,
      scale: 1.025,
      duration: 0.2,
      ease: "power2.out",
      overwrite: "auto",
    });
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, {
      y: 0,
      scale: 1,
      duration: 0.35,
      ease: "power3.out",
      overwrite: "auto",
    });
  };
  return { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave };
}

export function useBadgeEntrance(
  ref: RefObject<HTMLElement | null>,
  delay = 0.6
) {
  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { scale: 0.7, opacity: 0, y: 10 },
        { scale: 1, opacity: 1, y: 0, duration: 0.45, delay, ease: "back.out(1.7)" }
      );
    }, ref);
    return () => ctx.revert();
  }, [delay]);
}
