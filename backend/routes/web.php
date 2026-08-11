<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Mail;

Route::get('/', function () {
    return view('welcome');
});

// TEMPORARY: Test mail route - DELETE after testing
Route::get('/test-mail', function () {
    try {
        Mail::raw('Test email dari LPK Mirai Crown Indonesia. Jika Anda menerima email ini, berarti sistem email berfungsi dengan baik!', function ($message) {
            $message->to('abesttar@gmail.com')
                    ->subject('Test Email - LPK Mirai Crown Indonesia');
        });
        return response()->json(['status' => 'success', 'message' => 'Email berhasil dikirim ke abesttar@gmail.com!']);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});
