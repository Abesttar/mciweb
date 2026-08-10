'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { id } from '@/locales/id';
import { jp } from '@/locales/jp';

type Language = 'id' | 'jp';
type Translations = typeof id;

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('id');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const initLang = () => {
            setMounted(true);
            const storedLang = localStorage.getItem('language') as Language;
            if (storedLang && ['id', 'jp'].includes(storedLang)) {
                setLanguageState(storedLang);
            }
        };
        initLang();
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    const t = language === 'jp' ? jp : id;

    // Prevent hydration mismatch by rendering default translation context while mounting
    if (!mounted) {
        return (
             <LanguageContext.Provider value={{ language: 'id', setLanguage, t: id }}>
                <div style={{ visibility: 'hidden' }}>{children}</div>
             </LanguageContext.Provider>
        )
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
