<?php
$file = 'autorefresh_2.3.3fix.crx';

if (file_exists($file)) {
    header('Content-Description: File Transfer');
    header('Content-Type: application/x-chrome-extension');
    header('Content-Disposition: attachment; filename='.basename($file));
    header('Content-Transfer-Encoding: binary');
    header('Expires: 0');
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    header('Content-Length: ' . filesize($file));
    ob_clean();
    flush();
    readfile($file);
    exit;
}
?>