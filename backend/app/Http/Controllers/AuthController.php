<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            $token = $user->createToken('auth_token')->plainTextToken;

            // Load roles and permissions
            $user->load('roles.permissions');
            
            // Format permissions into flat array
            $permissions = $user->getAllPermissions()->pluck('name');

            return response()->json([
                'message' => 'Login successful',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $this->formatUser($user, $permissions),
            ]);
        }

        return response()->json([
            'message' => 'Invalid credentials'
        ], 401);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }
    
    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('roles.permissions');
        $permissions = $user->getAllPermissions()->pluck('name');
        
        return response()->json([
            'user' => $this->formatUser($user, $permissions),
        ]);
    }

    public function updateProfilePhoto(Request $request)
    {
        $validated = $request->validate([
            'profile_photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:102400',
        ]);

        $user = $request->user();

        if ($user->profile_photo && Storage::disk('public')->exists($user->profile_photo)) {
            Storage::disk('public')->delete($user->profile_photo);
        }

        $user->update([
            'profile_photo' => $validated['profile_photo']->store('profile_photos', 'public'),
        ]);

        $user->load('roles.permissions');

        return response()->json([
            'message' => 'Foto profil berhasil diperbarui.',
            'user' => $this->formatUser($user, $user->getAllPermissions()->pluck('name')),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $rules = [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
        ];

        // Only validate password if provided
        if ($request->filled('password')) {
            $rules['current_password'] = 'required|current_password';
            $rules['password'] = 'required|string|min:8|confirmed';
        }

        $validated = $request->validate($rules);

        // Update name/email
        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        // Update password if provided
        if (isset($validated['password'])) {
            $user->password = $validated['password'];
        }

        $user->save();

        if ($request->has('phone') || $request->has('address') || $request->has('gender')) {
            $profileData = $request->only(['phone', 'address', 'gender']);
            if ($user->hasRole('Sensei') && $user->teacher) {
                $user->teacher->update($profileData);
            } else if (!$user->hasRole('Siswa') && $user->staff) {
                $user->staff->update($profileData);
            }
        }
        $user->load('roles.permissions');

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user' => $this->formatUser($user, $user->getAllPermissions()->pluck('name')),
        ]);
    }

    private function formatUser($user, $permissions): array
    {
        $profile = null;
        if ($user->hasRole('Sensei') && $user->teacher) {
            $profile = [
                'phone' => $user->teacher->phone,
                'address' => $user->teacher->address,
                'gender' => $user->teacher->gender,
            ];
        } else if (!$user->hasRole('Siswa') && $user->staff) {
            $profile = [
                'phone' => $user->staff->phone,
                'address' => $user->staff->address,
                'gender' => $user->staff->gender,
            ];
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'profile_photo' => $user->profile_photo,
            'profile_photo_url' => $user->profile_photo_url,
            'roles' => $user->getRoleNames(),
            'permissions' => $permissions,
            'profile' => $profile,
        ];
    }
}
