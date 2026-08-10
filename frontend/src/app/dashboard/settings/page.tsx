'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

interface RoleWithPermissions {
    id: number;
    name: string;
    permissions: { id: number; name: string }[];
}

interface Permission {
    id: number;
    name: string;
}

export default function SettingsPage() {
    const { t } = useLanguage();
    const [tab, setTab] = useState<'general' | 'roles'>('general');

    // General Settings
    const [settings, setSettings] = useState<Record<string, string>>({
        app_name: 'LPK Mirai Crown Indonesia',
        app_email: '',
        app_phone: '',
        app_address: '',
    });
    const [savingSettings, setSavingSettings] = useState(false);

    // Roles & Permissions
    const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
    const [savingRole, setSavingRole] = useState(false);

    // Fetch Settings
    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get('/api/settings');
            setSettings(prev => ({ ...prev, ...res.data }));
        } catch (err) {
            console.error('Failed to load settings');
        }
    }, []);

    // Fetch Roles & Permissions
    const fetchRolesPermissions = useCallback(async () => {
        try {
            const res = await axios.get('/api/roles-permissions');
            setRoles(res.data.roles || []);
            setAllPermissions(res.data.permissions || []);
        } catch (err) {
            console.error('Failed to load roles');
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchRolesPermissions();
    }, [fetchSettings, fetchRolesPermissions]);

    // Save General Settings
    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await axios.put('/api/settings', { settings });
            toast.success('Pengaturan berhasil disimpan!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan');
        } finally {
            setSavingSettings(false);
        }
    };

    // Select a Role to edit permissions
    const handleSelectRole = (role: RoleWithPermissions) => {
        setSelectedRole(role);
        setSelectedPermissionIds(role.permissions.map(p => p.id));
    };

    // Toggle permission checkbox
    const togglePermission = (permId: number) => {
        setSelectedPermissionIds(prev =>
            prev.includes(permId)
                ? prev.filter(id => id !== permId)
                : [...prev, permId]
        );
    };

    // Save Role Permissions
    const handleSaveRolePermissions = async () => {
        if (!selectedRole) return;
        setSavingRole(true);
        try {
            const permNames = allPermissions
                .filter(p => selectedPermissionIds.includes(p.id))
                .map(p => p.name);
            await axios.put(`/api/roles-permissions/${selectedRole.id}`, { permissions: permNames });
            toast.success(`Permissions untuk role "${selectedRole.name}" berhasil diperbarui!`);
            fetchRolesPermissions();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan permissions');
        } finally {
            setSavingRole(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.settingsTitle}</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <Button variant={tab === 'general' ? 'default' : 'outline'} onClick={() => setTab('general')}>
                    {t.generalTab}
                </Button>
                <Button variant={tab === 'roles' ? 'default' : 'outline'} onClick={() => setTab('roles')}>
                    {t.rolesTab}
                </Button>
            </div>

            {/* General Settings Tab */}
            {tab === 'general' && (
                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border rounded-xl p-6 max-w-2xl space-y-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b pb-3">{t.generalSettings}</h2>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label>{t.institutionName}</Label>
                            <Input
                                value={settings.app_name}
                                onChange={e => setSettings({ ...settings, app_name: e.target.value })}
                                placeholder="LPK Mirai Crown Indonesia"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.institutionEmail}</Label>
                            <Input
                                type="email"
                                value={settings.app_email}
                                onChange={e => setSettings({ ...settings, app_email: e.target.value })}
                                placeholder="info@mci.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.phoneNumber}</Label>
                            <Input
                                value={settings.app_phone}
                                onChange={e => setSettings({ ...settings, app_phone: e.target.value })}
                                placeholder="+62 xxx xxx xxxx"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.address}</Label>
                            <Input
                                value={settings.app_address}
                                onChange={e => setSettings({ ...settings, app_address: e.target.value })}
                                placeholder="Jl. Contoh No. 123, Kota"
                            />
                        </div>
                    </div>
                    <Button onClick={handleSaveSettings} disabled={savingSettings} className="mt-4">
                        {savingSettings ? t.saving : t.saveSettings}
                    </Button>
                </div>
            )}

            {/* Roles & Permissions Tab */}
            {tab === 'roles' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Role List */}
                    <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border rounded-xl p-4">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t.rolesList}</h2>
                        <div className="space-y-2">
                            {roles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => handleSelectRole(role)}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                                        selectedRole?.id === role.id
                                            ? 'bg-red-50 border-red-300 text-red-800'
                                            : 'hover:bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl border-gray-200 dark:border-gray-600/50 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <div className="font-medium">{role.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{role.permissions.length} permissions</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Permission Editor */}
                    <div className="lg:col-span-2 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border rounded-xl p-6">
                        {selectedRole ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                        {t.permissionsFor} <span className="text-red-700 dark:text-red-400">{selectedRole.name}</span>
                                    </h2>
                                    <Button onClick={handleSaveRolePermissions} disabled={savingRole} size="sm">
                                        {savingRole ? t.saving : t.saveChanges}
                                    </Button>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.checkPermissions}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                                    {allPermissions.map(perm => (
                                        <label
                                            key={perm.id}
                                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissionIds.includes(perm.id)}
                                                onChange={() => togglePermission(perm.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-red-700 dark:text-red-400 focus:ring-red-600"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{perm.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <p className="text-sm">{t.selectRoleHint}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
