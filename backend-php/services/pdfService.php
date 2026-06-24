<?php
require_once __DIR__ . '/../libs/fpdf.php';

class InvoicePDF extends FPDF {
    private $clinic;
    private $invoice;

    public function __construct($invoice, $clinic) {
        parent::__construct('P', 'mm', 'A4');
        $this->invoice = $invoice;
        $this->clinic = $clinic;
    }

    public function Header() {
        $primaryColor = $this->clinic['primaryColor'] ?? '#0f766e';
        list($r, $g, $b) = $this->hex2rgb($primaryColor);

        // Header Background block
        $this->SetFillColor($r, $g, $b);
        $this->Rect(0, 0, 210, 42, 'F');

        // Clinic details
        $this->SetTextColor(255, 255, 255);
        $this->SetFont('Helvetica', 'B', 20);
        $this->SetXY(15, 10);
        $this->Cell(0, 8, $this->clinic['name'] ?? 'The Smile Expert', 0, 1);

        $this->SetFont('Helvetica', '', 9);
        $this->SetX(15);
        $this->Cell(0, 5, $this->clinic['tagline'] ?? 'Premium Dental Care Portal', 0, 1);
        $this->SetX(15);
        $this->Cell(0, 5, $this->clinic['address'] ?? 'Dental Clinic, Lahore', 0, 1);
        $this->SetX(15);
        $this->Cell(0, 5, ($this->clinic['phone'] ?? '') . ' | ' . ($this->clinic['email'] ?? ''), 0, 1);

        // Invoice title
        $this->SetXY(140, 10);
        $this->SetFont('Helvetica', 'B', 24);
        $this->Cell(55, 10, 'INVOICE', 0, 1, 'R');

        $this->SetXY(140, 22);
        $this->SetFont('Helvetica', '', 10);
        $this->Cell(55, 5, $this->invoice['invoiceNo'], 0, 1, 'R');

        // Status badge
        $status = strtolower($this->invoice['status']);
        $statusColors = [
            'paid' => [34, 197, 94],     // Green
            'pending' => [245, 158, 11],  // Orange
            'refunded' => [100, 116, 139], // Gray
            'cancelled' => [239, 68, 68]  // Red
        ];
        $color = $statusColors[$status] ?? [100, 116, 139];
        
        $this->SetFillColor($color[0], $color[1], $color[2]);
        $this->Rect(145, 29, 50, 7, 'F');
        $this->SetXY(145, 29.5);
        $this->SetTextColor(255, 255, 255);
        $this->SetFont('Helvetica', 'B', 9);
        $this->Cell(50, 6, strtoupper($status), 0, 1, 'C');

        $this->SetY(48);
    }

    public function Footer() {
        $this->SetY(-30);
        $this->SetFillColor(248, 250, 252);
        $this->Rect(0, 267, 210, 30, 'F');
        $this->Line(15, 267, 195, 267);

        $this->SetTextColor(100, 116, 139);
        $this->SetFont('Helvetica', '', 8);
        $this->SetY(-24);
        $this->Cell(0, 4, $this->clinic['invoiceFooter'] ?? 'Thank you for choosing The Smile Expert.', 0, 1, 'C');
        $this->Cell(0, 4, 'This is a computer-generated invoice and does not require a signature.', 0, 1, 'C');

        $primaryColor = $this->clinic['primaryColor'] ?? '#0f766e';
        list($r, $g, $b) = $this->hex2rgb($primaryColor);
        $this->SetTextColor($r, $g, $b);
        $this->SetFont('Helvetica', 'B', 8);
        $this->Cell(0, 4, ($this->clinic['name'] ?? 'The Smile Expert') . ' - Dental Clinic Portal', 0, 0, 'C');
    }

    private function hex2rgb($hex) {
        $hex = str_replace("#", "", $hex);
        if(strlen($hex) == 3) {
            $r = hexdec(substr($hex,0,1).substr($hex,0,1));
            $g = hexdec(substr($hex,1,1).substr($hex,1,1));
            $b = hexdec(substr($hex,2,1).substr($hex,2,1));
        } else {
            $r = hexdec(substr($hex,0,2));
            $g = hexdec(substr($hex,2,2));
            $b = hexdec(substr($hex,4,2));
        }
        return [$r, $g, $b];
    }
}

