<?php
// Pure invoice-totals math — extracted from InvoiceController so it is unit-
// testable and has exactly ONE implementation (the frontend mirrors this in
// totalsFromForm; keep them in sync).
//
// Throws InvalidArgumentException on invalid input; the controller converts
// that to a 400 response. No side effects, no DB, no globals.

function pf_invoice_totals($items, $discountPercent = 0, $taxPercent = 0, $previousBalance = 0, $amountPaid = 0) {
    $parsedItems = is_array($items) ? $items : (json_decode($items, true) ?: []);
    $subtotal = 0;

    if ($discountPercent < 0 || $discountPercent > 100 || $taxPercent < 0 || $taxPercent > 100) {
        throw new InvalidArgumentException('Discount and tax percentages must be between 0 and 100');
    }

    foreach ($parsedItems as &$item) {
        $qty = intval($item['qty'] ?? 1);
        $unitPrice = floatval($item['unitPrice'] ?? $item['price'] ?? 0);
        if ($qty <= 0 || $unitPrice < 0) {
            throw new InvalidArgumentException('Invoice item quantity must be positive and unit price cannot be negative');
        }
        $item['qty'] = $qty;
        $item['unitPrice'] = $unitPrice;
        if (empty($item['description']) && !empty($item['name'])) {
            $item['description'] = $item['name'];
        }
        $subtotal += ($qty * $unitPrice);
    }
    unset($item);

    $discountAmt = ($subtotal * floatval($discountPercent)) / 100;
    $taxAmt = (($subtotal - $discountAmt) * floatval($taxPercent)) / 100;
    $total = $subtotal - $discountAmt + $taxAmt;
    $grandTotal = $total + floatval($previousBalance);
    $paid = floatval($amountPaid);
    if ($paid < 0 || $paid > $grandTotal) {
        throw new InvalidArgumentException('Amount paid cannot be negative or exceed the invoice total');
    }
    $balanceDue = max(0.0, $grandTotal - $paid);
    $status = 'pending';
    if ($balanceDue <= 0) {
        $status = 'paid';
    } else if ($paid > 0) {
        $status = 'partial';
    }

    return [
        'items' => $parsedItems,
        'subtotal' => $subtotal,
        'discount' => $discountAmt,
        'tax' => $taxAmt,
        'total' => $total,
        'grandTotal' => $grandTotal,
        'amountPaid' => $paid,
        'balanceDue' => $balanceDue,
        'status' => $status
    ];
}
