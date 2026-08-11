'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from '@/lib/axios';
import Link from 'next/link';
import {
    BookOpen, FileText, Receipt,
    ChevronLeft, ChevronRight, ArrowRight,
    CheckCircle2, Calendar,
    Download, GraduationCap, TrendingUp, Lock
} from 'lucide-react';
import { generateKwitansiPdf } from '@/lib/pdfGenerator';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Invoice {
    id: number;
    invoice_number: string;
    payment_type: string;
    amount: number;
    tax_amount?: number;
    total_amount: number;
    due_date: string;
    order_date: string;
}

interface Payment {
    id: number;
    stage: number;
    amount: number;
    payment_date: string;
    description: string | null;
    invoice_number?: string | null;
    payment_type?: string | null;
    is_lunas?: boolean;
    creator?: { name: string };
}

interface AkademikSliderProps {
    stats: any;
    studentName: string;
    studentId: number | string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRp(n: number) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDueStatus(dueDateStr: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0)  return { label: 'Jatuh Tempo', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
    if (diff <= 3) return { label: `${diff} hari lagi`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    return { label: `${diff} hari lagi`, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
}

function terbilang(angka: number): string {
    const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    let hasil = "";
    if (angka < 12) {
        hasil = huruf[angka];
    } else if (angka < 20) {
        hasil = terbilang(angka - 10) + " belas";
    } else if (angka < 100) {
        hasil = terbilang(Math.floor(angka / 10)) + " puluh " + terbilang(angka % 10);
    } else if (angka < 200) {
        hasil = "seratus " + terbilang(angka - 100);
    } else if (angka < 1000) {
        hasil = terbilang(Math.floor(angka / 100)) + " ratus " + terbilang(angka % 100);
    } else if (angka < 2000) {
        hasil = "seribu " + terbilang(angka - 1000);
    } else if (angka < 1000000) {
        hasil = terbilang(Math.floor(angka / 1000)) + " ribu " + terbilang(angka % 1000);
    } else if (angka < 1000000000) {
        hasil = terbilang(Math.floor(angka / 1000000)) + " juta " + terbilang(angka % 1000000);
    }
    return hasil.trim();
}

const STAGE_NAMES: Record<number, string> = {
    1: 'Pendaftaran',
    2: 'Biaya pendidikan tahap 1',
    3: 'Biaya pendidikan tahap 2',
};

// ─── Slide Wrappers ───────────────────────────────────────────────────────────
function SlideCard({ title, icon: Icon, accent, children, href, hrefLabel }: {
    title: string; icon: any; accent: string; children: React.ReactNode; href?: string; hrefLabel?: string;
}) {
    return (
        <div className="flex flex-col h-full min-h-[360px]">
            <div className={`flex items-center justify-between mb-5`}>
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${accent}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">{title}</h3>
                </div>
                {href && (
                    <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        {hrefLabel || 'Lihat Semua'} <ArrowRight className="w-3 h-3" />
                    </Link>
                )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {children}
            </div>
        </div>
    );
}

// ─── Slide 1: Absensi & Nilai ─────────────────────────────────────────────────
function SlideAbsensiNilai({ stats }: { stats: any }) {
    const attendances = stats?.attendances || [];
    const grades = stats?.grades || [];

    const statusColor: Record<string, string> = {
        hadir: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
        sakit: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
        izin:  'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
        alpha: 'text-red-600 bg-red-50 dark:bg-red-900/30',
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 h-full">
            {/* Absensi */}
            <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Riwayat Absensi</p>
                {attendances.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Belum ada data absensi</p>
                ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {attendances.map((a: any) => (
                            <div key={a.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    {formatDate(a.date)}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor[a.status?.toLowerCase()] || 'text-gray-600 bg-gray-100'}`}>
                                    {a.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Nilai */}
            <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Riwayat Nilai</p>
                {grades.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Belum ada data nilai</p>
                ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {grades.map((g: any) => (
                            <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                                <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{g.type || 'Penilaian'}</span>
                                <span className={`text-sm font-bold ${(g.score ?? 0) >= 70 ? 'text-emerald-600' : 'text-red-600'}`}>{g.score ?? '-'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Slide 2: Raport ──────────────────────────────────────────────────────────
function SlideRaport({ enrollments }: { enrollments: any[] }) {
    if (enrollments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <GraduationCap className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">Belum terdaftar di kelas manapun</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {enrollments.map((enr: any) => {
                const isPublished = !!enr.raport_published_at;
                const studyClass  = enr.study_classes?.[0] || enr.studyClass;
                const classId     = studyClass?.id || enr.batch_id;
                return (
                    <div key={enr.id} className={`p-4 rounded-xl border transition-colors group ${isPublished ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-900/10' : 'border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50'}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                    {enr.batch?.name || 'Kelas'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {enr.batch?.teacher?.user?.name ? `Sensei: ${enr.batch.teacher.user.name}` : ''}
                                </p>
                                {isPublished && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Diterbitkan {new Date(enr.raport_published_at).toLocaleDateString('id-ID')}
                                    </p>
                                )}
                            </div>
                            {isPublished ? (
                                <Link
                                    href={`/dashboard/classes/${classId}/raport/${enr.id}`}
                                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                >
                                    <BookOpen className="w-3.5 h-3.5" /> Buka Raport
                                </Link>
                            ) : (
                                <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                                    <Lock className="w-3.5 h-3.5" /> Belum Terbit
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Slide 3: Invoice ─────────────────────────────────────────────────────────
function SlideInvoice({ invoices, studentName }: { invoices: Invoice[]; studentName: string }) {
    const [downloading, setDownloading] = useState<number | null>(null);

    function getRomanMonth(dateStr: string) {
        const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
        return roman[new Date(dateStr).getMonth()];
    }

    const handleDownload = async (inv: Invoice) => {
        setDownloading(inv.id);
        const toastId = toast.loading('Membuat PDF invoice...');
        try {
            const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
            const response = await fetch('/template-invoice.pdf');
            if (!response.ok) throw new Error('Template tidak ditemukan');
            const templateBytes = await response.arrayBuffer();
            const pdfDoc = await PDFDocument.load(templateBytes);
            const font     = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
            const page = pdfDoc.getPages()[0];
            const black = rgb(0, 0, 0);
            const white = rgb(1, 1, 1);

            const year = new Date(inv.order_date).getFullYear();
            const roman = getRomanMonth(inv.order_date);
            const invoiceNo = `INV-${year}-${roman}-${inv.invoice_number.split('-').pop()}`;
            page.drawText(invoiceNo, { x: 245, y: 664.5, size: 14, font: fontBold, color: black });

            const orderDate = new Date(inv.order_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            page.drawText(orderDate, { x: 175, y: 631.5, size: 12, font, color: black });

            const dueDate = new Date(inv.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            page.drawText(dueDate, { x: 175, y: 610.5, size: 12, font, color: black });

            page.drawText(studentName, { x: 175, y: 589, size: 12, font, color: black });

            const formatRp = (num: number) => `Rp. ${new Intl.NumberFormat('id-ID').format(num)},00`;
            const taxAmount = inv.tax_amount || 0;
            const subtotal = inv.total_amount - taxAmount;

            // Keterangan
            const textOptions = { x: 93, y: 544, size: 10, font, color: black, maxWidth: 200, lineHeight: 10 };
            page.drawText(inv.payment_type, textOptions);

            // Pajak
            const taxStr = taxAmount > 0 ? formatRp(taxAmount) : '--';
            page.drawText(taxStr, { x: 315, y: 539, size: 12, font, color: black });

            // Biaya
            page.drawText(formatRp(subtotal), { x: 433, y: 538, size: 12, font, color: black });

            // Subtotal
            page.drawText(formatRp(subtotal), { x: 433, y: 512, size: 12, font, color: black });

            // Lainnya
            page.drawText('--', { x: 433, y: 493, size: 12, font, color: black });

            // Total
            // Kita gunakan warna putih karena di template background tabel total berwarna merah
            page.drawText(formatRp(inv.total_amount), { x: 433, y: 470, size: 11, font: fontBold, color: white });

            const bytes = await pdfDoc.save();
            const blob = new Blob([bytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `Invoice_${studentName}_${inv.invoice_number}.pdf`; a.click();
            URL.revokeObjectURL(url);
            toast.success('Invoice berhasil diunduh', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Gagal membuat PDF invoice', { id: toastId });
        } finally {
            setDownloading(null);
        }
    };

    if (invoices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Receipt className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tidak ada tagihan saat ini</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {invoices.map((inv) => {
                const status = getDueStatus(inv.due_date);
                return (
                    <div key={inv.id} className="p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${status.cls}`}>
                                        {status.label}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400 truncate">{inv.invoice_number}</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight mb-0.5 line-clamp-2">{inv.payment_type}</p>
                                <p className="text-[11px] text-gray-500 mb-2">Jatuh tempo: {formatDate(inv.due_date)}</p>
                                <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-1">{formatRp(inv.total_amount)}</p>
                            </div>
                            <button
                                onClick={() => handleDownload(inv)}
                                disabled={downloading === inv.id}
                                className="shrink-0 flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 sm:px-2.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-60"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{downloading === inv.id ? '...' : 'Unduh'}</span>
                                <span className="sm:hidden">{downloading === inv.id ? '...' : 'Unduh'}</span>
                            </button>
                        </div>
                    </div>
                );
            })}
            {invoices.length > 4 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{invoices.length - 4} tagihan lainnya</p>
            )}
        </div>
    );
}


// ─── Slide 4: Kwitansi ────────────────────────────────────────────────────────
function SlideKwitansi({ payments, studentName }: { payments: Payment[]; studentName: string }) {
    const [downloading, setDownloading] = useState<number | null>(null);

    const handleDownloadKwitansi = async (payment: any) => {
        if (downloading === payment.id) return;

        setDownloading(payment.id);
        const toastId = toast.loading('Membuat kwitansi...');
        try {
            const terbilangText = terbilang(payment.amount) + " rupiah";
            
            let paymentDesc = payment.payment_type || STAGE_NAMES[payment.stage];
            if (payment.is_lunas === false) {
                paymentDesc = "Cicilan " + paymentDesc;
            }
            
            const kwitansiNoRaw = payment.invoice_number ? payment.invoice_number : `INV-${payment.id.toString().padStart(5, '0')}`;
            
            const bytes = await generateKwitansiPdf({
                is_lunas: payment.is_lunas !== false,
                kwitansiNoRaw,
                studentName,
                amount: payment.amount,
                terbilangText,
                paymentDesc,
                payment_date: payment.payment_date,
            });

            const blob = new Blob([bytes as any], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Kwitansi_${studentName}_${kwitansiNoRaw}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Kwitansi berhasil diunduh', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Gagal membuat kwitansi', { id: toastId });
        } finally {
            setDownloading(null);
        }
    };

    if (payments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Receipt className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">Belum ada riwayat pembayaran</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-colors">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-white">{STAGE_NAMES[p.stage] || `Tahap ${p.stage}`}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.payment_date)} · {formatRp(p.amount)}</p>
                    </div>
                    <button
                        onClick={() => handleDownloadKwitansi(p)}
                        disabled={downloading === p.id}
                        className="shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-60"
                    >
                        <Download className="w-3.5 h-3.5" />
                        {downloading === p.id ? '...' : 'Unduh'}
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── Main Slider ──────────────────────────────────────────────────────────────
export default function AkademikSlider({ stats, studentName, studentId }: AkademikSliderProps) {
    const [activeSlide, setActiveSlide] = useState(0);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const trackRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const isDragging = useRef(false);

    const SLIDES = [
        { id: 'absensi', label: 'Absensi & Nilai',  icon: TrendingUp,    accent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
        { id: 'raport',  label: 'Raport',            icon: BookOpen,      accent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
        { id: 'invoice', label: 'Invoice Tagihan',   icon: FileText,      accent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
        { id: 'kwitansi',label: 'Kwitansi',          icon: Receipt,       accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    ];

    useEffect(() => {
        axios.get('/api/invoices/my').then(r => setInvoices(r.data)).catch(() => {});
        axios.get('/api/me/payments').then(r => setPayments(r.data)).catch(() => {});
        axios.get('/api/me/enrollments').then(r => setEnrollments(r.data)).catch(() => {});
    }, []);

    // Swipe support
    const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; isDragging.current = true; };
    const handleTouchEnd   = (e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const diff = startX.current - e.changedTouches[0].clientX;
        if (diff > 50 && activeSlide < SLIDES.length - 1) setActiveSlide(s => s + 1);
        if (diff < -50 && activeSlide > 0)               setActiveSlide(s => s - 1);
        isDragging.current = false;
    };

    const slideContent = [
        <SlideAbsensiNilai key="a" stats={stats} />,
        <SlideRaport       key="r" enrollments={enrollments} />,
        <SlideInvoice      key="i" invoices={invoices} studentName={studentName} />,
        <SlideKwitansi     key="k" payments={payments} studentName={studentName} />,
    ];

    return (
        <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-red-700 dark:text-red-400" />
                    <h2 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Akademik Saya</h2>
                </div>
                {/* Navigation arrows */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveSlide(s => Math.max(0, s - 1))}
                        disabled={activeSlide === 0}
                        className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setActiveSlide(s => Math.min(SLIDES.length - 1, s + 1))}
                        disabled={activeSlide === SLIDES.length - 1}
                        className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tab Pills */}
            <div className="flex gap-1.5 px-4 sm:px-6 pt-3 pb-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {SLIDES.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <button
                            key={s.id}
                            onClick={() => setActiveSlide(i)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all shrink-0 border ${
                                activeSlide === i
                                    ? 'bg-red-700 text-white border-red-700 shadow-sm'
                                    : 'bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-red-300 hover:text-red-700 dark:hover:text-red-400'
                            }`}
                        >
                            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            {s.label}
                        </button>
                    );
                })}
            </div>

            {/* Slide Content */}
            <div
                ref={trackRef}
                className="px-4 sm:px-6 py-4 sm:py-5"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div className="min-h-[250px] sm:min-h-[300px]">
                    {slideContent[activeSlide]}
                </div>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 pb-4">
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveSlide(i)}
                        className={`rounded-full transition-all ${activeSlide === i ? 'w-3 h-1 sm:w-4 sm:h-1.5 bg-red-600' : 'w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-red-400'}`}
                    />
                ))}
            </div>
        </div>
    );
}
