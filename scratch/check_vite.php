
<?php
$res = @file_get_contents('http://127.0.0.1:5173/resources/js/app.tsx');
if ($res === false) {
    echo "ERROR CONNECTING TO 127.0.0.1:5173\n";
    $res2 = @file_get_contents('http://[::1]:5173/resources/js/app.tsx');
    if ($res2 === false) {
        echo "ERROR CONNECTING TO [::1]:5173 TOO!\n";
    } else {
        echo "CONNECTED VIA [::1]: " . substr($res2, 0, 100) . "\n";
    }
} else {
    echo "CONNECTED TO 127.0.0.1: " . substr($res, 0, 100) . "\n";
}

