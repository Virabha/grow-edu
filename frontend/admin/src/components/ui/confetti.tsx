"use client";
import { useEffect, useRef } from "react";
interface ConfettiProps {
    onComplete?: () => void;
}
export function Confetti({ onComplete }: ConfettiProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        const colors = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"];
        const confettiCount = 150;
        const confetti: HTMLElement[] = [];
        for (let i = 0; i < confettiCount; i++) {
            const confettiPiece = document.createElement("div");
            const color = colors[Math.floor(Math.random() * colors.length)] ?? "#22c55e";
            const size = Math.random() * 10 + 5;
            const left = Math.random() * 100;
            const delay = Math.random() * 0.5;
            confettiPiece.style.position = "absolute";
            confettiPiece.style.width = `${size}px`;
            confettiPiece.style.height = `${size}px`;
            confettiPiece.style.backgroundColor = color;
            confettiPiece.style.left = `${left}%`;
            confettiPiece.style.top = "-10px";
            confettiPiece.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";
            confettiPiece.style.opacity = "0";
            confettiPiece.style.transform = `rotate(${Math.random() * 360}deg)`;
            container.appendChild(confettiPiece);
            confetti.push(confettiPiece);
            const animation = confettiPiece.animate([
                {
                    opacity: 1,
                    transform: `translateY(0) rotate(${Math.random() * 360}deg)`,
                },
                {
                    opacity: 1,
                    transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 720}deg)`,
                },
            ], {
                duration: 3000 + Math.random() * 2000,
                delay: delay * 1000,
                easing: "cubic-bezier(0.5, 0, 0.5, 1)",
            });
            animation.onfinish = () => {
                confettiPiece.remove();
            };
        }
        const timeout = setTimeout(() => {
            onComplete?.();
        }, 4000);
        return () => {
            clearTimeout(timeout);
            confetti.forEach((piece) => piece.remove());
        };
    }, [onComplete]);
    return (<div ref={containerRef} className="fixed inset-0 pointer-events-none z-50 overflow-hidden"/>);
}
