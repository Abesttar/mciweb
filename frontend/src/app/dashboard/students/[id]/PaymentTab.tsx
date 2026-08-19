import React, { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Edit, Plus, FileText, Download, CheckCircle, Clock, CreditCard, Printer } from 'lucide-react';
import { generateKwitansiPdf } from '@/lib/pdfGenerator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';



function getRomanMonth() {
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romanMonths[new Date().getMonth()];
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

interface PaymentData {
    id: number;
    student_id: number;
    stage: number;
    amount: number;
    payment_date: string;
    description: string | null;
    invoice_number: string | null;
    payment_type: string | null;
    is_lunas: boolean;
    creator?: {
        name: string;
    };
}



export default function StudentPaymentTab({ studentId, studentInfo }: { studentId: string, studentInfo: any }) {
    const { hasRole } = useAuth();
    const isStudent = hasRole('Siswa');

    const isReguler = !studentInfo?.training_program || studentInfo?.training_program?.name?.toLowerCase().includes('reguler');

    const paymentOptions: { label: string; amount: number; stageId: number }[] = isReguler 
        ? [
            { label: 'Biaya Pendaftaran', amount: 500000, stageId: 1 },
            { label: 'Biaya Pendidikan Tahap 1 : Pendidikan Kelas Katakana & Hiragana', amount: 500000, stageId: 2 },
            { label: 'Biaya Pendidikan Tahap 1 : Pendidikan Kelas Shou (Dasar)', amount: 1000000, stageId: 2 },
            { label: 'Biaya Pendidikan Tahap 1 : Pendidikan Kelas Chuu (Menengah)', amount: 1000000, stageId: 2 },
            { label: 'Biaya Pendidikan Tahap 1 : Pendidikan Kelas Kou (Atas)', amount: 1000000, stageId: 2 },
            { label: 'Biaya Pendidikan Tahap 2 : Lulus ujian JFT (N4)', amount: 3000000, stageId: 3 },
            { label: 'Biaya Pendidikan Tahap 2 : Lolos Wawancara Kerja', amount: 3000000, stageId: 3 },
        ]
        : studentInfo?.training_program?.stages?.map((stage: { name: string; amount: number }, index: number) => ({
            label: stage.name,
            amount: Number(stage.amount),
            stageId: index + 1
        })) || [];

    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingPayment, setDeletingPayment] = useState<PaymentData | null>(null);
    const [editingPayment, setEditingPayment] = useState<PaymentData | null>(null);

    // Invoice delete & edit state
    const [deleteInvoiceDialogOpen, setDeleteInvoiceDialogOpen] = useState(false);
    const [deletingInvoice, setDeletingInvoice] = useState<any | null>(null);
    const [deletingInvoiceLoading, setDeletingInvoiceLoading] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<any | null>(null);

    const [form, setForm] = useState({ 
        stage: '1', 
        invoice_number: '', 
        payment_type: '', 
        amount: '', 
        payment_date: new Date().toISOString().split('T')[0], 
        description: '',
        is_lunas: true
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Invoice Form State
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [generatingInvoice, setGeneratingInvoice] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({
        invoice_number: '',
        due_date: '',
        order_date: new Date().toISOString().split('T')[0],
        payment_type: '',
        tax: '',
    });
    
    useEffect(() => {
        setInvoiceForm(prev => ({
            ...prev,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            invoice_number: `INV-${new Date().getFullYear()}-${getRomanMonth()}-`
        }));
    }, []);

    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const [kwitansiPreviewUrl, setKwitansiPreviewUrl] = useState<string | null>(null);
    const [kwitansiPreviewLoading, setKwitansiPreviewLoading] = useState(false);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const [paymentsRes, summaryRes, invoicesRes] = await Promise.all([
                axios.get(`/api/students/${studentId}/payments`),
                axios.get(`/api/students/${studentId}/payment-summary`),
                axios.get(`/api/students/${studentId}/invoices`),
            ]);
            setPayments(paymentsRes.data);
            setSummary(summaryRes.data);
            setInvoices(invoicesRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    useEffect(() => {
        if (!dialogOpen) return;
        
        let objectUrl: string;
        const generatePreview = async () => {
            setKwitansiPreviewLoading(true);
            try {
                const studentName = studentInfo?.name || 'Siswa';
                const amount = Number(form.amount) || 0;
                const terbilangText = terbilang(amount) + " rupiah";
                
                let paymentDesc = form.payment_type || `Tahap ${form.stage}`;
                if (!form.is_lunas) {
                    paymentDesc = "Cicilan " + paymentDesc;
                }
                
                const kwitansiNoRaw = (form.invoice_number && form.invoice_number !== 'TIDAK_ADA_INVOICE')
                    ? form.invoice_number
                    : '-';

                const bytes = await generateKwitansiPdf({
                    is_lunas: form.is_lunas,
                    kwitansiNoRaw,
                    studentName,
                    amount: amount,
                    terbilangText,
                    paymentDesc,
                    payment_date: form.payment_date || new Date().toISOString(),
                });

                const blob = new Blob([bytes as any], { type: 'application/pdf' });
                objectUrl = window.URL.createObjectURL(blob);
                setKwitansiPreviewUrl(objectUrl);
            } catch (err) {
                console.error('Error rendering kwitansi preview PDF', err);
            } finally {
                setKwitansiPreviewLoading(false);
            }
        };

        const timeout = setTimeout(generatePreview, 300);
        return () => {
            clearTimeout(timeout);
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [form, studentInfo, dialogOpen]);

    const openCreate = () => {
        setEditingPayment(null);
        setForm({
            stage: '1',
            invoice_number: '',
            payment_type: '',
            amount: '',
            payment_date: new Date().toISOString().split('T')[0],
            description: '',
            is_lunas: true
        });
        setError('');
        setKwitansiPreviewUrl(null);
        setDialogOpen(true);
    };

    const handleEditPayment = (payment: PaymentData) => {
        setEditingPayment(payment);
        setForm({
            stage: payment.stage.toString(),
            invoice_number: payment.invoice_number || 'TIDAK_ADA_INVOICE',
            payment_type: payment.payment_type || '',
            amount: payment.amount.toString(),
            payment_date: new Date(payment.payment_date).toISOString().split('T')[0],
            description: payment.description || '',
            is_lunas: payment.is_lunas
        });
        setError('');
        setKwitansiPreviewUrl(null);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.stage || !form.amount || !form.payment_date) {
            setError('Semua field wajib harus diisi.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = {
                stage: parseInt(form.stage),
                amount: parseFloat(form.amount),
                payment_date: form.payment_date,
                description: form.description || null,
                invoice_number: (form.invoice_number && form.invoice_number !== 'TIDAK_ADA_INVOICE') ? form.invoice_number : null,
                payment_type: form.payment_type || null,
                is_lunas: form.is_lunas
            };

            if (editingPayment) {
                await axios.put(`/api/payments/${editingPayment.id}`, payload);
            } else {
                await axios.post(`/api/students/${studentId}/payments`, payload);
            }
            
            setDialogOpen(false);
            setEditingPayment(null);
            fetchPayments();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan data pembayaran');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingPayment) return;
        try {
            await axios.delete(`/api/payments/${deletingPayment.id}`);
            setDeleteDialogOpen(false);
            setDeletingPayment(null);
            fetchPayments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus data');
        }
    };

    const handleDeleteInvoice = async () => {
        if (!deletingInvoice) return;
        setDeletingInvoiceLoading(true);
        try {
            await axios.delete(`/api/invoices/${deletingInvoice.id}`);
            toast.success('Invoice berhasil dihapus');
            setDeleteInvoiceDialogOpen(false);
            setDeletingInvoice(null);
            fetchPayments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus invoice');
        } finally {
            setDeletingInvoiceLoading(false);
        }
    };

    const handleOpenInvoiceDialog = () => {
        setEditingInvoice(null);
        setInvoiceForm({
            invoice_number: `INV-${new Date().getFullYear()}-${getRomanMonth()}-`,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            order_date: new Date().toISOString().split('T')[0],
            payment_type: '',
            tax: '',
        });
        setPdfPreviewUrl(null);
        setInvoiceDialogOpen(true);
    };

    const handleEditInvoice = (inv: any) => {
        setEditingInvoice(inv);
        setInvoiceForm({
            invoice_number: inv.invoice_number,
            due_date: new Date(inv.due_date).toISOString().split('T')[0],
            order_date: new Date(inv.order_date).toISOString().split('T')[0],
            payment_type: inv.payment_type,
            tax: inv.tax_amount ? inv.tax_amount.toString() : '',
        });
        setPdfPreviewUrl(null);
        setInvoiceDialogOpen(true);
    };

    const generatePdfBytes = useCallback(async () => {
        try {
            const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

            // Fetch the template
            const response = await fetch('/template-invoice.pdf');
            if (!response.ok) {
                throw new Error('Template PDF tidak ditemukan! Harap pastikan file template-invoice.pdf ada di folder public.');
            }
            const templateBytes = await response.arrayBuffer();

            const pdfDoc = await PDFDocument.load(templateBytes);
            const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
            const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

            const pages = pdfDoc.getPages();
            const page = pages[0]; // Assuming it's the first page

            const black = rgb(0, 0, 0);
            const white = rgb(1, 1, 1);

            // 1. Invoice Number (editable by user)
            const invoiceNo = invoiceForm.invoice_number;

            // TULIS TEKS (Koordinat x, y adalah contoh dan perlu disesuaikan dengan template asli)
            // Sistem koordinat PDF: x=0, y=0 di kiri Bawah. 
            // Ukuran A4 biasanya x: 595, y: 842

            page.drawText(invoiceNo, { x: 245, y: 664.5, size: 14, font: fontBold, color: black });

            // 2. Tanggal Order
            const orderDateObj = new Date(invoiceForm.order_date);
            const orderDate = orderDateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            page.drawText(orderDate, { x: 175, y: 631.5, size: 12, font, color: black });

            // 3. Tanggal Jatuh Tempo
            const dueDateObj = new Date(invoiceForm.due_date);
            const dueDate = dueDateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            page.drawText(dueDate, { x: 175, y: 610.5, size: 12, font, color: black });

            // 4. Bill To
            const studentName = studentInfo?.name || 'Siswa';
            page.drawText(studentName, { x: 175, y: 589, size: 12, font, color: black });

            // Table logic
            const selectedOption = paymentOptions.find(opt => opt.label === invoiceForm.payment_type);
            const biayaAmount = selectedOption ? selectedOption.amount : 0;
            const formatRp = (num: number) => `Rp. ${new Intl.NumberFormat('id-ID').format(num)},00`;

            const taxAmount = invoiceForm.tax ? parseFloat(invoiceForm.tax) : 0;
            const totalAmount = biayaAmount + taxAmount;

            // Keterangan
            const textOptions = { x: 93, y: 544, size: 10, font, color: black, maxWidth: 200, lineHeight: 10 };
            page.drawText(invoiceForm.payment_type, textOptions);

            // Pajak
            const taxStr = taxAmount > 0 ? formatRp(taxAmount) : '--';
            page.drawText(taxStr, { x: 315, y: 539, size: 12, font, color: black });

            // Biaya
            page.drawText(formatRp(biayaAmount), { x: 433, y: 538, size: 12, font, color: black });

            // Subtotal
            page.drawText(formatRp(biayaAmount), { x: 433, y: 512, size: 12, font, color: black });

            // Lainnya
            page.drawText('--', { x: 433, y: 493, size: 12, font, color: black });

            // Total
            // Kita gunakan warna putih karena di template background tabel total berwarna merah
            page.drawText(formatRp(totalAmount), { x: 433, y: 470, size: 11, font: fontBold, color: white });

            const pdfBytes = await pdfDoc.save();
            return pdfBytes;
        } catch (err: any) {
            console.error(err);
            return null;
        }
    }, [invoiceForm, studentInfo]);

    useEffect(() => {
        let active = true;
        let objectUrl = '';

        if (invoiceDialogOpen) {
            setPreviewLoading(true);
            generatePdfBytes().then(bytes => {
                if (!active || !bytes) {
                    setPreviewLoading(false);
                    return;
                }
                const blob = new Blob([bytes as any], { type: 'application/pdf' });
                objectUrl = window.URL.createObjectURL(blob);
                setPdfPreviewUrl(objectUrl);
                setPreviewLoading(false);
            }).catch(err => {
                console.error('Error rendering preview PDF', err);
                setPreviewLoading(false);
            });
        }

        return () => {
            active = false;
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [invoiceForm, invoiceDialogOpen, generatePdfBytes]);

    const handleSaveInvoice = async () => {
        if (!invoiceForm.invoice_number || !invoiceForm.payment_type || !invoiceForm.due_date) {
            toast.error('Mohon lengkapi Nomor Invoice, Tanggal Jatuh Tempo, dan Keterangan Pembayaran.');
            return;
        }

        if (!pdfPreviewUrl) return;

        const invoiceNo = invoiceForm.invoice_number;
        const studentName = studentInfo?.name || 'Siswa';

        const toastId = toast.loading('Menyimpan & mengunduh invoice...');

        try {
            // 2. Simpan ke database & kirim notifikasi ke siswa
            const selectedOption = paymentOptions.find(opt => opt.label === invoiceForm.payment_type);
            const biayaAmount = selectedOption ? selectedOption.amount : 0;
            const taxAmount = invoiceForm.tax ? parseFloat(invoiceForm.tax) : 0;
            const totalAmount = biayaAmount + taxAmount;

            if (editingInvoice) {
                await axios.put(`/api/invoices/${editingInvoice.id}`, {
                    invoice_number: invoiceNo,
                    payment_type: invoiceForm.payment_type,
                    amount: biayaAmount,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    due_date: invoiceForm.due_date,
                    order_date: invoiceForm.order_date,
                });
                toast.success('Invoice berhasil diperbarui', { id: toastId });
            } else {
                await axios.post(`/api/students/${studentId}/invoices`, {
                    invoice_number: invoiceNo,
                    payment_type: invoiceForm.payment_type,
                    amount: biayaAmount,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    due_date: invoiceForm.due_date,
                    order_date: invoiceForm.order_date,
                });
                toast.success('Invoice tersimpan & notifikasi terkirim ke siswa', { id: toastId });
            }

            setInvoiceDialogOpen(false);
            setEditingInvoice(null);
            // Refresh invoices
            fetchPayments();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Gagal menyimpan invoice ke database', { id: toastId });
        }
    };

    const handleDownloadHistoryInvoice = async (inv: any) => {
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

            const invoiceNo = inv.invoice_number;

            page.drawText(invoiceNo, { x: 245, y: 664.5, size: 14, font: fontBold, color: black });

            const orderDate = new Date(inv.order_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            page.drawText(orderDate, { x: 175, y: 631.5, size: 12, font, color: black });

            const dueDate = new Date(inv.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            page.drawText(dueDate, { x: 175, y: 610.5, size: 12, font, color: black });

            const studentName = studentInfo?.name || 'Siswa';
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
            page.drawText(formatRp(inv.total_amount), { x: 433, y: 470, size: 11, font: fontBold, color: white });

            const bytes = await pdfDoc.save();
            const blob = new Blob([bytes as any], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${studentName}_${invoiceNo}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Invoice berhasil diunduh', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Gagal membuat PDF invoice', { id: toastId });
        }
    };



    const handleDownloadKwitansi = async (payment: PaymentData) => {
        const toastId = toast.loading('Membuat Kwitansi...');
        try {
            const studentName = studentInfo?.name || 'Siswa';
            const terbilangText = terbilang(payment.amount) + " rupiah";
            
            let paymentDesc = payment.payment_type || `Tahap ${payment.stage}`;
            if (!payment.is_lunas) {
                paymentDesc = "Cicilan " + paymentDesc;
            }
            
            const kwitansiNoRaw = payment.invoice_number ? payment.invoice_number : `INV-${payment.id.toString().padStart(5, '0')}`;
            
            const bytes = await generateKwitansiPdf({
                is_lunas: !!payment.is_lunas,
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
            const kwitansiNo = /^\d/.test(kwitansiNoRaw)
                ? (kwitansiNoRaw.split('-').shift() || kwitansiNoRaw)
                : (kwitansiNoRaw.split('-').pop() || kwitansiNoRaw);
            a.download = `Kwitansi_${studentName}_${kwitansiNo}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Kwitansi berhasil diunduh', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Gagal membuat Kwitansi', { id: toastId });
        }
    };

    // handlePreviewKwitansi removed (replaced by realtime preview)

    return (
        <div className="space-y-6 animate-in fade-in duration-500 mt-6">
            {/* Progress Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.keys(summary.summary).map((stageKey) => {
                        const stageId = Number(stageKey);
                        const st = summary.summary[stageId];
                        if (!st) return null;
                        return (
                            <div key={stageId} className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover-lift relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{st.name}</p>
                                        <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                                            Rp {new Intl.NumberFormat('id-ID').format(st.paid)}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            dari Rp {new Intl.NumberFormat('id-ID').format(st.target)}
                                        </p>
                                    </div>
                                    <div className={`p-2 rounded-lg ${st.is_complete ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                        {st.is_complete ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${st.is_complete ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ width: st.percentage + '%' }}
                                    />
                                </div>
                                <div className="mt-2 text-right">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{st.percentage}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            {/* Payment History + Invoice History side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Riwayat Pembayaran (Kwitansi) */}
                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                            <CreditCard className="w-5 h-5 mr-2 text-red-700 dark:text-red-400" />
                            Riwayat Kwitansi
                        </h3>
                        {!isStudent && (
                            <Button onClick={openCreate} className="bg-red-700 hover:bg-red-800 text-white shadow-md hover:shadow-lg transition-all text-xs px-3 py-1.5 h-auto">
                                + Input Pembayaran
                            </Button>
                        )}
                    </div>

                    <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 shadow-sm overflow-y-auto custom-scrollbar max-h-[350px]">
                        <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                <TableRow>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Tanggal</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Nomor</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Jumlah</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400 text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500 dark:text-gray-400">Memuat data...</TableCell></TableRow>
                                ) : payments.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500 dark:text-gray-400">Belum ada riwayat pembayaran</TableCell></TableRow>
                                ) : (
                                    payments.map((payment) => {
                                        const kwitansiNoRaw = payment.invoice_number ? payment.invoice_number : `INV-${payment.id.toString().padStart(5, '0')}`;
                                        const kwitansiNo = /^\d/.test(kwitansiNoRaw)
                                            ? (kwitansiNoRaw.split('-').shift() || kwitansiNoRaw)
                                            : (kwitansiNoRaw.split('-').pop() || kwitansiNoRaw);
                                        return (
                                        <TableRow key={payment.id} className="hover:bg-gray-50/50 dark:bg-gray-800/50 transition-colors">
                                            <TableCell className="font-medium text-gray-900 dark:text-white text-xs">
                                                {new Date(payment.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
                                                    {kwitansiNo}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-bold text-gray-900 dark:text-white text-xs">
                                                Rp {new Intl.NumberFormat('id-ID').format(payment.amount)}
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="outline" size="sm" onClick={() => handleDownloadKwitansi(payment)} className="h-7 px-2 border-gray-200 dark:border-gray-600/50" title="Unduh Kwitansi">
                                                    <Download className="w-3.5 h-3.5" />
                                                </Button>
                                                {!isStudent && (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => handleEditPayment(payment)} className="h-7 px-2 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50">
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => { setDeletingPayment(payment); setDeleteDialogOpen(true); }} className="h-7 px-2 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 hover:bg-red-50">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Riwayat Invoice */}
                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
                            Riwayat Invoice
                        </h3>
                        {!isStudent && (
                            <Button onClick={handleOpenInvoiceDialog} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/50 dark:text-amber-400 dark:hover:bg-amber-900/20 text-xs px-3 py-1.5 h-auto">
                                <FileText className="w-3.5 h-3.5 mr-1.5" /> Buat Invoice
                            </Button>
                        )}
                    </div>

                    <div className="border border-gray-100 dark:border-gray-700/50 rounded-xl bg-white dark:bg-[#151a23]/90 shadow-sm overflow-y-auto custom-scrollbar max-h-[350px]">
                        <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                <TableRow>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Tanggal</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">No Invoice</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Total</TableHead>
                                    <TableHead className="font-bold text-gray-600 dark:text-gray-400">Jatuh Tempo</TableHead>
                                    <TableHead className="text-right font-bold text-gray-600 dark:text-gray-400">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500 dark:text-gray-400">Memuat data...</TableCell></TableRow>
                                ) : invoices.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500 dark:text-gray-400">Belum ada invoice dibuat</TableCell></TableRow>
                                ) : (
                                    invoices.map((inv: any) => {
                                        const today = new Date(); today.setHours(0,0,0,0);
                                        const due   = new Date(inv.due_date);
                                        const diff  = Math.ceil((due.getTime() - today.getTime()) / 86400000);
                                        const isPast = diff < 0;
                                        return (
                                            <TableRow key={inv.id} className="hover:bg-gray-50/50 dark:bg-gray-800/50 transition-colors">
                                                <TableCell className="text-xs text-gray-600 dark:text-gray-400">
                                                    {new Date(inv.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{inv.invoice_number}</span>
                                                    <p className="text-xs text-gray-400 truncate max-w-[120px] mt-0.5" title={inv.payment_type}>{inv.payment_type}</p>
                                                </TableCell>
                                                <TableCell className="font-bold text-xs text-gray-900 dark:white">
                                                    Rp {new Intl.NumberFormat('id-ID').format(inv.total_amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${isPast ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                                        {new Date(inv.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Button onClick={() => handleDownloadHistoryInvoice(inv)} variant="ghost" size="icon" className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-amber-600 hover:bg-amber-50">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </Button>
                                                    {!isStudent && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                                onClick={() => handleEditInvoice(inv)}
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                onClick={() => { setDeletingInvoice(inv); setDeleteInvoiceDialogOpen(true); }}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

            </div>

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingPayment ? 'Edit Pembayaran' : 'Input Pembayaran'}</DialogTitle>
                        <DialogDescription>
                            Masukkan detail pembayaran siswa di sebelah kiri untuk melihat preview kwitansi di sebelah kanan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 py-4 overflow-hidden">
                        {/* Kiri: Form */}
                        <div className="flex flex-col h-full overflow-y-auto pr-2">
                            {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm border border-red-100 dark:border-red-900/50 mb-4">{error}</div>}
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label>Pilih Invoice (Penyelarasan Nomor Kwitansi)</Label>
                                    <Select 
                                        value={form.invoice_number} 
                                        onValueChange={(v) => {
                                            if (v === 'TIDAK_ADA_INVOICE') {
                                                setForm({ ...form, invoice_number: 'TIDAK_ADA_INVOICE' });
                                                return;
                                            }
                                            const inv = invoices.find(i => i.invoice_number === v);
                                            if (inv) {
                                                let stage = '1';
                                                if (inv.payment_type && inv.payment_type.toLowerCase().includes('tahap 1')) stage = '2';
                                                if (inv.payment_type && inv.payment_type.toLowerCase().includes('tahap 2')) stage = '3';

                                                setForm({ 
                                                    ...form, 
                                                    invoice_number: inv.invoice_number,
                                                    payment_type: inv.payment_type,
                                                    amount: inv.total_amount.toString(),
                                                    stage
                                                });
                                            } else {
                                                setForm({ ...form, invoice_number: v || '' });
                                            }
                                        }}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Pilih Invoice yang tersedia (Opsional)" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TIDAK_ADA_INVOICE">— Tidak Ada Invoice —</SelectItem>
                                            {invoices.length === 0 && <SelectItem value="none" disabled>Belum ada invoice</SelectItem>}
                                            {invoices.map((inv, i) => (
                                                <SelectItem key={i} value={inv.invoice_number}>{inv.invoice_number} - {inv.payment_type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Untuk Pembayaran</Label>
                                    <Select value={form.payment_type} onValueChange={(v) => {
                                        const safeV = v || '';
                                        const opt = paymentOptions.find(o => o.label === safeV);
                                        const stage = opt ? opt.stageId.toString() : '1';
                                        const amount = opt ? opt.amount.toString() : form.amount;
                                        
                                        setForm({ ...form, payment_type: safeV, stage, amount });
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="Pilih jenis biaya" /></SelectTrigger>
                                        <SelectContent>
                                            {paymentOptions.map((opt, i) => (
                                                <SelectItem key={i} value={opt.label}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Jumlah Bayar (Rp)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        placeholder="Contoh: 1000000"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Tanggal Pembayaran</Label>
                                    <Input
                                        type="date"
                                        value={form.payment_date}
                                        onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2 flex flex-row items-center space-x-2 mt-2">
                                    <input 
                                        type="checkbox" 
                                        id="is_lunas" 
                                        className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-600"
                                        checked={form.is_lunas} 
                                        onChange={(e) => setForm({ ...form, is_lunas: e.target.checked })}
                                    />
                                    <Label htmlFor="is_lunas" className="font-medium cursor-pointer">Pembayaran Lunas?</Label>
                                </div>
                            </div>
                        </div>

                        {/* Kanan: Preview Kwitansi */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 overflow-hidden relative h-full min-h-[200px]">
                            {kwitansiPreviewLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Memperbarui Preview...</span>
                                </div>
                            )}
                            {kwitansiPreviewUrl ? (
                                <iframe src={`${kwitansiPreviewUrl}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-full border-none" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                                    Isi form untuk melihat preview
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-red-700 hover:bg-red-800 text-white">
                            {saving ? 'Menyimpan...' : (editingPayment ? 'Simpan Perubahan' : 'Simpan Pembayaran')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Invoice Generation Dialog */}
            <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
                <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-600" />
                            {editingInvoice ? 'Edit Invoice' : 'Buat Invoice Baru'}
                        </DialogTitle>
                        <DialogDescription>
                            Isi detail tagihan di sebelah kiri untuk melihat preview PDF secara real-time di sebelah kanan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 py-4 overflow-hidden">
                        {/* Kiri: Form */}
                        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                            <div className="grid gap-2">
                                <Label>Nomor Invoice</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={invoiceForm.invoice_number}
                                        onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                                        placeholder="INV-2026-VIII-102"
                                        className="flex-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Tanggal Pembuatan</Label>
                                    <Input
                                        type="date"
                                        value={invoiceForm.order_date}
                                        onChange={(e) => setInvoiceForm({ ...invoiceForm, order_date: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Tanggal Jatuh Tempo</Label>
                                    <Input
                                        type="date"
                                        value={invoiceForm.due_date}
                                        onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Keterangan Pembayaran</Label>
                                <Select value={invoiceForm.payment_type} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, payment_type: v || '' })}>
                                    <SelectTrigger><SelectValue placeholder="Pilih jenis biaya" /></SelectTrigger>
                                    <SelectContent>
                                        {paymentOptions.map((opt, i) => (
                                            <SelectItem key={i} value={opt.label}>
                                                {opt.label} - Rp {new Intl.NumberFormat('id-ID').format(opt.amount)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Pajak (Opsional)</Label>
                                <Input
                                    type="number"
                                    value={invoiceForm.tax}
                                    onChange={(e) => setInvoiceForm({ ...invoiceForm, tax: e.target.value })}
                                    placeholder="Contoh: 110000"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">Kosongkan jika tidak ada pajak. Akan ditulis -- pada PDF.</p>
                            </div>
                        </div>

                        {/* Kanan: Preview */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 overflow-hidden relative h-full min-h-[400px]">
                            {previewLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Memperbarui Preview...</span>
                                </div>
                            )}
                            {pdfPreviewUrl ? (
                                <iframe src={`${pdfPreviewUrl}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-full border-none" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                                    {invoiceForm.invoice_number && invoiceForm.payment_type ? 'Template tidak ditemukan' : 'Isi form untuk melihat preview'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveInvoice} disabled={!pdfPreviewUrl || !invoiceForm.invoice_number || !invoiceForm.payment_type} className="bg-red-700 hover:bg-red-800 text-white flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2" /> {editingInvoice ? 'Simpan Perubahan Invoice' : 'Kirim & Simpan Invoice'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Pembayaran</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus data pembayaran ini? Transaksi ini akan dikurangi dari total progres siswa. Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Ya, Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Invoice Confirmation */}
            <AlertDialog open={deleteInvoiceDialogOpen} onOpenChange={setDeleteInvoiceDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Invoice</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus invoice ini? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingInvoiceLoading}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteInvoice} disabled={deletingInvoiceLoading} className="bg-red-600 hover:bg-red-700 text-white">
                            {deletingInvoiceLoading ? 'Menghapus...' : 'Ya, Hapus'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
