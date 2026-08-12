'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from '@/lib/axios';
import { useRouter, usePathname } from 'next/navigation';

export interface User {
    id: number;
    name: string;
    email: string;
    profile_photo?: string | null;
    profile_photo_url?: string | null;
    roles: string[];
    permissions: string[];
    profile?: {
        phone?: string | null;
        address?: string | null;
        gender?: string | null;
    } | null;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string, userData: User) => void;
    logout: () => Promise<void>;
    updateUser: (userData: User) => void;
    hasRole: (role: string) => boolean;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const res = await axios.get('/api/me');
                    setUser(res.data.user);
                } catch (error) {
                    console.error('Failed to load user', error);
                    localStorage.removeItem('token');
                    delete axios.defaults.headers.common['Authorization'];
                    if (pathname !== '/login') {
                        window.location.href = '/login';
                    }
                }
            } else {
                if (pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
            setIsLoading(false);
        };
        
        loadUser();
    }, [pathname, router]);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        // Use hard redirect to bypass stale browser cache / service worker issues
        window.location.href = '/dashboard';
    };

    const updateUser = (userData: User) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await axios.post('/api/logout');
        } catch (error) {
            console.error('Failed to logout in backend', error);
        } finally {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            window.location.href = '/login';
        }
    };

    const hasRole = (role: string) => {
        return user?.roles.includes(role) || false;
    };

    const hasPermission = (permission: string) => {
        return user?.permissions.includes(permission) || user?.roles.includes('Super Admin') || false;
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser, hasRole, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
