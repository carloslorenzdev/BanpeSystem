<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExchangeRateService
{
    const API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
    const CACHE_KEY = 'bcv_api_rate';
    const MANUAL_KEY = 'bcv_manual_rate';
    const LAST_KNOWN_KEY = 'bcv_last_known_rate';
    const DEFAULT_FALLBACK_RATE = 899.27;

    /**
     * Obtiene la tasa de cambio actual (oficial BCV o manual)
     *
     * @return array{
     *     rate: float,
     *     source: string,
     *     is_manual: bool,
     *     updated_at: string,
     *     error: ?string
     * }
     */
    public function getRate(): array
    {
        // 1. Verificar si el usuario fijó una tasa manual
        $manualRate = Cache::get(self::MANUAL_KEY);
        if ($manualRate !== null && is_numeric($manualRate) && (float) $manualRate > 0) {
            return [
                'rate' => (float) $manualRate,
                'source' => 'manual',
                'is_manual' => true,
                'updated_at' => Cache::get(self::MANUAL_KEY . '_time', now()->toIso8601String()),
                'error' => null,
            ];
        }

        // 2. Verificar caché de la API
        $cached = Cache::get(self::CACHE_KEY);
        if ($cached && is_array($cached) && isset($cached['rate'])) {
            return $cached;
        }

        // 3. Consultar la API de DolarApi
        return $this->fetchFromApi();
    }

    /**
     * Consulta el endpoint oficial de DolarApi para Venezuela
     */
    public function fetchFromApi(): array
    {
        try {
            $response = Http::timeout(5)
                ->withoutVerifying()
                ->acceptJson()
                ->get(self::API_URL);

            if ($response->successful()) {
                $data = $response->json();
                $rate = (float) ($data['promedio'] ?? $data['venta'] ?? $data['compra'] ?? 0);

                if ($rate > 0) {
                    $result = [
                        'rate' => round($rate, 4),
                        'source' => 'bcv_api',
                        'is_manual' => false,
                        'updated_at' => $data['fechaActualizacion'] ?? now()->toIso8601String(),
                        'error' => null,
                    ];

                    // Cachear por 30 minutos
                    Cache::put(self::CACHE_KEY, $result, now()->addMinutes(30));
                    // Guardar como última tasa conocida permanente
                    Cache::forever(self::LAST_KNOWN_KEY, $result);

                    return $result;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('ExchangeRateService: Fallo al consultar DolarApi: ' . $e->getMessage());
        }

        // 4. Si la API falla, usar la última tasa conocida o fallback
        $lastKnown = Cache::get(self::LAST_KNOWN_KEY);
        if ($lastKnown && is_array($lastKnown) && isset($lastKnown['rate'])) {
            return [
                'rate' => (float) $lastKnown['rate'],
                'source' => 'cached_fallback',
                'is_manual' => false,
                'updated_at' => $lastKnown['updated_at'] ?? now()->toIso8601String(),
                'error' => 'API no disponible temporalmente. Usando última cotización registrada.',
            ];
        }

        return [
            'rate' => self::DEFAULT_FALLBACK_RATE,
            'source' => 'default_fallback',
            'is_manual' => false,
            'updated_at' => now()->toIso8601String(),
            'error' => 'No se pudo contactar a DolarApi. Usando tasa referencial por defecto.',
        ];
    }

    /**
     * Establece una tasa manual fija por el usuario
     */
    public function setManualRate(float $rate): array
    {
        Cache::forever(self::MANUAL_KEY, $rate);
        Cache::forever(self::MANUAL_KEY . '_time', now()->toIso8601String());

        return $this->getRate();
    }

    /**
     * Elimina la tasa manual para reanudar la tasa automática de la API
     */
    public function clearManualRate(): array
    {
        Cache::forget(self::MANUAL_KEY);
        Cache::forget(self::MANUAL_KEY . '_time');
        Cache::forget(self::CACHE_KEY);

        return $this->fetchFromApi();
    }
}
