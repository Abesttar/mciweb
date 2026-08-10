'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { FileText, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Invoice {
    id: number;
    invoice_number: string;
    payment_type: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    due_date: string;
    order_date: string;
    creator?: { name: string };
    created_at: string;
}

function formatRp(num: number) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
}

function getDueStatus(dueDateStr: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Jatuh Tempo', color: 'red', icon: AlertCircle };
    if (diffDays <= 3) return { label: `${diffDays} hari lagi`, color: 'amber', icon: Clock };
    return { label: `${diffDays} hari lagi`, color: 'blue', icon: Clock };
}

export default function InvoiceTab({ studentId }: { studentId: string }) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            // Jika dipanggil dari akun siswa sendiri, gunakan /invoices/my
            // Jika dari staff melihat profil siswa, gunakan /students/{id}/invoices
            const endpoint = studentId === 'me'
                ? '/api/invoices/my'
                : `/api/students/${studentId}/invoices`;
            const res = await axios.get(endpoint);
            setInvoices(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-gray-400">
                <span>Memuat data invoice...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500 mt-6">
            <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-6">
                    <FileText className="w-5 h-5 mr-2 text-red-700 dark:text-red-400" />
                    Tagihan Invoice
                </h3>

                {invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <CheckCircle2 className="w-14 h-14 mb-3 text-green-400" />
                        <p className="font-medium text-gray-500 dark:text-gray-400">Tidak ada tagihan invoice saat ini</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {invoices.map((inv) => {
                            const status = getDueStatus(inv.due_date);
                            const StatusIcon = status.icon;
                            const colorMap: Record<string, string> = {
                                red: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50',
                                amber: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50',
                                blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50',
                            };
                            const badgeColorMap: Record<string, string> = {
                                red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                                amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                                blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                            };

                            return (
                                <div
                                    key={inv.id}
                                    className={`rounded-xl border p-5 ${colorMap[status.color]} transition-all`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">
                                                    {inv.invoice_number}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badgeColorMap[status.color]}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label}
                                                </span>
                                            </div>
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">
                                                {inv.payment_type}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Tanggal Invoice: {formatDate(inv.order_date)} &nbsp;·&nbsp; Jatuh Tempo: {formatDate(inv.due_date)}
                                            </p>
                                            {inv.creator && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                    Dibuat oleh: {inv.creator.name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                {formatRp(inv.total_amount)}
                                            </p>
                                            {inv.tax_amount > 0 && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    (Pajak: {formatRp(inv.tax_amount)})
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
