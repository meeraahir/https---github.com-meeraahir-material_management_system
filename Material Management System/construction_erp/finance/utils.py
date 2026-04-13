from decimal import Decimal

from django.db import transaction

from .models import ClientReceipt, Transaction


AUTO_RECEIPT_UPDATE_NOTE = "Auto-created from receivable received_amount update."
RECEIPT_STYLE_ENTRY_NOTE = "Auto-created from receipt-style receivable entry."


def _pending_invoices(party, site, *, exclude_invoice_id=None, upto_date=None, upto_id=None):
    invoices = (
        Transaction.objects.filter(party=party, site=site)
        .select_related("party", "site")
        .order_by("date", "id")
    )
    if exclude_invoice_id is not None:
        invoices = invoices.exclude(pk=exclude_invoice_id)

    pending = []
    for invoice in invoices:
        if upto_date is not None and (invoice.date, invoice.id) > (upto_date, upto_id or invoice.id):
            continue
        if Decimal(invoice.pending_amount()) > 0:
            pending.append(invoice)
    return pending


def _total_pending(invoices):
    return sum((Decimal(invoice.pending_amount()) for invoice in invoices), Decimal("0"))


def _apply_receipt_amount(
    invoices,
    amount,
    receipt_date,
    notes,
    reference_number=None,
    payment_mode='cash',
    sender_name=None,
    receiver_name=None,
    cheque_number=None,
):
    remaining = Decimal(amount)
    touched = []

    for invoice in invoices:
        pending_amount = Decimal(invoice.pending_amount())
        if pending_amount <= 0:
            continue

        allocation = min(pending_amount, remaining)
        if allocation <= 0:
            continue

        ClientReceipt.objects.create(
            invoice=invoice,
            party=invoice.party,
            site=invoice.site,
            amount=allocation,
            date=receipt_date or invoice.date,
            payment_mode=payment_mode,
            sender_name=sender_name,
            receiver_name=receiver_name,
            cheque_number=cheque_number,
            reference_number=reference_number,
            notes=notes,
        )
        invoice.sync_received_status(save=True)
        touched.append(invoice)
        remaining -= allocation

        if remaining <= 0:
            break

    return touched, remaining


def apply_receipt_style_entry(
    party,
    site,
    amount,
    receipt_date,
    payment_mode='cash',
    sender_name=None,
    receiver_name=None,
    cheque_number=None,
):
    invoices = _pending_invoices(party, site)
    if not invoices:
        return None

    amount = Decimal(amount)
    if _total_pending(invoices) < amount:
        return None

    touched, remaining = _apply_receipt_amount(
        invoices,
        amount,
        receipt_date,
        RECEIPT_STYLE_ENTRY_NOTE,
        payment_mode=payment_mode,
        sender_name=sender_name,
        receiver_name=receiver_name,
        cheque_number=cheque_number,
    )
    if remaining > 0 or not touched:
        return None

    return touched[0]


def normalize_receipt_style_invoices(*, party=None):
    candidates = Transaction.objects.select_related("party", "site").order_by("date", "id")
    if party is not None:
        candidates = candidates.filter(party=party)

    for candidate in candidates:
        receipts = list(candidate.receipts.order_by("date", "id"))
        if len(receipts) != 1:
            continue

        receipt = receipts[0]
        if (receipt.notes or "") != AUTO_RECEIPT_UPDATE_NOTE:
            continue

        candidate_pending = Decimal(candidate.pending_amount())
        if candidate_pending != 0:
            continue

        open_invoices = _pending_invoices(
            candidate.party,
            candidate.site,
            exclude_invoice_id=candidate.id,
            upto_date=candidate.date,
            upto_id=candidate.id,
        )
        candidate_amount = Decimal(candidate.amount)
        if not open_invoices or _total_pending(open_invoices) < candidate_amount:
            continue

        with transaction.atomic():
            touched, remaining = _apply_receipt_amount(
                open_invoices,
                candidate_amount,
                receipt.date,
                RECEIPT_STYLE_ENTRY_NOTE,
                receipt.reference_number,
                receipt.payment_mode,
                receipt.sender_name,
                receipt.receiver_name,
                receipt.cheque_number,
            )
            if remaining > 0 or not touched:
                continue

            candidate.delete()