// FPDF renders Windows-1252, not UTF-8 — convert so dashes/quotes/etc. in
// owner-entered payment text don't turn into mojibake.
function pdf_enc($s) {
    $s = (string)$s;
    if (function_exists('iconv')) {
        $c = @iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $s);
        if ($c !== false) return $c;
    }
    return $s;
}

function generateInvoicePDF($invoice, $client, $clinic) {
    $pdf = new InvoicePDF($invoice, $clinic);
    $pdf->AddPage();
    
    // Bill to info
    $pdf->SetTextColor(30, 41, 59); // Dark
    $pdf->SetFont('Helvetica', 'B', 9);
    $pdf->Cell(95, 5, 'BILL TO', 0, 0);
    $pdf->Cell(95, 5, 'INVOICE DATE', 0, 1);

    $pdf->SetFont('Helvetica', 'B', 11);
    $pdf->Cell(95, 6, $client['name'], 0, 0);
    $pdf->SetFont('Helvetica', '', 9);
    $pdf->SetTextColor(100, 116, 139); // Gray
    $pdf->Cell(95, 6, date('d/m/Y', strtotime($invoice['createdAt'])), 0, 1);

    $pdf->SetTextColor(100, 116, 139); // Gray
    $pdf->Cell(95, 5, $client['patientNo'] ? 'Patient No: ' . $client['patientNo'] : '', 0, 0);
    if (!empty($invoice['dueDate'])) {
        $pdf->SetTextColor(30, 41, 59);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell(95, 5, 'DUE DATE', 0, 1);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->SetFont('Helvetica', '', 9);
        $pdf->Cell(95, 5, $client['phone'] ?? '', 0, 0);
        $pdf->Cell(95, 5, date('d/m/Y', strtotime($invoice['dueDate'])), 0, 1);
    } else {
        $pdf->Cell(95, 5, '', 0, 1);
        $pdf->Cell(95, 5, $client['phone'] ?? '', 0, 1);
    }

    $pdf->Cell(95, 5, $client['email'] ?? '', 0, 0);
    if (!empty($invoice['paymentMethod'])) {
        $pdf->SetTextColor(30, 41, 59);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell(95, 5, 'PAYMENT METHOD', 0, 1);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->SetFont('Helvetica', '', 9);
        $pdf->Cell(95, 5, '', 0, 0);
        $pdf->Cell(95, 5, $invoice['paymentMethod'], 0, 1);
    } else {
        $pdf->Cell(95, 5, '', 0, 1);
    }

    $pdf->Ln(5);
    $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
    $pdf->Ln(5);

    // Table Header
    $primaryColor = $clinic['primaryColor'] ?? '#0f766e';
    $hex = str_replace("#", "", $primaryColor);
    $r = hexdec(substr($hex, 0, 2));
    $g = hexdec(substr($hex, 2, 2));
    $b = hexdec(substr($hex, 4, 2));

    $pdf->SetFillColor($r, $g, $b);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Helvetica', 'B', 9);
    $pdf->Cell(100, 8, '  DESCRIPTION', 0, 0, 'L', true);
    $pdf->Cell(20, 8, 'QTY', 0, 0, 'C', true);
    $pdf->Cell(30, 8, 'UNIT PRICE', 0, 0, 'R', true);
    $pdf->Cell(30, 8, 'TOTAL  ', 0, 1, 'R', true);

    // Rows
    $pdf->SetTextColor(30, 41, 59);
    $pdf->SetFont('Helvetica', '', 9);
    $items = json_decode($invoice['items'], true) ?: [];

    $fill = false;
    foreach ($items as $item) {
        $pdf->SetFillColor(248, 250, 252);
        
        $name = $item['name'] ?? $item['description'] ?? 'Service';
        $qty = intval($item['qty'] ?? 1);
        $unitPrice = floatval($item['unitPrice'] ?? $item['price'] ?? 0);
        $total = floatval($item['total'] ?? ($qty * $unitPrice));

        $pdf->Cell(100, 8, '  ' . $name, 0, 0, 'L', $fill);
        $pdf->Cell(20, 8, $qty, 0, 0, 'C', $fill);
        $pdf->Cell(30, 8, 'PKR ' . number_format($unitPrice), 0, 0, 'R', $fill);
        $pdf->Cell(30, 8, 'PKR ' . number_format($total) . '  ', 0, 1, 'R', $fill);
        
        $fill = !$fill;
    }

    $pdf->Ln(5);
    $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
    $pdf->Ln(5);

    // Calculations block
    $calcY = $pdf->GetY();
    
    // Notes on the left
    if (!empty($invoice['notes'])) {
        $pdf->SetTextColor(30, 41, 59);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Text(15, $calcY + 5, 'Notes:');
        $pdf->SetFont('Helvetica', '', 9);
        $pdf->SetTextColor(100, 116, 139);
        
        $pdf->SetXY(15, $calcY + 8);
        $pdf->MultiCell(90, 4, $invoice['notes'], 0, 'L');
    }

    // Totals on the right
    $pdf->SetXY(120, $calcY);
    $pdf->SetTextColor(100, 116, 139);
    $pdf->SetFont('Helvetica', '', 9);
    
    $pdf->Cell(45, 5, 'Subtotal', 0, 0, 'R');
    $pdf->Cell(30, 5, 'PKR ' . number_format($invoice['subtotal']) . '  ', 0, 1, 'R');

    if (floatval($invoice['discount']) > 0) {
        $pdf->SetX(120);
        $pdf->Cell(45, 5, 'Discount', 0, 0, 'R');
        $pdf->Cell(30, 5, '-PKR ' . number_format($invoice['discount']) . '  ', 0, 1, 'R');
    }

    if (floatval($invoice['tax']) > 0) {
        $pdf->SetX(120);
        $pdf->Cell(45, 5, 'Tax', 0, 0, 'R');
        $pdf->Cell(30, 5, 'PKR ' . number_format($invoice['tax']) . '  ', 0, 1, 'R');
    }

    if (floatval($invoice['previousBalance']) > 0) {
        $pdf->SetX(120);
        $pdf->Cell(45, 5, 'Previous Due', 0, 0, 'R');
        $pdf->Cell(30, 5, 'PKR ' . number_format($invoice['previousBalance']) . '  ', 0, 1, 'R');
    }

    $pdf->Ln(2);
    $pdf->SetX(120);
    
    // Grand Total Banner
    $pdf->SetFillColor($r, $g, $b);
    $pdf->Rect(120, $pdf->GetY(), 75, 8, 'F');
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Helvetica', 'B', 10);
    $pdf->Cell(45, 8, 'TOTAL', 0, 0, 'R');
    $pdf->Cell(30, 8, 'PKR ' . number_format($invoice['grandTotal'] ?: $invoice['total']) . '  ', 0, 1, 'R');

    $pdf->Ln(2);
    $pdf->SetX(120);
    $pdf->SetTextColor(100, 116, 139);
    $pdf->SetFont('Helvetica', '', 9);
    $pdf->Cell(45, 5, 'Paid', 0, 0, 'R');
    $pdf->Cell(30, 5, 'PKR ' . number_format($invoice['amountPaid']) . '  ', 0, 1, 'R');

    $pdf->SetX(120);
    $pdf->SetTextColor(30, 41, 59);
    $pdf->SetFont('Helvetica', 'B', 10);
    $pdf->Cell(45, 6, 'Balance Due', 0, 0, 'R');
    $pdf->Cell(30, 6, 'PKR ' . number_format($invoice['balanceDue']) . '  ', 0, 1, 'R');

    // ---- Stamp / signature: FPDF needs a real file path, so decode to temp ----
    $stampFile = null;
    if (!empty($clinic['stampImage']) && preg_match('#^data:image/(png|jpe?g);base64,(.+)$#s', $clinic['stampImage'], $sm)) {
        $bin = base64_decode($sm[2]);
        if ($bin !== false && strlen($bin) > 0) {
            $stampFile = sys_get_temp_dir() . '/pfstamp_' . uniqid() . '.' . ($sm[1] === 'png' ? 'png' : 'jpg');
            file_put_contents($stampFile, $bin);
        }
    }

    // ---- Bottom: payment details + terms (left), signature/stamp (right) ----
    $payLines = [];
    if (!empty($clinic['bankName']))      $payLines[] = ['Bank', pdf_enc($clinic['bankName'])];
    if (!empty($clinic['accountTitle']))  $payLines[] = ['Account Title', pdf_enc($clinic['accountTitle'])];
    if (!empty($clinic['accountNumber'])) $payLines[] = ['Account Number', pdf_enc($clinic['accountNumber'])];
    if (!empty($clinic['iban']))          $payLines[] = ['IBAN', pdf_enc($clinic['iban'])];
    $terms = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', pdf_enc($clinic['paymentTerms'] ?? '')))));
    $hasDetails = !empty($payLines) || !empty($clinic['paymentNote']);

    $top = $pdf->GetY() + 12;
    if ($top > 218) { $pdf->AddPage(); $top = 55; }
    $pdf->SetDrawColor(226, 232, 240);
    $pdf->Line(15, $top, 195, $top);
    $top += 8;

    // LEFT column (x=15, w=108): Payment Details, then Payment Terms below
    $ly = $top;
    if ($hasDetails) {
        $pdf->SetXY(15, $ly);
        $pdf->SetTextColor($r, $g, $b);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell(108, 5, 'PAYMENT DETAILS', 0, 2, 'L');
        $ly += 7;
        foreach ($payLines as $row) {
            $pdf->SetXY(15, $ly);
            $pdf->SetTextColor(120, 130, 145);
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->Cell(30, 5, $row[0], 0, 0, 'L');
            $pdf->SetTextColor(30, 41, 59);
            $pdf->SetFont('Helvetica', 'B', 9);
            $pdf->Cell(78, 5, $row[1], 0, 0, 'L');
            $ly += 5.5;
        }
        if (!empty($clinic['paymentNote'])) {
            $pdf->SetXY(15, $ly + 1);
            $pdf->SetTextColor(120, 130, 145);
            $pdf->SetFont('Helvetica', '', 8);
            $pdf->MultiCell(108, 4.5, pdf_enc($clinic['paymentNote']), 0, 'L');
            $ly = $pdf->GetY();
        }
    }
    if (!empty($terms)) {
        if ($hasDetails) $ly += 5;
        $pdf->SetXY(15, $ly);
        $pdf->SetTextColor($r, $g, $b);
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->Cell(108, 5, 'PAYMENT TERMS', 0, 2, 'L');
        $ly += 7;
        $pdf->SetFont('Helvetica', '', 8);
        foreach ($terms as $term) {
            $pdf->SetFillColor(247, 249, 251);
            $pdf->SetDrawColor(226, 232, 240);
            $pdf->SetTextColor(51, 65, 85);
            $pdf->SetXY(15, $ly);
            $pdf->MultiCell(108, 6, $term, 1, 'L', true);
            $ly = $pdf->GetY() + 2;
        }
    }

    // RIGHT column (x=130, w=65): Signature / stamp area
    $rx = 130; $rw = 65;
    $ry = $top;
    if ($stampFile) {
        $dim = @getimagesize($stampFile);
        if ($dim && $dim[0] > 0 && $dim[1] > 0) {
            $maxW = 55; $maxH = 24;
            $scale = min($maxW / $dim[0], $maxH / $dim[1]);
            $iw = $dim[0] * $scale; $ih = $dim[1] * $scale;
            $pdf->Image($stampFile, $rx + ($rw - $iw) / 2, $ry, $iw, $ih);
            $ry += $ih + 2;
        } else { $ry += 18; }
    } else {
        $ry += 18; // blank space for a handwritten signature
    }
    $pdf->SetDrawColor(160, 170, 180);
    $pdf->Line($rx + 6, $ry, $rx + $rw - 6, $ry);
    $pdf->SetXY($rx, $ry + 1.5);
    $pdf->SetTextColor(120, 130, 145);
    $pdf->SetFont('Helvetica', '', 8);
    $pdf->Cell($rw, 4, 'Authorized Signature', 0, 2, 'C');
    $pdf->SetTextColor(30, 41, 59);
    $pdf->SetFont('Helvetica', 'B', 8.5);
    $pdf->Cell($rw, 4, pdf_enc($clinic['name'] ?? ''), 0, 1, 'C');

    $output = $pdf->Output('S');
    if ($stampFile && file_exists($stampFile)) { @unlink($stampFile); }
    return $output;
}
