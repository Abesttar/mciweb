<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        
        $notifications = Notification::where('user_id', $user->id)
            ->latest()
            ->take(20)
            ->get();
        $unreadCount = Notification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $user = Auth::user();
        
        if ($id === 'all') {
            Notification::where('user_id', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        } else {
            $notification = Notification::where('user_id', $user->id)->find($id);
            if ($notification) {
                $notification->update(['read_at' => now()]);
            }
        }

        return response()->json(['message' => 'Marked as read']);
    }
}
