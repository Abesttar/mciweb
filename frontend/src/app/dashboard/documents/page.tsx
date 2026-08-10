'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';

const MAX_DOCUMENT_SIZE_MB = 500;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

interface DocumentType {
    id: number;
    name: string;
    description: string;
    is_required: boolean;
}

interface Student {
    id: number;
    name: string;
}

interface StudentDocument {
    id: number;
    student_id: number;
    document_type_id: number;
    file_path: string;
    status: string;
    student?: { user: { name: string } };
    documentType?: DocumentType;
    verifiedBy?: { name: string };
}

export default function DocumentsPage() {
    const { t } = useLanguage();
    const [tab, setTab] = useState<'students' | 'types'>('students');

    // State for Document Types
    const [types, setTypes] = useState<DocumentType[]>([]);
    const [typeDialogOpen, setTypeDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<DocumentType | null>(null);
    const [typeForm, setTypeForm] = useState({ name: '', description: '', is_required: true });

    // State for Student Documents
    const [documents, setDocuments] = useState<StudentDocument[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [docDialogOpen, setDocDialogOpen] = useState(false);
    const [docForm, setDocForm] = useState({ student_id: '', document_type_id: '' });
    const [file, setFile] = useState<File | null>(null);
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingType, setDeletingType] = useState<DocumentType | null>(null);
    const [deletingDoc, setDeletingDoc] = useState<StudentDocument | null>(null);

    // Filters
    const [filterStudentId, setFilterStudentId] = useState('');

    const fetchTypes = useCallback(async () => {
        try {
            const res = await axios.get('/api/document-types');
            setTypes(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterStudentId && filterStudentId !== 'all') params.student_id = filterStudentId;
            const res = await axios.get('/api/student-documents', { params });
            setDocuments(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filterStudentId]);

    const fetchStudents = useCallback(async () => {
        try {
            const res = await axios.get('/api/students', { params: { per_page: 500 } });
            setStudents(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchTypes();
        fetchStudents();
    }, [fetchTypes, fetchStudents]);

    useEffect(() => {
        if (tab === 'students') {
            fetchDocuments();
        }
    }, [tab, fetchDocuments]);

    // TYPE Handlers
    const openTypeCreate = () => {
        setEditingType(null);
        setTypeForm({ name: '', description: '', is_required: true });
        setError('');
        setTypeDialogOpen(true);
    };

    const openTypeEdit = (t: DocumentType) => {
        setEditingType(t);
        setTypeForm({ name: t.name, description: t.description || '', is_required: t.is_required });
        setError('');
        setTypeDialogOpen(true);
    };

    const handleTypeSubmit = async () => {
        setSaving(true);
        setError('');
        try {
            if (editingType) {
                await axios.put(`/api/document-types/${editingType.id}`, typeForm);
            } else {
                await axios.post('/api/document-types', typeForm);
            }
            setTypeDialogOpen(false);
            fetchTypes();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteType = async () => {
        if (!deletingType) return;
        try {
            await axios.delete(`/api/document-types/${deletingType.id}`);
            setDeleteDialogOpen(false);
            fetchTypes();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus');
        }
    };

    // DOC Handlers
    const openDocCreate = () => {
        setDocForm({ student_id: filterStudentId !== 'all' ? filterStudentId : '', document_type_id: '' });
        setFile(null);
        setError('');
        setDocDialogOpen(true);
    };

    const handleDocSubmit = async () => {
        if (!file) {
            setError('Pilih file terlebih dahulu');
            return;
        }
        if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
            setError(`Ukuran file terlalu besar. Maksimal tiap dokumen ${MAX_DOCUMENT_SIZE_MB} MB.`);
            return;
        }
        setSaving(true);
        setError('');
        
        const formData = new FormData();
        formData.append('student_id', docForm.student_id);
        formData.append('document_type_id', docForm.document_type_id);
        formData.append('file', file);

        try {
            await axios.post('/api/student-documents', formData);
            setDocDialogOpen(false);
            fetchDocuments();
        } catch (err: any) {
            if (err.response?.status === 413) {
                setError('Ukuran total dokumen terlalu besar. Maksimal total upload adalah 500 MB.');
                return;
            }
            setError(err.response?.data?.message || 'Gagal mengunggah dokumen');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDoc = async () => {
        if (!deletingDoc) return;
        try {
            await axios.delete(`/api/student-documents/${deletingDoc.id}`);
            setDeleteDialogOpen(false);
            fetchDocuments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus');
        }
    };

    const handleVerifyDoc = async (id: number, status: 'verified' | 'rejected') => {
        try {
            await axios.put(`/api/student-documents/${id}/verify`, { status });
            fetchDocuments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal memverifikasi');
        }
    };

    const getFileUrl = (path: string) => {
        return process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/storage/${path}` : `http://localhost:8000/storage/${path}`;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.documentsTitle}</h1>
                {tab === 'types' && (
                    <Button onClick={openTypeCreate}>{t.addDocType}</Button>
                )}
                {tab === 'students' && (
                    <Button onClick={openDocCreate}>{t.addDocument}</Button>
                )}
            </div>

            <div className="flex gap-2 mb-6">
                <Button variant={tab === 'students' ? 'default' : 'outline'} onClick={() => setTab('students')}>
                    {t.studentData}
                </Button>
                <Button variant={tab === 'types' ? 'default' : 'outline'} onClick={() => setTab('types')}>
                    {t.documentTypes}
                </Button>
            </div>

            {tab === 'types' && (
                <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t.documentTypes}</TableHead>
                                <TableHead>{t.description}</TableHead>
                                <TableHead>{t.required}</TableHead>
                                <TableHead className="text-right">{t.action}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {types.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noDocTypeData}</TableCell></TableRow>
                            ) : (
                                types.map((tItem) => (
                                    <TableRow key={tItem.id}>
                                        <TableCell className="font-medium">{tItem.name}</TableCell>
                                        <TableCell>{tItem.description || '-'}</TableCell>
                                        <TableCell>{tItem.is_required ? <span className="text-red-600 font-semibold">{t.required}</span> : t.optional}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => openTypeEdit(tItem)}>{t.edit}</Button>
                                            <Button variant="destructive" size="sm" onClick={() => { setDeletingType(tItem); setDeletingDoc(null); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {tab === 'students' && (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                        <div className="grid gap-2">
                            <Label>{t.filterStudent}</Label>
                            <Select value={filterStudentId} onValueChange={(v) => setFilterStudentId(v ?? '')}>
                                <SelectTrigger><SelectValue placeholder={t.allStudents} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t.allStudents}</SelectItem>
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t.studentName}</TableHead>
                                    <TableHead>{t.documentTypes}</TableHead>
                                    <TableHead>{t.file}</TableHead>
                                    <TableHead>{t.status}</TableHead>
                                    <TableHead>Verified By</TableHead>
                                    <TableHead className="text-right">{t.action}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell></TableRow>
                                ) : documents.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noDocData}</TableCell></TableRow>
                                ) : (
                                    documents.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell className="font-medium">{d.student?.user?.name}</TableCell>
                                            <TableCell>{d.documentType?.name}</TableCell>
                                            <TableCell>
                                                <a href={getFileUrl(d.file_path)} target="_blank" rel="noreferrer" className="text-red-700 dark:text-red-400 hover:underline">
                                                    {t.file}
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                {d.status === 'pending' && <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded">{t.pending}</span>}
                                                {d.status === 'verified' && <span className="text-green-600 bg-green-50 px-2 py-1 rounded">{t.verified}</span>}
                                                {d.status === 'rejected' && <span className="text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded">{t.rejected2}</span>}
                                            </TableCell>
                                            <TableCell>{d.verifiedBy?.name || '-'}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {d.status === 'pending' && (
                                                    <>
                                                        <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleVerifyDoc(d.id, 'verified')}>Approve</Button>
                                                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleVerifyDoc(d.id, 'rejected')}>Reject</Button>
                                                    </>
                                                )}
                                                <Button variant="destructive" size="sm" onClick={() => { setDeletingDoc(d); setDeletingType(null); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Dialog Types */}
            <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingType ? t.editDocType : t.addNewDocType}</DialogTitle>
                        <DialogDescription>{t.documentsDesc}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t.docTypeName} *</Label>
                            <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.description}</Label>
                            <Input value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="is_required" 
                                checked={typeForm.is_required} 
                                onChange={(e) => setTypeForm({ ...typeForm, is_required: e.target.checked })} 
                            />
                            <Label htmlFor="is_required">{t.isRequired}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleTypeSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Upload Doc */}
            <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.uploadDoc}</DialogTitle>
                        <DialogDescription>{t.documentsDesc}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t.studentName} *</Label>
                            <Select value={docForm.student_id ? String(docForm.student_id) : ''} onValueChange={(v) => setDocForm({ ...docForm, student_id: v ?? '' })}>
                                <SelectTrigger><SelectValue placeholder={t.selectStudent} /></SelectTrigger>
                                <SelectContent>
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.documentTypes} *</Label>
                            <Select value={docForm.document_type_id ? String(docForm.document_type_id) : ''} onValueChange={(v) => setDocForm({ ...docForm, document_type_id: v ?? '' })}>
                                <SelectTrigger><SelectValue placeholder={t.selectDocType} /></SelectTrigger>
                                <SelectContent>
                                    {types.map(t => (
                                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.file} (PDF, JPG, PNG) *</Label>
                            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    const selectedFile = e.target.files[0];

                                    if (selectedFile.size > MAX_DOCUMENT_SIZE_BYTES) {
                                        setError(`Ukuran file terlalu besar. Maksimal tiap dokumen ${MAX_DOCUMENT_SIZE_MB} MB.`);
                                        setFile(null);
                                        e.target.value = '';
                                        return;
                                    }

                                    setError('');
                                    setFile(selectedFile);
                                }
                            }} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDocDialogOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleDocSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteDocument}</AlertDialogTitle>
                        <AlertDialogDescription>{t.cannotUndo}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={deletingType ? handleDeleteType : handleDeleteDoc} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
