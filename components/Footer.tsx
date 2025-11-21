/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Enhanced remix ideas with more creative prompts
const REMIX_IDEAS = [
    "to create cinematic Bollywood-style portraits with AI magic.",
    "to transform your photos into animated video masterpieces.",
    "to generate iconic Bollywood meme moments with your face.",
    "to explore different portrait styles from cinematic to fantasy.",
    "to create professional-grade AI portraits in various moods.",
    "to bring your photos to life with dramatic lighting effects.",
    "to generate custom scenes with your unique creative vision.",
    "to create fantasy versions of yourself in epic scenarios.",
];

// Enhanced themes with better visual design
const ThemeSwitcher = () => {
    const [theme, setThemeState] = useState('dark');
    const [isHovering, setIsHovering] = useState(false);

    const setTheme = (name: string) => {
        const root = document.documentElement;
        if (name === 'dark' || name === 'playful' || name === 'premium') {
            root.setAttribute('data-theme', name);
        } else {
            root.removeAttribute('data-theme'); // 'light' is default
        }
        setThemeState(name);
        try {
            localStorage.setItem('app-theme', name);
        } catch (e) {
            console.error("Failed to save theme to localStorage", e);
        }
    };

    useEffect(() => {
        const savedTheme = (() => {
            try {
                return localStorage.getItem('app-theme');
            } catch (e) {
                return null;
            }
        })();
        setTheme(savedTheme || 'dark');
    }, []);

    const themes = [
        { name: 'Light', value: 'light', icon: '☀️' },
        { name: 'Dark', value: 'dark', icon: '🌙' },
        { name: 'Playful', value: 'playful', icon: '🎨' },
        { name: 'Premium', value: 'premium', icon: '✨' },
    ];

    return (
        <motion.div 
            className="relative"
            onHoverStart={() => setIsHovering(true)}
            onHoverEnd={() => setIsHovering(false)}
        >
            <div className="bg-glass border border-glass-border rounded-full p-1 flex items-center gap-1 shadow-sm backdrop-blur-sm">
                {themes.map(t => (
                    <motion.button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        aria-pressed={theme === t.value}
                        className={`text-sm px-3 py-1.5 rounded-full transition-all duration-300 flex items-center gap-2 focus:outline-none ${
                            theme === t.value
                                ? 'bg-accent text-white shadow-lg scale-105'
                                : 'bg-transparent text-muted hover:text-text hover:bg-surface/50'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="text-xs">{t.icon}</span>
                        <span className="hidden sm:inline">{t.name}</span>
                    </motion.button>
                ))}
            </div>
            
            {/* Theme preview tooltip */}
            <AnimatePresence>
                {isHovering && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-surface border border-glass-border rounded-lg p-3 shadow-xl backdrop-blur-sm z-50 min-w-[140px]"
                    >
                        <div className="text-xs font-medium text-text mb-2 text-center">
                            Choose Theme
                        </div>
                        <div className="flex justify-center gap-1">
                            {themes.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => setTheme(t.value)}
                                    className={`w-6 h-6 rounded-full text-xs transition-all duration-300 ${
                                        theme === t.value 
                                            ? 'ring-2 ring-accent scale-110' 
                                            : 'hover:scale-105'
                                    }`}
                                    style={{
                                        background: t.value === 'light' ? '#f8fafc' :
                                                   t.value === 'dark' ? '#1e293b' :
                                                   t.value === 'playful' ? '#ec4899' :
                                                   '#8b5cf6'
                                    }}
                                    title={t.name}
                                >
                                    {t.icon}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Enhanced Footer with better animations and structure
const Footer = () => {
    const [index, setIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Handle scroll to hide/show footer
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    // Rotate through remix ideas
    useEffect(() => {
        const intervalId = setInterval(() => {
            setIndex(prevIndex => (prevIndex + 1) % REMIX_IDEAS.length);
        }, 4000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <motion.footer 
            className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-lg p-3 z-50 text-muted text-sm border-t border-glass-border"
            initial={{ y: 0 }}
            animate={{ y: isVisible ? 0 : 100 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
            <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
                {/* Left Side - Theme & Creator */}
                <div className="flex items-center gap-4 text-muted whitespace-nowrap order-2 sm:order-1">
                    <ThemeSwitcher />
                    
                    <motion.div 
                        className="hidden md:flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="w-px h-4 bg-glass-border" aria-hidden="true"></span>
                        <p className="text-xs">
                            Created by{' '}
                            <motion.a
                                href="https://x.com/ammaar"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted hover:text-accent-2 transition-colors duration-200 font-medium"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                @ammaar
                            </motion.a>
                        </p>
                    </motion.div>
                </div>

                {/* Center - Rotating Ideas */}
                <div className="flex-grow flex justify-center order-1 sm:order-2">
                    <motion.div 
                        className="flex items-center gap-3 text-muted max-w-md"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <motion.span 
                            className="text-accent-2 hidden sm:block"
                            animate={{ rotate: [0, 15, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                        >
                            💡
                        </motion.span>
                        <span className="text-xs font-medium whitespace-nowrap flex-shrink-0">
                            Try this app...
                        </span>
                        <div className="relative w-64 h-5 flex items-center">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={index}
                                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    className="absolute inset-0 font-semibold text-text whitespace-nowrap text-center text-sm"
                                >
                                    {REMIX_IDEAS[index]}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>

                {/* Right Side - Action Buttons */}
                <div className="flex items-center gap-3 order-3">
                    <motion.div 
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <motion.a
                            href="https://aistudio.google.com/apps"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-heading text-sm text-center text-white bg-gradient-to-r from-accent-2 to-purple-600 py-2 px-4 rounded-lg transform transition-all duration-300 hover:scale-105 hover:-rotate-1 hover:shadow-lg whitespace-nowrap border border-accent-2/20"
                            whileHover={{ scale: 1.05, rotate: -1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            🚀 AI Studio Apps
                        </motion.a>
                        
                        <motion.a
                            href="https://gemini.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-heading text-sm text-center text-text bg-glass border border-glass-border py-2 px-4 rounded-lg transform transition-all duration-300 hover:scale-105 hover:rotate-1 hover:bg-surface/80 hover:shadow-lg whitespace-nowrap hidden sm:block"
                            whileHover={{ scale: 1.05, rotate: 1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            🤖 Chat with Gemini
                        </motion.a>
                    </motion.div>
                </div>
            </div>

            {/* Mobile optimized layout */}
            <motion.div 
                className="mt-3 pt-3 border-t border-glass-border sm:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex justify-between items-center text-xs">
                    <span>
                        By{' '}
                        <a
                            href="https://x.com/ammaar"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-2 font-medium"
                        >
                            @ammaar
                        </a>
                    </span>
                    <a
                        href="https://gemini.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text bg-surface px-3 py-1 rounded border border-glass-border"
                    >
                        Gemini
                    </a>
                </div>
            </motion.div>
        </motion.footer>
    );
};

export default Footer;