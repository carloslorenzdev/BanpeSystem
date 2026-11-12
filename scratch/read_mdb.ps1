try {
    $conn = New-Object -ComObject ADODB.Connection
    $conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\laragon\www\banpeSystem\scratch\ejemplo_copy.mdb;")
    Write-Host "JET_OK"
    
    $rs = $conn.Execute("SELECT * FROM Presupuesto")
    $count = 0
    while (!$rs.EOF) {
        $count++
        $fields = @()
        for ($i = 0; $i -lt $rs.Fields.Count; $i++) {
            $name = $rs.Fields.Item($i).Name
            $val = $rs.Fields.Item($i).Value
            $fields += "$name = $val"
        }
        if ($count -le 3) {
            Write-Host ($fields -join " | ")
        }
        $rs.MoveNext()
    }
    Write-Host "Total filas en Presupuesto: $count"
    $conn.Close()
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}

