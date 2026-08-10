<?php

namespace App\Http\Controllers;

use App\Models\DocumentType;
use Illuminate\Http\Request;

class DocumentTypeController extends Controller
{
    public function index()
    {
        return DocumentType::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_required' => 'boolean',
        ]);

        $documentType = DocumentType::create($validated);
        return response()->json($documentType, 201);
    }

    public function show(DocumentType $documentType)
    {
        return $documentType;
    }

    public function update(Request $request, DocumentType $documentType)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'is_required' => 'boolean',
        ]);

        $documentType->update($validated);
        return response()->json($documentType);
    }

    public function destroy(DocumentType $documentType)
    {
        $documentType->delete();
        return response()->json(null, 204);
    }
}
