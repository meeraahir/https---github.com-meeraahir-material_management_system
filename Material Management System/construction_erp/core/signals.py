from django.db.models.signals import post_save
from django.dispatch import receiver

from finance.models import ClientReceipt, OwnerPayout
from vendors.models import VendorPayment

from .whatsapp_notifications import send_payment_whatsapp_notification


@receiver(post_save, sender=ClientReceipt)
def notify_client_receipt(sender, instance, created, **kwargs):
    if not created:
        return

    invoice = instance.invoice if instance.invoice_id else None
    pending_amount = invoice.pending_amount() if invoice else None
    send_payment_whatsapp_notification(
        payment_type="Client Receipt",
        sender_name=instance.sender_name or (instance.party.name if instance.party_id else None),
        receiver_name=instance.receiver_name,
        amount=instance.amount,
        total_amount=invoice.amount if invoice else None,
        phase_name=invoice.phase_name if invoice else None,
        party_name=instance.party.name if instance.party_id else None,
        to_number=instance.party.contact if instance.party_id else None,
        pending_amount=pending_amount,
        payment_action="received",
    )


@receiver(post_save, sender=VendorPayment)
def notify_vendor_payment(sender, instance, created, **kwargs):
    if not created:
        return

    purchase = instance.purchase if instance.purchase_id else None
    pending_amount = None
    if purchase:
        pending_amount = purchase.total_amount - purchase.payments_total()
    send_payment_whatsapp_notification(
        payment_type="Vendor Payment",
        sender_name=instance.sender_name,
        receiver_name=instance.receiver_name or (instance.vendor.name if instance.vendor_id else None),
        amount=instance.amount,
        total_amount=purchase.total_amount if purchase else None,
        vendor_name=instance.vendor.name if instance.vendor_id else None,
        to_number=instance.vendor.phone if instance.vendor_id else None,
        pending_amount=pending_amount,
        payment_action="paid",
    )


@receiver(post_save, sender=OwnerPayout)
def notify_owner_payout(sender, instance, created, **kwargs):
    if not created:
        return

    send_payment_whatsapp_notification(
        payment_type="Owner Payout",
        sender_name=instance.sender_name,
        receiver_name=instance.receiver_name,
        amount=instance.amount,
        payment_action="paid",
    )
