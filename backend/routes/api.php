<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\StudyClassController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\RoadmapStageController;
use App\Http\Controllers\StudentRoadmapController;
use App\Http\Controllers\MatchingController;
use App\Http\Controllers\DepartureController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\RaportSnapshotController;
use App\Http\Controllers\TrainingProgramController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/me/profile-photo', [AuthController::class, 'updateProfilePhoto']);
    Route::put('/me/profile', [AuthController::class, 'updateProfile']);

    // Master Data CRUD
    Route::apiResource('batches', BatchController::class);
    Route::apiResource('training-programs', TrainingProgramController::class);
    Route::post('students/{student}/documents', [StudentController::class, 'uploadDocument']);
    Route::get('students/{student}/download/{field}', [StudentController::class, 'downloadDocument']);
    Route::get('students/me', [StudentController::class, 'me']);
    Route::post('students/bulk-level-update', [StudentController::class, 'bulkUpdateLevel']);
    Route::apiResource('students', StudentController::class);
    Route::apiResource('teachers', TeacherController::class);
    Route::apiResource('subjects', SubjectController::class);
    Route::apiResource('study-classes', StudyClassController::class);
    Route::apiResource('companies', CompanyController::class);
    Route::apiResource('enrollments', EnrollmentController::class);
    Route::post('enrollments/{enrollment}/publish-raport', [EnrollmentController::class, 'publishRaport']);
    Route::get('me/enrollments', [EnrollmentController::class, 'myEnrollments']);
    Route::apiResource('schedules', ScheduleController::class);
    Route::apiResource('attendances', AttendanceController::class);
    Route::post('attendances-bulk', [AttendanceController::class, 'bulkStore']);
    Route::post('attendances/class-bulk', [AttendanceController::class, 'classBulkStore']);
    Route::apiResource('grades', GradeController::class);
    Route::post('grades-bulk', [GradeController::class, 'batchStore']);
    Route::post('grades-bulk-delete', [GradeController::class, 'batchDestroy']);
    Route::apiResource('assignments', AssignmentController::class);
    Route::apiResource('assignment-submissions', \App\Http\Controllers\AssignmentSubmissionController::class)->only(['index', 'store', 'show', 'update']);
    
    Route::apiResource('document-types', \App\Http\Controllers\DocumentTypeController::class);
    Route::apiResource('student-documents', \App\Http\Controllers\StudentDocumentController::class);
    Route::put('student-documents/{id}/verify', [\App\Http\Controllers\StudentDocumentController::class, 'verify']);

    // Roadmap
    Route::apiResource('roadmap-stages', RoadmapStageController::class);
    Route::apiResource('student-roadmaps', StudentRoadmapController::class);

    // Matching & Departure
    Route::apiResource('matchings', MatchingController::class);
    Route::apiResource('departures', DepartureController::class);
    
    // Announcements & Activity Logs
    Route::apiResource('announcements', AnnouncementController::class)->except(['update']);
    Route::get('activity-logs', [ActivityLogController::class, 'index']);
    
    // Notifications & Messages
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::put('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::apiResource('messages', \App\Http\Controllers\MessageController::class)->only(['index', 'store']);
    Route::put('messages/{id}/read', [\App\Http\Controllers\MessageController::class, 'markAsRead']);

    // Reports
    Route::get('reports/students', [ReportController::class, 'index']);
    Route::get('reports/students/{id}', [ReportController::class, 'generateStudentReport']);

    // Raport Snapshots (Riwayat Raport)
    Route::get('students/{id}/raport-snapshots', [RaportSnapshotController::class, 'index']);
    
    // Dashboard
    Route::get('dashboard/stats', [DashboardController::class, 'index']);
    
    // Settings
    Route::get('settings', [SettingController::class, 'index']);
    Route::put('settings', [SettingController::class, 'update'])->middleware('role:Super Admin|Admin');

    // Role Permissions Management
    Route::get('roles-permissions', [RolePermissionController::class, 'index'])->middleware('role:Super Admin|Admin');
    Route::put('roles-permissions/{id}', [RolePermissionController::class, 'updateRolePermissions'])->middleware('role:Super Admin|Admin');

    Route::get('roles', [UserController::class, 'getRoles']);
    Route::apiResource('users', UserController::class);

    // Payments
    Route::get('students/{id}/payments', [\App\Http\Controllers\PaymentController::class, 'index']);
    Route::post('students/{id}/payments', [\App\Http\Controllers\PaymentController::class, 'store']);
    Route::get('students/{id}/payment-summary', [\App\Http\Controllers\PaymentController::class, 'summary']);
    Route::put('payments/{id}', [\App\Http\Controllers\PaymentController::class, 'update']);
    Route::delete('payments/{id}', [\App\Http\Controllers\PaymentController::class, 'destroy']);

    // Invoices
    Route::get('students/{id}/invoices', [InvoiceController::class, 'index']);
    Route::post('students/{id}/invoices', [InvoiceController::class, 'store']);
    Route::get('invoices/my', [InvoiceController::class, 'myInvoices']);
    Route::put('invoices/{id}', [InvoiceController::class, 'update']);
    Route::delete('invoices/{id}', [InvoiceController::class, 'destroy']);
    Route::get('me/payments', [\App\Http\Controllers\PaymentController::class, 'myPayments']);
});
