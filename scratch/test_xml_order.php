<?php

$content = file_get_contents('public/templates/Presupuesto_Maprex_Ejemplo_BANPE.xls');

echo "Tiene urn:schemas-microsoft-com:office:spreadsheet? " . (stripos($content, 'urn:schemas-microsoft-com:office:spreadsheet') !== false ? 'SI' : 'NO') . "\n";
echo "Tiene <table? " . (stripos($content, '<table') !== false ? 'SI' : 'NO') . "\n";

// Si probamos parseSpreadsheetXml:
$xml = simplexml_load_string($content);
$ns = $xml->getNamespaces(true);
echo "Namespaces:\n";
print_r($ns);

$prefix = 'ss';
$uri = $ns['ss'] ?? 'urn:schemas-microsoft-com:office:spreadsheet';
$xml->registerXPathNamespace($prefix, $uri);

$xmlRows = $xml->xpath('//' . $prefix . ':Row');
echo "Filas encontradas con xpath //ss:Row: " . count($xmlRows) . "\n";

foreach (array_slice($xmlRows, 0, 3) as $r) {
    $cells = [];
    foreach ($r->xpath('.//*[local-name()="Data"]') as $d) {
        $cells[] = (string)$d;
    }
    echo "Fila: " . implode(" | ", $cells) . "\n";
}

