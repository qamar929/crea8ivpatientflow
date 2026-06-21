<?php
// One-shot generator: builds the FPDF (JSON fork) core-font definition files
// from Adobe AFM metric files. Run locally once; commit the resulting
// libs/font/*.json. Widths are indexed by character code (cp1252 == ASCII for
// the printable range used by invoices), which is exactly what FPDF expects.
//
// Usage: php libs/makecorefonts.php /path/to/afm/dir

$afmDir = $argv[1] ?? (__DIR__ . '/../../backend/node_modules/pdfkit/js/data');
$outDir = __DIR__ . '/font';
if (!is_dir($outDir)) mkdir($outDir, 0755, true);

// AFM file => [fpdf file key, PostScript BaseFont name]
$fonts = [
    'Helvetica.afm'            => ['helvetica',   'Helvetica'],
    'Helvetica-Bold.afm'       => ['helveticab',  'Helvetica-Bold'],
    'Helvetica-Oblique.afm'    => ['helveticai',  'Helvetica-Oblique'],
    'Helvetica-BoldOblique.afm'=> ['helveticabi', 'Helvetica-BoldOblique'],
];

foreach ($fonts as $afm => [$key, $name]) {
    $path = "$afmDir/$afm";
    if (!is_file($path)) { fwrite(STDERR, "MISSING: $path\n"); exit(1); }

    // Default every byte to 0; fill the standard 'missing width' later.
    $cw = array_fill(0, 256, 0);
    foreach (file($path) as $line) {
        if (strncmp($line, 'C ', 2) !== 0) continue;
        // C 32 ; WX 278 ; N space ; ...
        if (preg_match('/^C\s+(-?\d+)\s*;\s*WX\s+(\d+)/', $line, $m)) {
            $code = (int)$m[1];
            $width = (int)$m[2];
            if ($code >= 0 && $code <= 255) $cw[$code] = $width;
        }
    }

    $info = [
        'type' => 'Core',
        'name' => $name,
        'up'   => -100,
        'ut'   => 50,
        'cw'   => $cw,
    ];
    file_put_contents("$outDir/$key.json", json_encode($info));
    echo "wrote font/$key.json\n";
}
echo "done\n";
