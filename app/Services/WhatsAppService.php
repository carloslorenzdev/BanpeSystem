<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected string $apiUrl;
    protected ?string $phoneNumberId;
    protected ?string $accessToken;

    public function __construct()
    {
        $this->apiUrl = config('services.whatsapp.api_url', 'https://graph.facebook.com/v21.0');
        $this->phoneNumberId = config('services.whatsapp.phone_number_id');
        $this->accessToken = config('services.whatsapp.access_token');
    }

    /**
     * Envía una notificación basada en plantilla aprobada por Meta (Cloud API oficial gratuita).
     *
     * @param string $to Número en formato internacional (Ej: '584121234567', sin el símbolo +)
     * @param string $templateName Nombre exacto de la plantilla aprobada en Meta
     * @param array<int, string> $bodyParameters Parámetros que llenan las variables {{1}}, {{2}} de la plantilla
     * @param string $language Código del idioma (por defecto 'es')
     */
    public function sendTemplate(string $to, string $templateName, array $bodyParameters = [], string $language = 'es'): bool
    {
        if (empty($this->phoneNumberId) || empty($this->accessToken)) {
            Log::warning("[WhatsAppService] Credenciales no configuradas. Mensaje para {$to} omitido.");
            return false;
        }

        // Limpiar el número telefónico (remover +, espacios, guiones)
        $cleanPhone = preg_replace('/[^0-9]/', '', $to);

        $parameters = array_map(fn ($text) => [
            'type' => 'text',
            'text' => (string) $text,
        ], $bodyParameters);

        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $cleanPhone,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => [
                    'code' => $language,
                ],
                'components' => [
                    [
                        'type' => 'body',
                        'parameters' => $parameters,
                    ],
                ],
            ],
        ];

        try {
            $response = Http::withToken($this->accessToken)
                ->timeout(10)
                ->post("{$this->apiUrl}/{$this->phoneNumberId}/messages", $payload);

            if ($response->successful()) {
                Log::info("[WhatsAppService] Notificación enviada con éxito a {$cleanPhone}. Template: {$templateName}");
                return true;
            }

            Log::error("[WhatsAppService] Error al enviar WhatsApp: " . $response->body());
            return false;
        } catch (\Throwable $e) {
            Log::error("[WhatsAppService] Excepción al enviar mensaje a {$cleanPhone}: " . $e->getMessage());
            return false;
        }
    }
}

