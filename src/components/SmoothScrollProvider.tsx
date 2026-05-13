'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * SmoothScrollProvider
 * Khởi tạo Lenis smooth scroll cho toàn trang.
 * Chỉ dùng trên trang index (public), KHÔNG dùng trong admin layout.
 */
export default function SmoothScrollProvider() {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.15,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            touchMultiplier: 1.5,
            infinite: false,
        });

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        const rafId = requestAnimationFrame(raf);

        // Fix anchor links with Lenis
        const handleAnchorClick = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('a[href^="#"]');
            if (!target) return;
            e.preventDefault();
            const id = (target.getAttribute('href') || '').slice(1);
            const el = document.getElementById(id);
            if (el) lenis.scrollTo(el, { offset: -60, duration: 1.4 });
        };
        document.addEventListener('click', handleAnchorClick);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
            document.removeEventListener('click', handleAnchorClick);
        };
    }, []);

    return null;
}
