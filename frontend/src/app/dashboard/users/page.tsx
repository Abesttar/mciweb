'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface Role {
    id: number;
    name: string;
}

interface UserData {
    id: number;
    name: string;
    email: string;
    roles?: Role[];
    created_at: string;
    profile_photo_url?: string;
}

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const { t } = useLanguage();
    const [users, setUsers] = useState<UserData[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/users', { params: { search: search || undefined } });
            setUsers(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search]);

    const fetchRoles = async () => {
        try {
            const res = await axios.get('/api/roles');
            setRoles(res.data);
        } catch (err) {
            console.error("Failed to load roles", err);
        }
    };

    useEffect(() => { 
        fetchUsers(); 
        fetchRoles();
    }, [fetchUsers]);

    const openCreate = () => {
        setEditingUser(null);
        setForm({ name: '', email: '', password: '', role: '' });
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (userData: UserData) => {
        setEditingUser(userData);
        setForm({
            name: userData.name,
            email: userData.email,
            password: '', // Password is not populated on edit
            role: userData.roles && userData.roles.length > 0 ? userData.roles[0].name : '',
        });
        setError('');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        setSaving(true);
        setError('');
        try {
            const payload: any = {
                name: form.name,
                email: form.email,
                role: form.role,
            };
            
            // Only include password if creating new or if explicitly set during edit
            if (!editingUser) {
                payload.password = form.password;
            } else if (form.password) {
                payload.password = form.password;
            }

            if (editingUser) {
                await axios.put(`/api/users/${editingUser.id}`, payload);
            } else {
                await axios.post('/api/users', payload);
            }
            setDialogOpen(false);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan data pengguna');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingUser) return;
        try {
            await axios.delete(`/api/users/${deletingUser.id}`);
            setDeleteDialogOpen(false);
            setDeletingUser(null);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus data');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.userManagement}</h1>
                <Button onClick={openCreate}>+ {t.addUser}</Button>
            </div>

            <div className="mb-4">
                <Input
                    placeholder={t.searchUser}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.name}</TableHead>
                            <TableHead>{t.email}</TableHead>
                            <TableHead>{t.role}</TableHead>
                            <TableHead>{t.registeredSince}</TableHead>
                            <TableHead className="text-right">{t.action}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noUserFound}</TableCell>
                            </TableRow>
                        ) : (
                            users.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            {u.profile_photo_url ? (
                                                <img src={u.profile_photo_url} alt={u.name} className="w-8 h-8 rounded-full object-cover border" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {u.name.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <span>
                                                {u.name}
                                                {currentUser?.id === u.id && <Badge variant="outline" className="ml-2 text-xs">{t.youBadge}</Badge>}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            {u.roles?.map(r => (
                                                <Badge key={r.id} variant="secondary">{r.name}</Badge>
                                            ))}
                                            {(!u.roles || u.roles.length === 0) && <span className="text-gray-400 italic">No Role</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>{new Date(u.created_at).toLocaleDateString('id-ID')}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => openEdit(u)}>{t.edit}</Button>
                                        <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            onClick={() => { setDeletingUser(u); setDeleteDialogOpen(true); }}
                                            disabled={currentUser?.id === u.id}
                                        >
                                            {t.delete}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? t.editUser : t.addNewUser}</DialogTitle>
                        <DialogDescription>
                            {editingUser ? t.editUser : t.addNewUser}
                        </DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t.fullName} *</Label>
                            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cth: Budi Santoso" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">{t.email} *</Label>
                            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Cth: budi@example.com" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">{t.password} {editingUser ? '(Kosongkan jika tidak ingin diubah)' : '*'}</Label>
                            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimal 8 karakter" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role">{t.role} *</Label>
                            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t.selectRole} />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(r => (
                                        <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                                    ))}
                                    {roles.length === 0 && (
                                        <SelectItem value="Super Admin">Super Admin (Fallback)</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteUser}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.confirmDeleteUser} &quot;{deletingUser?.name}&quot;? {t.cannotUndo}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
