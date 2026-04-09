from datetime import date, datetime
from decimal import Decimal
from html import escape
from io import BytesIO

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _format_header(value):
    return str(value).replace('_', ' ').title()


def _format_value(value):
    if value is None or value == '':
        return '-'
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return format(value, 'f')
    return str(value)


def _paragraph(text, style):
    return Paragraph(escape(text), style)


def _column_widths(headers, rows, available_width):
    sample_rows = rows[:25]
    weights = []
    for header in headers:
        values = [_format_header(header)]
        values.extend(_format_value(row.get(header, '')) for row in sample_rows)
        max_len = max(min(len(value), 30) for value in values)
        weights.append(max(max_len, 8))

    total_weight = sum(weights) or len(headers) or 1
    return [(available_width * weight) / total_weight for weight in weights]


def _build_table(rows, headers, doc_width, styles):
    header_style = styles['table_header']
    cell_style = styles['table_cell']

    table_data = [
        [_paragraph(_format_header(header), header_style) for header in headers]
    ]
    for row in rows:
        table_data.append([
            _paragraph(_format_value(row.get(header, '')), cell_style)
            for header in headers
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
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return table


def build_pdf_response(filename_base, title, rows, headers=None, empty_message='No data available'):
    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(letter),
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
            fontSize=8,
            leading=10,
            textColor=colors.white,
        ),
        'table_cell': ParagraphStyle(
            'TableCell',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=colors.black,
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
        if headers is None:
            headers = list(rows[0].keys())
        story.append(_build_table(rows, headers, doc.width, styles))
    else:
        story.append(_paragraph(empty_message, styles['note']))

    doc.build(story)
    output.seek(0)

    response = HttpResponse(output.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename_base}.pdf"'
    return response


def build_pdf_sections_response(filename_base, title, summary_rows=None, sections=None):
    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(letter),
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
            fontSize=8,
            leading=10,
            textColor=colors.white,
        ),
        'table_cell': ParagraphStyle(
            'TableCell',
            parent=stylesheet['BodyText'],
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=colors.black,
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
