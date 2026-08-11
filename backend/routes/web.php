<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

Route::get('/', function () {
    return view('welcome');
});

// Fallback route to serve files from storage for shared hosting environments
Route::get('/storage/{path}', function ($path) {
    $filePath = storage_path('app/public/' . $path);
    
    if (!file_exists($filePath)) {
        abort(404);
    }
    
    $file = File::get($filePath);
    $type = File::mimeType($filePath);
    
    $response = response()->make($file, 200);
    $response->header("Content-Type", $type);
    $response->header("Cache-Control", "public, max-age=86400");
    
    return $response;
})->where('path', '.*');
