from datetime import date, datetime
from decimal import Decimal
from html import escape
from io import BytesIO

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import legal, landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .export_utils import format_export_date


def _format_header(value):
    return str(value).replace('_', ' ').title()


def _format_value(value):
    if value is None or value == '':
        return '-'
    if isinstance(value, date):
        return format_export_date(value)
    if isinstance(value, datetime):
        return format_export_date(value)
    if isinstance(value, Decimal):
        return format(value, 'f')
    return str(value)


def _paragraph(text, style):
    return Paragraph(escape(text), style)


def _table_layout(headers):
    header_count = len(headers)
    use_legal_landscape = header_count >= 10

    if header_count >= 13:
        return {
            'pagesize': landscape(legal) if use_legal_landscape else landscape(letter),
            'font_size': 6.5,
            'leading': 8,
            'padding': 3,
        }

    if header_count >= 10:
        return {
            'pagesize': landscape(legal),
            'font_size': 7,
            'leading': 9,
            'padding': 4,
        }

    return {
        'pagesize': landscape(letter),
        'font_size': 8,
        'leading': 10,
        'padding': 5,
    }


def _column_kind(header, rows):
    header_key = str(header).lower()
    sample_values = [
        row.get(header)
        for row in rows[:25]
        if row.get(header) not in (None, '')
    ]

    if (
        header_key == 'date'
        or header_key.endswith('date')
        or '_date' in header_key
        or header_key in {'week', 'month', 'month_start', 'period_start', 'period_end'}
        or any(isinstance(value, (date, datetime)) for value in sample_values)
    ):
        return 'date'

    if (
        any(token in header_key for token in (
            'amount',
            'balance',
            'cost',
            'credit',
            'debit',
            'paid',
            'pending',
            'price',
            'quantity',
            'received',
            'stock',
            'total',
            'used',
            'wage',
        ))
        or any(isinstance(value, (int, float, Decimal)) for value in sample_values)
    ):
        return 'numeric'

    return 'text'


def _column_weight(header, column_kind):
    header_key = str(header).lower()

    if header_key == 'notes':
        return 20
    if header_key in {'phase_name', 'status', 'reference_number'}:
        return 12
    if header_key in {'sender_name', 'receiver_name', 'payment_mode', 'cheque_number'}:
        return 11
    if header_key in {'entry_type', 'site'}:
        return 9
    if column_kind == 'numeric':
        return 14
    if column_kind == 'date':
        return 15
    return 8


def _column_widths(headers, rows, available_width):
    sample_rows = rows[:25]
    weights = []
    for header in headers:
        column_kind = _column_kind(header, sample_rows)
        values = [_format_header(header)]
        values.extend(_format_value(row.get(header, '')) for row in sample_rows)
        max_len = max(
            min(
                len(value),
                32 if column_kind == 'text' else 18,
            )
            for value in values
        )
        weights.append(max(max_len, _column_weight(header, column_kind)))

    total_weight = sum(weights) or len(headers) or 1
    return [(available_width * weight) / total_weight for weight in weights]


def _build_table(rows, headers, doc_width, styles):
    header_style = styles['table_header']
    cell_style = styles['table_cell']
    numeric_cell_style = styles['table_cell_numeric']
    date_cell_style = styles['table_cell_date']
    column_kinds = [_column_kind(header, rows) for header in headers]
    cell_padding = 3 if header_style.fontSize <= 7 else 4 if header_style.fontSize < 8 else 6

    table_data = [
        [
            _paragraph(
                _format_header(header),
                header_style,
            )
            for header in headers
        ]
    ]
    for row in rows:
        table_data.append([
            _paragraph(
                _format_value(row.get(header, '')),
                numeric_cell_style
                if column_kinds[index] == 'numeric'
                else date_cell_style
                if column_kinds[index] == 'date'
                else cell_style,
            )
            for index, header in enumerate(headers)
        ])

    table = Table(
        table_data,
        colWidths=_column_widths(headers, rows, doc_width),
        repeatRows=1,
    )
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E78')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('LEADING', (0, 0), (-1, -1), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor('#EAF1F8')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#9AA9B8')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), cell_padding),
        ('RIGHTPADDING', (0, 0), (-1, -1), cell_padding),
        ('TOPPADDING', (0, 0), (-1, -1), max(cell_padding - 1, 2)),
        ('BOTTOMPADDING', (0, 0), (-1, -1), max(cell_padding - 1, 2)),
    ]))
    return table


