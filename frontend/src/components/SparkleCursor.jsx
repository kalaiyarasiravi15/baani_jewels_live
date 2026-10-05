import React, { useEffect, useRef } from "react";

export default function SparkleCursor() {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const mouse = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    // Disable custom cursor on touch and mobile devices (eliminates sticky circle artifact on mobile)
    if (typeof window === "undefined") return;
    const isTouchOrMobile =
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 900;
    if (isTouchOrMobile) return;

    const ringEl = ringRef.current;
    const dotEl = dotRef.current;
    if (!ringEl || !dotEl) return;

    function spawnSpark(x, y) {
      const size = 6 + Math.random() * 5;
      const angle = Math.random() * 360;
      const driftX = Math.random() * 40 - 20;
      const driftY = Math.random() * 40 - 20 - 15;

      const el = document.createElement("div");
      el.style.cssText = `
        position: fixed;
        left: ${x + (Math.random() * 12 - 6)}px;
        top: ${y + (Math.random() * 12 - 6)}px;
        pointer-events: none;
        z-index: 9996;
        will-change: transform, opacity;
        filter: drop-shadow(0 0 5px rgba(200,156,74,0.95));
      `;
      el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform:rotate(${angle}deg)">
        <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z" fill="#c89c4a"/>
      </svg>`;
      document.body.appendChild(el);

      const life = 600 + Math.random() * 400;
      const start = performance.now();

      function animate() {
        const elapsed = performance.now() - start;
        const p = Math.min(elapsed / life, 1);
        el.style.opacity = String(1 - p);
        el.style.transform = `translate(${driftX * p}px, ${driftY * p}px) scale(${1.3 - p}) rotate(${angle + p * 120}deg)`;
        if (p < 1) requestAnimationFrame(animate);
        else el.remove();
      }
      requestAnimationFrame(animate);
    }

    function handleMouseMove(e) {
      mouse.current = { x: e.clientX, y: e.clientY };
      dotEl.style.visibility = "visible";
      ringEl.style.visibility = "visible";

      // Move the small dot instantly
      dotEl.style.left = e.clientX + "px";
      dotEl.style.top = e.clientY + "px";

      const dist = Math.hypot(
        e.clientX - lastPos.current.x,
        e.clientY - lastPos.current.y
      );
      if (dist > 8) {
        spawnSpark(e.clientX, e.clientY);
        lastPos.current = { x: e.clientX, y: e.clientY };
      }
    }

    // Smooth lagging ring follow
    function animateRing() {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12;
      ringEl.style.left = ring.current.x + "px";
      ringEl.style.top = ring.current.y + "px";
      rafRef.current = requestAnimationFrame(animateRing);
    }

    function handleOver(e) {
      // Subtle pulse on interactable elements
      if (e.target.closest && (e.target.closest("a") || e.target.closest("button") || e.target.closest(".sparkle-hover"))) {
        ringEl.style.width = "20px";
        ringEl.style.height = "20px";
        ringEl.style.borderColor = "rgba(200,156,74,0.8)";
        ringEl.style.background = "rgba(200,156,74,0.08)";
        dotEl.style.opacity = "0.7";
      }
    }

    function handleOut(e) {
      if (e.target.closest && (e.target.closest("a") || e.target.closest("button") || e.target.closest(".sparkle-hover"))) {
        ringEl.style.width = "14px";
        ringEl.style.height = "14px";
        ringEl.style.borderColor = "rgba(200,156,74,0.4)";
        ringEl.style.background = "transparent";
        dotEl.style.opacity = "1";
      }
    }

    rafRef.current = requestAnimationFrame(animateRing);
    function hideCursor() {
      dotEl.style.visibility = "hidden";
      ringEl.style.visibility = "hidden";
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("blur", hideCursor);
    document.documentElement.addEventListener("mouseleave", hideCursor);
    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("blur", hideCursor);
      document.documentElement.removeEventListener("mouseleave", hideCursor);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "14px",
          height: "14px",
          border: "1px solid rgba(200,156,74,0.4)",
          borderRadius: "50%",
          pointerEvents: "none",
          visibility: "hidden",
          zIndex: 9998,
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Inner gold glow dot */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: "#c89c4a",
          boxShadow: "0 0 8px 2px rgba(200,156,74,0.9)",
          pointerEvents: "none",
          visibility: "hidden",
          zIndex: 9999,
          transform: "translate(-50%, -50%)",
          transition: "opacity 0.2s ease",
        }}
      />
    </>
  );
}
