import { RefObject, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function usePageEntrance(containerRef: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", clearProps: "all" }
    );
  }, { scope: containerRef, dependencies: [containerRef.current] });
}

export function useScrollReveal(
  containerRef: RefObject<HTMLElement | null>,
  selector = ".reveal",
  options?: { y?: number }
) {
  useGSAP(() => {
    if (!containerRef.current) return;
    const elements = gsap.utils.toArray<HTMLElement>(
      containerRef.current.querySelectorAll(selector)
    );
    elements.forEach((el) => {
      gsap.fromTo(
        el,
        { y: options?.y ?? 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.35,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            once: true,
          },
        }
      );
    });
  }, { scope: containerRef, dependencies: [containerRef.current, selector] });
}

export function useStaggerEntrance(
  containerRef: RefObject<HTMLElement | null>,
  selector = ".stagger-card",
  options?: { delay?: number; stagger?: number; y?: number }
) {
  useGSAP(() => {
    if (!containerRef.current) return;
    const cards = gsap.utils.toArray<HTMLElement>(
      containerRef.current.querySelectorAll(selector)
    );
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { y: options?.y ?? 16, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.28,
        stagger: options?.stagger ?? 0.05,
        delay: options?.delay ?? 0,
        ease: "power2.out",
        clearProps: "opacity",
      }
    );
  }, { scope: containerRef, dependencies: [containerRef.current] });
}

export function useCountUp(
  ref: RefObject<HTMLElement | null>,
  target: number,
  options?: { duration?: number; delay?: number; decimals?: number; suffix?: string }
) {
  useGSAP(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obj = { val: 0 };
    const decimals = options?.decimals ?? 0;
    const suffix = options?.suffix ?? "";
    gsap.to(obj, {
      val: target,
      duration: options?.duration ?? 1.2,
      delay: options?.delay ?? 0,
      ease: "power2.out",
      onUpdate() {
        el.textContent = obj.val.toFixed(decimals) + suffix;
      },
    });
  }, { dependencies: [target, ref.current] });
}

export function useProgressBars(
  containerRef: RefObject<HTMLElement | null>,
  selector = ".gsap-bar"
) {
  useGSAP(() => {
    if (!containerRef.current) return;
    const bars = gsap.utils.toArray<HTMLElement>(
      containerRef.current.querySelectorAll(selector)
    );
    bars.forEach((bar, i) => {
      const target = bar.dataset.width ?? "0%";
      gsap.fromTo(
        bar,
        { width: "0%" },
        {
          width: target,
          duration: 0.7,
          delay: 0.1 + i * 0.07,
          ease: "power2.out",
        }
      );
    });
  }, { scope: containerRef, dependencies: [containerRef.current] });
}

export function useCardHover() {
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, {
      y: -3,
      duration: 0.15,
      ease: "power2.out",
      overwrite: "auto",
    });
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, {
      y: 0,
      duration: 0.2,
      ease: "power2.out",
      overwrite: "auto",
    });
  };
  return { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave };
}

export function useBadgeEntrance(
  ref: RefObject<HTMLElement | null>,
  delay = 0.3
) {
  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { scale: 0.85, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, delay, ease: "back.out(1.4)" }
    );
  }, { dependencies: [delay, ref.current] });
}
