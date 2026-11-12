<?php

$dbPath = realpath(__DIR__ . '/ejemplo_copy.mdb');

try {
    $connStr = "odbc:Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=" . $dbPath . ";";
    $pdo = new PDO($connStr);
    echo "Conexión a Access exitosa!\n";

    // Listar tablas
    $stmt = $pdo->query("SELECT Name FROM MSysObjects WHERE Type=1 AND Flags=0");
    if ($stmt) {
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "Tablas encontradas:\n";
        print_r($tables);
    } else {
        // Intentar tablas comunes de Maprex
        $candidates = ['Partidas', 'Presupuesto', 'Insumos', 'Obra', 'Capitulos', 'APU', 'Materiales', 'Equipos', 'ManoObra'];
        foreach ($candidates as $t) {
            try {
                $q = $pdo->query("SELECT COUNT(*) FROM [$t]");
                if ($q) {
                    echo "Tabla [$t] existe con " . $q->fetchColumn() . " filas\n";
                }
            } catch (\Exception $e) {
                // Ignore
            }
        }
    }
} catch (\Exception $e) {
    echo "Error conectando: " . $e->getMessage() . "\n";
}

