<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MISRequest;
use App\Services\MISService;
use Exception;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MISController extends Controller
{
    private MISService $misService;

    public function __construct(MISService $misService)
    {
        $this->misService = $misService;
    }

    /**
     * Display the MIS report.
     *
     * @param MISRequest $request
     * @param string $branch
     * @param string $date
     * @return JsonResponse
     */
    public function show(MISRequest $request, string $branch, string $date): JsonResponse
    {
        try {
            // Merge route params into request for potential manual checks, 
            // though validation is already handled by FormRequest lifecycle.
            $request->merge(['branch' => $branch, 'date' => $date]);
            
            $data = $this->misService->generateMIS($request->branch(), $request->date());

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Export the MIS report to Excel.
     *
     * @param MISRequest $request
     * @param string $branch
     * @param string $date
     * @return BinaryFileResponse|JsonResponse
     */
    public function export(MISRequest $request, string $branch, string $date)
    {
        try {
            $request->merge(['branch' => $branch, 'date' => $date]);

            $data = $this->misService->generateMIS($request->branch(), $request->date());

            return \Maatwebsite\Excel\Facades\Excel::download(
                new \App\Exports\MISExport($data), 
                "MIS_{$branch}_{$date}.xlsx"
            );

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
