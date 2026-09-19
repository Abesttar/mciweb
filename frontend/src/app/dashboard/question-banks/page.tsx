'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash, Plus, BookOpen, ChevronDown, ChevronUp, X, GripVertical } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface QuestionForm {
    _key: number; // local unique key for React
    type: 'multiple_choice' | 'short_answer';
    question_text: string;
    options: string[];
    correct_answer: string;
    points: number;
}

interface QuestionBank {
    id: number;
    name: string;
    description: string | null;
    questions_count: number;
    questions: any[];
    creator?: { name: string };
}

const defaultQuestion = (key: number): QuestionForm => ({
    _key: key,
    type: 'multiple_choice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 10,
});

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function QuestionBanksPage() {
    const [banks, setBanks] = useState<QuestionBank[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<QuestionBank | null>(null);

    // Package form
    const [pkgName, setPkgName] = useState('');
    const [pkgDesc, setPkgDesc] = useState('');

    // Questions inside form
    const [qForms, setQForms] = useState<QuestionForm[]>([defaultQuestion(Date.now())]);
    const [keyCounter, setKeyCounter] = useState(1);
    const [collapsedQ, setCollapsedQ] = useState<number[]>([]); // collapsed question _keys

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState<QuestionBank | null>(null);

    // Expand/collapse detail
    const [expandedBanks, setExpandedBanks] = useState<number[]>([]);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchBanks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/question-banks');
            setBanks(res.data);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchBanks(); }, [fetchBanks]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditing(null);
        setPkgName('');
        setPkgDesc('');
        const firstKey = Date.now();
        setQForms([defaultQuestion(firstKey)]);
        setKeyCounter(firstKey + 1);
        setCollapsedQ([]);
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (bank: QuestionBank) => {
        setEditing(bank);
        setPkgName(bank.name);
        setPkgDesc(bank.description || '');

        let kc = Date.now();
        const forms: QuestionForm[] = bank.questions.map(q => ({
            _key: kc++,
            type: q.type,
            question_text: q.question_text,
            options: q.options || ['', '', '', ''],
            correct_answer: q.correct_answer,
            points: q.points,
        }));
        setQForms(forms.length > 0 ? forms : [defaultQuestion(kc)]);
        setKeyCounter(kc + 1);
        setCollapsedQ([]);
        setError('');
        setDialogOpen(true);
    };

    const addQuestion = () => {
        const key = keyCounter;
        setKeyCounter(prev => prev + 1);
        setQForms(prev => [...prev, defaultQuestion(key)]);
        // Auto scroll to bottom after small delay
        setTimeout(() => {
            document.getElementById('questions-container')?.scrollTo({ top: 999999, behavior: 'smooth' });
        }, 50);
    };

    const removeQuestion = (key: number) => {
        if (qForms.length === 1) return; // at least 1 question
        setQForms(prev => prev.filter(q => q._key !== key));
        setCollapsedQ(prev => prev.filter(k => k !== key));
    };

    const updateQ = (key: number, changes: Partial<QuestionForm>) => {
        setQForms(prev => prev.map(q => q._key === key ? { ...q, ...changes } : q));
    };

    const updateOption = (key: number, idx: number, val: string) => {
        setQForms(prev => prev.map(q => {
            if (q._key !== key) return q;
            const opts = [...q.options];
            // If this option was the correct_answer, update correct_answer too
            const wasCorrect = q.correct_answer === opts[idx];
            opts[idx] = val;
            return { ...q, options: opts, correct_answer: wasCorrect ? val : q.correct_answer };
        }));
    };

    const toggleCollapse = (key: number) => {
        setCollapsedQ(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const validate = (): string | null => {
        if (!pkgName.trim()) return 'Nama paket soal wajib diisi.';
        for (let i = 0; i < qForms.length; i++) {
            const q = qForms[i];
            if (!q.question_text.trim()) return `Soal nomor ${i + 1}: pertanyaan wajib diisi.`;
            if (q.type === 'multiple_choice') {
                const filled = q.options.filter(o => o.trim() !== '');
                if (filled.length < 2) return `Soal ${i + 1}: minimal 2 opsi wajib diisi.`;
                if (!q.correct_answer || !q.options.includes(q.correct_answer))
                    return `Soal ${i + 1}: pilih kunci jawaban yang benar (klik radio button).`;
            } else {
                if (!q.correct_answer.trim()) return `Soal ${i + 1}: kunci jawaban isian singkat wajib diisi.`;
            }
        }
        return null;
    };

    const handleSubmit = async () => {
        const err = validate();
        if (err) { setError(err); return; }

        setSaving(true);
        setError('');
        try {
            const payload = {
                name: pkgName.trim(),
                description: pkgDesc.trim() || null,
                questions: qForms.map((q, i) => ({
                    type: q.type,
                    question_text: q.question_text.trim(),
                    options: q.type === 'multiple_choice' ? q.options.filter(o => o.trim() !== '') : null,
                    correct_answer: q.correct_answer.trim(),
                    points: q.points,
                })),
            };

            if (editing) {
                await axios.put(`/api/question-banks/${editing.id}`, payload);
            } else {
                await axios.post('/api/question-banks', payload);
            }
            setDialogOpen(false);
            fetchBanks();
        } catch (e: any) {
            setError(e.response?.data?.message || 'Terjadi kesalahan.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await axios.delete(`/api/question-banks/${deleteTarget.id}`);
            setDeleteTarget(null);
            fetchBanks();
        } catch { }
    };

    const filtered = banks.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Soal</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        Kelola paket-paket soal CBT. Setiap paket berisi banyak soal yang dapat digunakan dalam ujian.
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                <Input
                    placeholder="Cari paket soal..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="sm:max-w-xs border-0 focus-visible:ring-0 bg-gray-50 dark:bg-[#1e2532]/90 dark:text-white"
                />
                <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700 shrink-0">
                    <Plus className="w-4 h-4 mr-2" /> Buat Paket Soal
                </Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#151a23]/90 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                    <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Belum ada paket soal</h3>
                    <p className="text-sm text-gray-500 mt-1">Klik "Buat Paket Soal" untuk mulai menambahkan.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                    {filtered.map(bank => (
                        <Card key={bank.id} className="relative overflow-hidden bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex flex-col">
                            <CardContent className="p-6 flex flex-col h-full">
                                {/* Decorative */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full" />

                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <Badge variant="secondary" className="rounded-full text-xs font-semibold">
                                        {bank.questions_count ?? bank.questions?.length ?? 0} Soal
                                    </Badge>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(bank)} className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(bank)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight mb-1 relative z-10">{bank.name}</h3>
                                {bank.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 relative z-10">{bank.description}</p>
                                )}

                                {/* Expand questions */}
                                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 relative z-10">
                                    <button
                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
                                        onClick={() => setExpandedBanks(prev => prev.includes(bank.id) ? prev.filter(id => id !== bank.id) : [...prev, bank.id])}
                                    >
                                        {expandedBanks.includes(bank.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        {expandedBanks.includes(bank.id) ? 'Sembunyikan soal' : 'Lihat daftar soal'}
                                    </button>
                                    {expandedBanks.includes(bank.id) && (
                                        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {bank.questions?.map((q: any, i: number) => (
                                                <div key={q.id} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                                    <span className="font-bold text-gray-400 min-w-[20px]">{i + 1}.</span>
                                                    <div>
                                                        <p className="line-clamp-2 text-gray-700 dark:text-gray-300">{q.question_text}</p>
                                                        <span className="text-xs text-gray-400">{q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Isian Singkat'} • {q.points} poin</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── Create/Edit Dialog ─────────────────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl w-full max-h-[95vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                        <DialogTitle className="text-xl">
                            {editing ? `Edit Paket: ${editing.name}` : 'Buat Paket Soal Baru'}
                        </DialogTitle>
                        <DialogDescription>
                            Isi nama paket dan tambahkan soal-soal di dalamnya.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6" id="questions-container">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Package info */}
                        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Informasi Paket</h3>
                            <div className="grid gap-3">
                                <div className="grid gap-1.5">
                                    <Label>Nama Paket Soal <span className="text-red-500">*</span></Label>
                                    <Input
                                        value={pkgName}
                                        onChange={e => setPkgName(e.target.value)}
                                        placeholder='contoh: "Paket Soal Hiragana & Katakana"'
                                        className="bg-white dark:bg-gray-900"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label>Deskripsi <span className="text-gray-400 text-xs">(opsional)</span></Label>
                                    <Textarea
                                        value={pkgDesc}
                                        onChange={e => setPkgDesc(e.target.value)}
                                        placeholder="Keterangan singkat tentang paket soal ini"
                                        rows={2}
                                        className="bg-white dark:bg-gray-900 resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Questions list */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">
                                    Daftar Soal <span className="ml-2 normal-case font-normal text-gray-400">({qForms.length} soal)</span>
                                </h3>
                                <Button type="button" size="sm" variant="outline" onClick={addQuestion} className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1">
                                    <Plus className="w-4 h-4" /> Tambah Soal
                                </Button>
                            </div>

                            {qForms.map((q, idx) => (
                                <QuestionCard
                                    key={q._key}
                                    q={q}
                                    idx={idx}
                                    collapsed={collapsedQ.includes(q._key)}
                                    onToggleCollapse={() => toggleCollapse(q._key)}
                                    onRemove={() => removeQuestion(q._key)}
                                    onUpdate={changes => updateQ(q._key, changes)}
                                    onUpdateOption={(optIdx, val) => updateOption(q._key, optIdx, val)}
                                    canRemove={qForms.length > 1}
                                />
                            ))}

                            <Button type="button" variant="outline" className="w-full border-dashed border-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 py-6" onClick={addQuestion}>
                                <Plus className="w-5 h-5 mr-2" /> Tambah Soal Baru
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 flex justify-between items-center">
                        <span className="text-sm text-gray-400">{qForms.length} soal · {qForms.reduce((s, q) => s + q.points, 0)} total poin</span>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                            <Button onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700 min-w-[120px]">
                                {saving ? 'Menyimpan...' : (editing ? 'Simpan Perubahan' : 'Simpan Paket')}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Paket Soal?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Paket <strong>{deleteTarget?.name}</strong> beserta semua soal di dalamnya akan dihapus permanen.
                            Ujian yang menggunakan paket ini juga akan ikut terhapus.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Question Card Sub-Component ─────────────────────────────────────────────
function QuestionCard({ q, idx, collapsed, onToggleCollapse, onRemove, onUpdate, onUpdateOption, canRemove }: {
    q: QuestionForm;
    idx: number;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onRemove: () => void;
    onUpdate: (changes: Partial<QuestionForm>) => void;
    onUpdateOption: (optIdx: number, val: string) => void;
    canRemove: boolean;
}) {
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50">
            {/* Card Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />
                <button onClick={onToggleCollapse} className="flex-1 flex items-center gap-2 text-left">
                    <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 line-clamp-1 text-sm flex-1">
                        {q.question_text.trim() || <span className="italic text-gray-400">Soal belum diisi...</span>}
                    </span>
                    <Badge variant={q.type === 'multiple_choice' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {q.type === 'multiple_choice' ? 'PG' : 'Isian'}
                    </Badge>
                    <span className="text-xs text-gray-400 shrink-0">{q.points} poin</span>
                    {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
                {canRemove && (
                    <button onClick={onRemove} className="text-red-400 hover:text-red-600 transition-colors shrink-0 p-1">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Card Body */}
            {!collapsed && (
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Tipe Soal</Label>
                            <Select value={q.type} onValueChange={v => onUpdate({ type: v as any, correct_answer: '' })}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                                    <SelectItem value="short_answer">Isian Singkat</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Poin</Label>
                            <Input
                                type="number" min="1" value={q.points}
                                onChange={e => onUpdate({ points: parseInt(e.target.value) || 10 })}
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs">Pertanyaan <span className="text-red-500">*</span></Label>
                        <Textarea
                            value={q.question_text}
                            onChange={e => onUpdate({ question_text: e.target.value })}
                            placeholder="Tulis pertanyaan di sini..."
                            rows={3}
                            className="resize-none text-sm"
                        />
                    </div>

                    {q.type === 'multiple_choice' ? (
                        <div className="space-y-2">
                            <Label className="text-xs">Opsi Jawaban <span className="text-gray-400">(pilih radio = kunci jawaban)</span></Label>
                            {q.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="w-5 font-bold text-gray-500 text-sm shrink-0">{optionLabels[i]}.</span>
                                    <Input
                                        value={opt}
                                        onChange={e => onUpdateOption(i, e.target.value)}
                                        placeholder={`Opsi ${optionLabels[i]}`}
                                        className="h-9 text-sm flex-1"
                                    />
                                    <input
                                        type="radio"
                                        name={`correct_${q._key}`}
                                        checked={q.correct_answer === opt && opt !== ''}
                                        onChange={() => { if (opt.trim()) onUpdate({ correct_answer: opt }); }}
                                        className="w-5 h-5 accent-red-600 cursor-pointer shrink-0"
                                        title="Tandai sebagai kunci jawaban"
                                    />
                                </div>
                            ))}
                            {q.correct_answer && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    ✓ Kunci: <strong>{q.correct_answer}</strong>
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Kunci Jawaban <span className="text-red-500">*</span></Label>
                            <Input
                                value={q.correct_answer}
                                onChange={e => onUpdate({ correct_answer: e.target.value })}
                                placeholder="Tulis jawaban (huruf besar/kecil diabaikan otomatis)"
                                className="h-9 text-sm"
                            />
                            <p className="text-xs text-gray-400">Sistem akan mencocokkan jawaban siswa secara case-insensitive & trim spasi.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
