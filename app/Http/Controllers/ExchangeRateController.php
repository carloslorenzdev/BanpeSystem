<?php

namespace App\Http\Controllers;

use App\Services\ExchangeRateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExchangeRateController extends Controller
{
    public function __construct(
        protected ExchangeRateService $service
    ) {}

    /**
     * Devuelve la tasa actual
     */
    public function show(): JsonResponse
    {
        return response()->json($this->service->getRate());
    }

    /**
     * Forzar actualización desde la API
     */
    public function refresh(): JsonResponse
    {
        return response()->json($this->service->clearManualRate());
    }

    /**
     * Guardar una tasa manual fija
     */
    public function setManual(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rate' => ['required', 'numeric', 'min:0.0001'],
        ]);

        return response()->json($this->service->setManualRate((float) $validated['rate']));
    }

    /**
     * Limpiar tasa manual y volver a la API oficial
     */
    public function clearManual(): JsonResponse
    {
        return response()->json($this->service->clearManualRate());
    }
}

