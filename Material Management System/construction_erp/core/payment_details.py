PAYMENT_MODE_CASH = 'cash'
PAYMENT_MODE_CHECK = 'check'
PAYMENT_MODE_BANK_TRANSFER = 'bank_transfer'
PAYMENT_MODE_UPI = 'upi'
PAYMENT_MODE_OTHER = 'other'

PAYMENT_MODE_CHOICES = (
    (PAYMENT_MODE_CASH, 'Cash'),
    (PAYMENT_MODE_CHECK, 'Check'),
    (PAYMENT_MODE_BANK_TRANSFER, 'Bank Transfer'),
    (PAYMENT_MODE_UPI, 'UPI'),
    (PAYMENT_MODE_OTHER, 'Other'),
)


def normalize_optional_text(value):
    if value is None:
        return None

    value = str(value).strip()
    return value or None


def validate_payment_details(
    *,
    payment_mode,
    sender_name=None,
    receiver_name=None,
    cheque_number=None,
    default_sender_name=None,
    default_receiver_name=None,
):
    sender_name = normalize_optional_text(sender_name) or normalize_optional_text(default_sender_name)
    receiver_name = normalize_optional_text(receiver_name) or normalize_optional_text(default_receiver_name)
    cheque_number = normalize_optional_text(cheque_number)

    errors = {}
    if payment_mode == PAYMENT_MODE_CASH and not (sender_name or receiver_name):
        errors['sender_name'] = 'Sender name or receiver name is required for cash payments.'

    if payment_mode == PAYMENT_MODE_CHECK and not cheque_number:
        errors['cheque_number'] = 'Cheque number is required when payment mode is check.'

    return {
        'sender_name': sender_name,
        'receiver_name': receiver_name,
        'cheque_number': cheque_number,
        'errors': errors,
    }
