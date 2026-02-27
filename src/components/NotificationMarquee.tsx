'use client';

import { useEffect, useState } from 'react';
import { NotificationMsg } from '@/lib/notifications';

export default function NotificationMarquee() {
    const [messages, setMessages] = useState<NotificationMsg[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch only active notifications (active status + within date range)
        fetch('/api/notifications?active=true')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setMessages(data);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading || messages.length === 0) return null;

    // Build the scrolling content
    return (
        <div className="w-full bg-slate-900 border-b border-slate-800 text-white overflow-hidden py-2 relative z-50 flex items-center">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>

            {/* The title/icon box on the left */}
            <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 ml-4 rounded-sm flex items-center gap-2 whitespace-nowrap z-20 shrink-0 uppercase tracking-wider shadow-sm">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Thông báo
            </div>

            {/* Scrolling container */}
            <div className="flex-1 overflow-hidden relative ml-4 flex items-center h-full">
                <div
                    className="whitespace-nowrap inline-flex items-center gap-24"
                    style={{
                        animation: `marquee ${messages.length * 10}s linear infinite`,
                        // We use a CSS variable or inline style for the animation.
                        // Tailwind doesn't have a built-in unlimited marquee. Let's add standard CSS.
                    }}
                >
                    {/* We render the list twice to create a seamless infinite loop effect if needed,
                        but simple CSS animation from 100% to -100% works fine for most cases. */}
                    {messages.map((msg, idx) => (
                        <div
                            key={msg.id + '-' + idx}
                            className="inline-flex items-center gap-2 text-sm"
                            style={{
                                fontWeight: msg.isBold ? 'bold' : 'normal',
                                color: msg.textColor || '#ffffff',
                                backgroundColor: msg.highlightColor || 'transparent',
                                padding: msg.highlightColor ? '0 8px' : '0',
                                borderRadius: msg.highlightColor ? '4px' : '0',
                            }}
                        >
                            • {msg.content}
                        </div>
                    ))}

                </div>
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>

            <style jsx>{`
                @keyframes marquee {
                    0% {
                        transform: translateX(100%);
                    }
                    100% {
                        transform: translateX(-100%);
                    }
                }
            `}</style>
        </div>
    );
}
