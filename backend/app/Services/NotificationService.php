<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * Kirim notifikasi ke satu user.
     */
    public static function send(int $userId, string $title, string $message): void
    {
        Notification::create([
            'user_id' => $userId,
            'title'   => $title,
            'message' => $message,
        ]);
    }

    /**
     * Kirim notifikasi ke banyak user sekaligus (bulk insert).
     */
    public static function sendBulk(array $userIds, string $title, string $message): void
    {
        $userIds = array_unique(array_filter($userIds));
        if (empty($userIds)) return;

        $now = now();
        $rows = array_map(fn($uid) => [
            'user_id'    => $uid,
            'title'      => $title,
            'message'    => $message,
            'created_at' => $now,
            'updated_at' => $now,
        ], $userIds);

        Notification::insert($rows);
    }

    /**
     * Kirim notifikasi ke semua user dengan role tertentu.
     */
    public static function sendToRole(string $role, string $title, string $message, ?int $excludeUserId = null): void
    {
        $query = User::role($role);
        if ($excludeUserId) {
            $query->where('id', '!=', $excludeUserId);
        }
        $userIds = $query->pluck('id')->toArray();
        self::sendBulk($userIds, $title, $message);
    }

    /**
     * Kirim notifikasi ke Admin dan Sachou sekaligus.
     */
    public static function sendToAdmins(string $title, string $message, ?int $excludeUserId = null): void
    {
        $query = User::whereHas('roles', fn($q) => $q->whereIn('name', ['Admin', 'Sachou', 'Super Admin']));
        if ($excludeUserId) {
            $query->where('id', '!=', $excludeUserId);
        }
        $userIds = $query->pluck('id')->toArray();
        self::sendBulk($userIds, $title, $message);
    }
}
