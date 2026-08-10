<?php

namespace App\Http\Controllers;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageController extends Controller
{
    public function index(Request $request)
    {
        $userId = Auth::id();
        $withUser = $request->query('with_user');

        $query = Message::where(function($q) use ($userId, $withUser) {
            $q->where('sender_id', $userId)->where('receiver_id', $withUser);
        })->orWhere(function($q) use ($userId, $withUser) {
            $q->where('sender_id', $withUser)->where('receiver_id', $userId);
        })->orderBy('created_at', 'asc');

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'message' => 'required|string'
        ]);

        $message = Message::create([
            'sender_id' => Auth::id(),
            'receiver_id' => $validated['receiver_id'],
            'message' => $validated['message'],
            'is_read' => false
        ]);

        return response()->json($message, 201);
    }

    public function markAsRead(Request $request, $id)
    {
        $message = Message::findOrFail($id);
        
        if ($message->receiver_id == Auth::id()) {
            $message->update(['is_read' => true]);
        }

        return response()->json(['success' => true]);
    }
}
