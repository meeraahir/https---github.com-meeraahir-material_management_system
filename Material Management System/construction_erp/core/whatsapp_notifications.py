import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings

try:
    from twilio.base.exceptions import TwilioException
    from twilio.rest import Client
except ImportError:  # pragma: no cover - handled at runtime
    TwilioException = Exception
    Client = None


logger = logging.getLogger(__name__)


def _to_decimal(value):
    try:
        return Decimal(value)
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _format_amount(value):
    return f"{_to_decimal(value):.2f}"


def _normalize_whatsapp_number(number):
    value = (number or "").strip()
    if not value:
        return ""
    if value.startswith("whatsapp:"):
        return value
    if value.startswith("+"):
        return f"whatsapp:{value}"
    default_country_code = str(getattr(settings, "WHATSAPP_DEFAULT_COUNTRY_CODE", "91")).strip()
    if value.isdigit() and len(value) == 10 and default_country_code:
        return f"whatsapp:+{default_country_code}{value}"
    return f"whatsapp:+{value}"


def send_payment_whatsapp_notification(
    *,
    payment_type,
    sender_name,
    receiver_name,
    amount,
    total_amount=None,
    phase_name=None,
    party_name=None,
    vendor_name=None,
    to_number=None,
    pending_amount=None,
    next_payment_date=None,
    payment_action="processed",
):
    if not getattr(settings, "WHATSAPP_NOTIFICATIONS_ENABLED", False):
        return None

    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "").strip()
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "").strip()
    from_number = _normalize_whatsapp_number(getattr(settings, "WHATSAPP_FROM_NUMBER", "").strip())
    target_number = _normalize_whatsapp_number(to_number) or _normalize_whatsapp_number(
        getattr(settings, "WHATSAPP_TO_NUMBER", "").strip()
    )
    if Client is None:
        logger.warning("Twilio SDK is not installed. WhatsApp notification skipped.")
        return None

    if not all([account_sid, auth_token, from_number, target_number]):
        logger.warning("Twilio WhatsApp settings are incomplete. Notification skipped.")
        return None

    next_payment_value = str(next_payment_date) if next_payment_date else "Not Scheduled"
    pending_value = _format_amount(pending_amount if pending_amount is not None else Decimal("0"))
    total_value = _format_amount(total_amount if total_amount is not None else Decimal("0"))
    message_payload = {
        "from_": from_number,
        "to": target_number,
    }
    party_label = party_name or "-"
    vendor_label = vendor_name or "-"
    phase_label = phase_name or "-"
    message_payload["body"] = (
        f"Payment Update\n"
        f"Type: {payment_type}\n"
        f"Party Name: {party_label}\n"
        f"Vendor Name: {vendor_label}\n"
        f"Phase: {phase_label}\n"
        f"Total Amount: {total_value}\n"
        f"Amount {payment_action.title()}: {_format_amount(amount)}\n"
        f"Pending Amount: {pending_value}\n"
        f"Next Payment Date: {next_payment_value}\n"
        f"Sender: {sender_name or '-'}\n"
        f"Receiver: {receiver_name or '-'}"
    )

    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(**message_payload)
        logger.info("WhatsApp payment notification sent: %s", message.sid)
        return message.sid
    except TwilioException:
        logger.exception("Failed to send WhatsApp payment notification via Twilio.")
    except Exception:
        logger.exception("Unexpected error while sending WhatsApp payment notification.")
    return None