def build_pdf_response(filename_base, title, rows, headers=None, empty_message='No data available'):
    output = BytesIO()
    resolved_headers = headers or (list(rows[0].keys()) if rows else [])
    layout = _table_layout(resolved_headers)
    doc = SimpleDocTemplate(
        output,
        pagesize=layout['pagesize'],
        leftMargin=24,
        rightMargin=24,
        topMargin=28,
        bottomMargin=24,
    )

    stylesheet = getSampleStyleSheet()
    styles = {
        'title': ParagraphStyle(
            'ReportTitle',
            parent=stylesheet['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#15395B'),
            spaceAfter=12,
        ),
        'section': ParagraphStyle(
            'SectionTitle',
            parent=stylesheet['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#1F4E78'),
            spaceAfter=8,
            spaceBefore=8,
        ),
        'table_header': ParagraphStyle(
            'TableHeader',
            parent=stylesheet['BodyText'],
            fontName='Helvetica-Bold',
            fontSize=layout['font_size'],
            leading=layout['leading'],
            textColor=colors.white,
            splitLongWords=False,
        ),
        'table_cell': ParagraphStyle(
            'TableCell',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=layout['font_size'],
            leading=layout['leading'],
            textColor=colors.black,
            splitLongWords=False,
        ),
        'table_cell_numeric': ParagraphStyle(
            'TableCellNumeric',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=layout['font_size'],
            leading=layout['leading'],
            textColor=colors.black,
            alignment=2,
            splitLongWords=False,
        ),
        'table_cell_date': ParagraphStyle(
            'TableCellDate',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=layout['font_size'],
            leading=layout['leading'],
            textColor=colors.black,
            alignment=1,
            splitLongWords=False,
        ),
        'note': ParagraphStyle(
            'Note',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=10,
            leading=12,
            textColor=colors.HexColor('#555555'),
        ),
    }

    story = [_paragraph(title, styles['title'])]

    if rows:
        story.append(_build_table(rows, resolved_headers, doc.width, styles))
    else:
        story.append(_paragraph(empty_message, styles['note']))

    doc.build(story)
    output.seek(0)

    response = HttpResponse(output.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename_base}.pdf"'
    return response


def build_pdf_sections_response(filename_base, title, summary_rows=None, sections=None):
    output = BytesIO()
    section_headers = [
        section.get('headers') or list((section.get('rows') or [{}])[0].keys())
        for section in (sections or [])
        if section.get('rows')
    ]
    widest_headers = max(section_headers, key=len, default=['metric', 'value'])
    layout = _table_layout(widest_headers)
    doc = SimpleDocTemplate(
        output,
        pagesize=layout['pagesize'],
        leftMargin=24,
        rightMargin=24,
        topMargin=28,
        bottomMargin=24,
    )

    stylesheet = getSampleStyleSheet()
    styles = {
        'title': ParagraphStyle(
            'ReportTitle',
            parent=stylesheet['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#15395B'),
            spaceAfter=12,
        ),
        'section': ParagraphStyle(
            'SectionTitle',
            parent=stylesheet['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#1F4E78'),
            spaceAfter=8,
            spaceBefore=10,
        ),
        'table_header': ParagraphStyle(
            'TableHeader',
            parent=stylesheet['BodyText'],
            fontName='Helvetica-Bold',
            fontSize=layout['font_size'],
            leading=layout['leading'],
            textColor=colors.white,
            splitLongWords=False,
        ),
        'table_cell': ParagraphStyle(
            'TableCell',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=layout['font_size'],
            leading=layout['leading'],
            textColor=colors.black,
            splitLongWords=False,
        ),
        'table_cell_numeric': ParagraphStyle(
            'TableCellNumeric',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=layout['font_size'],
            leading=layout['leading'],
            textColor=colors.black,
            alignment=2,
            splitLongWords=False,
        ),
        'table_cell_date': ParagraphStyle(
            'TableCellDate',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=layout['font_size'],
            leading=layout['leading'],
            textColor=colors.black,
            alignment=1,
            splitLongWords=False,
        ),
        'note': ParagraphStyle(
            'Note',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=10,
            leading=12,
            textColor=colors.HexColor('#555555'),
        ),
    }

    story = [_paragraph(title, styles['title'])]

    if summary_rows:
        summary_table_rows = [{'metric': key, 'value': value} for key, value in summary_rows]
        story.append(_paragraph('Summary', styles['section']))
        story.append(_build_table(summary_table_rows, ['metric', 'value'], doc.width, styles))
        story.append(Spacer(1, 12))

    for index, section in enumerate(sections or []):
        rows = section.get('rows') or []
        story.append(_paragraph(section.get('title', 'Section'), styles['section']))
        if rows:
            headers = section.get('headers') or list(rows[0].keys())
            story.append(_build_table(rows, headers, doc.width, styles))
        else:
            story.append(_paragraph('No data available', styles['note']))

        if index < len(sections or []) - 1:
            story.append(Spacer(1, 12))
            if len(rows) > 12:
                story.append(PageBreak())

    doc.build(story)
    output.seek(0)

    response = HttpResponse(output.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename_base}.pdf"'
    return response
