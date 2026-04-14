from datetime import date, datetime


def format_export_date(value):
    if isinstance(value, datetime):
        value = value.date()

    if isinstance(value, date):
        return f'{value.day} {value.strftime("%B %Y")}'

    return value


def format_excel_export_value(value):
    if value is None or value == '':
        return ''

    return format_export_date(value)
