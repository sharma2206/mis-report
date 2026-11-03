<?php

namespace App\Http\Controllers\Api;

use App\Models\KpiDefinition;
use App\Services\KpiEngine;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use InvalidArgumentException;
use Illuminate\Validation\Rule;

class KpiController extends Controller
{
    public function __construct(private KpiEngine $engine) {}

    public function index(): JsonResponse
    {
        $definitions = KpiDefinition::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['code', 'name', 'description', 'source', 'format', 'calculator']);

        return response()->json([
            'success' => true,
            'data'    => $definitions,
        ]);
    }

    public function show(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'branch' => [
                'required',
                'string',
                Rule::exists('branches', 'key')->where(
                    fn ($query) => $query
                        ->where('is_active', true)
                        ->where('tenant_id', TenantContext::id())
                ),
            ],
            'from'   => 'required|date_format:Y-m-d',
            'to'     => 'nullable|date_format:Y-m-d',
        ]);

        $definition = KpiDefinition::query()
            ->where('code', $code)
            ->where('is_active', true)
            ->firstOrFail();

        try {
            $value = $this->engine->evaluate(
                $definition,
                $data['branch'],
                $data['from'],
                $data['to'] ?? null,
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'code'   => $definition->code,
                'name'   => $definition->name,
                'format' => $definition->format,
                'source' => $definition->source,
                'value'  => $value,
            ],
        ]);
    }
}
