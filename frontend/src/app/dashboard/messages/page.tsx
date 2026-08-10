'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MessagesPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [messages, setMessages] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [messageInput, setMessageInput] = useState('');

    useEffect(() => {
        // Fetch users to chat with
        axios.get('/api/users').then(res => setUsers(res.data.data || res.data));
    }, []);

    useEffect(() => {
        if (selectedUser) {
            axios.get(`/api/messages?with_user=${selectedUser.id}`).then(res => setMessages(res.data));
        }
    }, [selectedUser]);

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedUser) return;
        try {
            const res = await axios.post('/api/messages', {
                receiver_id: selectedUser.id,
                message: messageInput
            });
            setMessages([...messages, res.data]);
            setMessageInput('');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex h-[80vh] bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-xl shadow overflow-hidden border border-gray-100 dark:border-gray-700/50">
            {/* User List */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-600/50 overflow-y-auto">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 font-bold text-lg bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl">{t.messagesTitle}</div>
                {users.filter(u => u.id !== user?.id).map(u => (
                    <div 
                        key={u.id} 
                        onClick={() => setSelectedUser(u)}
                        className={`p-4 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-red-50 transition-colors ${selectedUser?.id === u.id ? 'bg-red-50 border-l-4 border-red-700' : ''}`}
                    >
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.roles?.[0]?.name}</p>
                    </div>
                ))}
            </div>

            {/* Chat Area */}
            <div className="w-2/3 flex flex-col">
                {selectedUser ? (
                    <>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 font-bold bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl flex items-center shadow-sm z-10">
                            Chat dengan {selectedUser.name}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl">
                            {messages.map(m => {
                                const isMine = m.sender_id === user?.id;
                                return (
                                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-2xl ${isMine ? 'bg-red-700 text-white rounded-tr-none' : 'bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600/50 rounded-tl-none shadow-sm'}`}>
                                            {m.message}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border-t border-gray-100 dark:border-gray-700/50 flex gap-2">
                            <Input 
                                value={messageInput} 
                                onChange={e => setMessageInput(e.target.value)} 
                                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                                placeholder={t.typeMessage} 
                                className="flex-1 rounded-full"
                            />
                            <Button onClick={sendMessage} className="rounded-full px-6">{t.send}</Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        {t.selectContact}
                    </div>
                )}
            </div>
        </div>
    );
}
