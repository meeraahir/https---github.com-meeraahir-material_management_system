from decimal import Decimal

from django.db.models import Count, Sum
from rest_framework import serializers

from finance.models import (
    ClientReceipt,
    MiscellaneousExpense,
    OwnerPayout,
    PAYMENT_MODE_BANK_TRANSFER,
    PAYMENT_MODE_CASH,
    PAYMENT_MODE_CHECK,
    PAYMENT_MODE_OTHER,
    PAYMENT_MODE_UPI,
    Transaction,
)
from labour.models import CasualLabourEntry, LabourAttendance, LabourPayment, LabourPaymentEntry
from sites.models import Site
from vendors.models import VendorPayment, VendorTransaction


class PersonalAdminDashboardSerializer(serializers.Serializer):
    PAYMENT_MODES = (
        PAYMENT_MODE_CASH,
        PAYMENT_MODE_CHECK,
        PAYMENT_MODE_BANK_TRANSFER,
        PAYMENT_MODE_UPI,
        PAYMENT_MODE_OTHER,
    )

    def _selected_date(self):
        return self.context['selected_date']

    def _as_decimal(self, value):
        if value is None:
            return Decimal('0')
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))

    def _mode_totals(self, queryset):
        totals = {mode: Decimal('0') for mode in self.PAYMENT_MODES}
        for item in queryset.values('payment_mode').annotate(total=Sum('amount')):
            totals[item['payment_mode']] = self._as_decimal(item['total'])
        return totals

    def _mode_totals_by_site(self, queryset):
        totals = {}
        for item in queryset.values('site_id', 'payment_mode').annotate(total=Sum('amount')):
            site_totals = totals.setdefault(
                item['site_id'],
                {mode: Decimal('0') for mode in self.PAYMENT_MODES},
            )
            site_totals[item['payment_mode']] = self._as_decimal(item['total'])
        return totals

    def to_representation(self, instance):
        selected_date = self._selected_date()

        receipts_queryset = ClientReceipt.objects.all()
        transactions_queryset = Transaction.objects.all()
        miscellaneous_expenses_queryset = MiscellaneousExpense.objects.all()

        total_receivables = self._as_decimal(transactions_queryset.aggregate(total=Sum('amount'))['total'])
        total_received = self._as_decimal(receipts_queryset.aggregate(total=Sum('amount'))['total'])
        pending_receivables = total_receivables - total_received

        total_vendor_paid = self._as_decimal(VendorPayment.objects.aggregate(total=Sum('amount'))['total'])
        total_vendor_pending = self._as_decimal(
            VendorTransaction.objects.aggregate(total=Sum('total_amount') - Sum('paid_amount'))['total']
        )

        total_employee_paid = self._as_decimal(LabourPaymentEntry.objects.aggregate(total=Sum('amount'))['total'])
        total_employee_pending = self._as_decimal(
            LabourPayment.objects.aggregate(total=Sum('total_amount') - Sum('paid_amount'))['total']
        )
        total_miscellaneous_expense = self._as_decimal(
            miscellaneous_expenses_queryset.aggregate(total=Sum('amount'))['total']
        )

        receipt_mode_totals = self._mode_totals(receipts_queryset)
        selected_date_receipt_mode_totals = self._mode_totals(receipts_queryset.filter(date=selected_date))

        employee_paid_on_selected_date = self._as_decimal(
            LabourPaymentEntry.objects.filter(date=selected_date).aggregate(total=Sum('amount'))['total']
        )
        vendor_paid_on_selected_date = self._as_decimal(
            VendorPayment.objects.filter(date=selected_date).aggregate(total=Sum('amount'))['total']
        )
        miscellaneous_expense_on_selected_date = self._as_decimal(
            miscellaneous_expenses_queryset.filter(date=selected_date).aggregate(total=Sum('amount'))['total']
        )

        working_sites = LabourAttendance.objects.filter(
            date=selected_date,
            present=True,
        ).values('site_id').distinct().count()

        attendance_map = {
            item['site_id']: int(item['present_workers'] or 0)
            for item in LabourAttendance.objects.filter(date=selected_date, present=True)
            .values('site_id')
            .annotate(present_workers=Count('id'))
        }
        receipt_map = {
            item['site_id']: self._as_decimal(item['total'])
            for item in receipts_queryset.values('site_id').annotate(total=Sum('amount'))
        }
        invoice_map = {
            item['site_id']: self._as_decimal(item['total'])
            for item in transactions_queryset.values('site_id').annotate(total=Sum('amount'))
        }
        vendor_paid_map = {
            item['site_id']: self._as_decimal(item['total'])
            for item in VendorPayment.objects.values('site_id').annotate(total=Sum('amount'))
        }
        employee_paid_map = {
            item['site_id']: self._as_decimal(item['total'])
            for item in LabourPaymentEntry.objects.values('site_id').annotate(total=Sum('amount'))
        }

        labour_balance_map = {}
        for item in LabourPayment.objects.values('site_id').annotate(
            total_amount_sum=Sum('total_amount'),
            paid_amount_sum=Sum('paid_amount'),
        ):
            labour_balance_map[item['site_id']] = (
                self._as_decimal(item['total_amount_sum']) - self._as_decimal(item['paid_amount_sum'])
            )
        miscellaneous_expense_map = {
            item['site_id']: self._as_decimal(item['total'])
            for item in miscellaneous_expenses_queryset.values('site_id').annotate(total=Sum('amount'))
        }
        receipt_mode_site_map = self._mode_totals_by_site(receipts_queryset)

        site_overview = []
        for site in Site.objects.order_by('name'):
            total_receivable = invoice_map.get(site.id, Decimal('0'))
            total_received_for_site = receipt_map.get(site.id, Decimal('0'))
            site_receipt_modes = receipt_mode_site_map.get(
                site.id,
                {mode: Decimal('0') for mode in self.PAYMENT_MODES},
            )
            site_overview.append({
                'site_id': site.id,
                'site_name': site.name,
                'location': site.location,
                'is_currently_working': site.id in attendance_map,
                'present_workers_on_selected_date': attendance_map.get(site.id, 0),
                'total_receivable': total_receivable,
                'received_amount': total_received_for_site,
                'pending_amount': total_receivable - total_received_for_site,
                'cash_received_amount': site_receipt_modes[PAYMENT_MODE_CASH],
                'check_received_amount': site_receipt_modes[PAYMENT_MODE_CHECK],
                'bank_transfer_received_amount': site_receipt_modes[PAYMENT_MODE_BANK_TRANSFER],
                'upi_received_amount': site_receipt_modes[PAYMENT_MODE_UPI],
                'other_received_amount': site_receipt_modes[PAYMENT_MODE_OTHER],
                'vendor_paid_amount': vendor_paid_map.get(site.id, Decimal('0')),
                'employee_paid_amount': employee_paid_map.get(site.id, Decimal('0')),
                'employee_pending_amount': labour_balance_map.get(site.id, Decimal('0')),
                'miscellaneous_expense_amount': miscellaneous_expense_map.get(site.id, Decimal('0')),
            })

        receipt_party_map = {
            item['party_id']: self._as_decimal(item['total'])
            for item in receipts_queryset.values('party_id').annotate(total=Sum('amount'))
        }
        party_receivables = []
        for item in (
            transactions_queryset.values('party_id', 'party__name')
            .annotate(total_amount=Sum('amount'))
            .order_by('party__name')
        ):
            total_amount = self._as_decimal(item['total_amount'])
            received_amount = receipt_party_map.get(item['party_id'], Decimal('0'))
            party_receivables.append({
                'party_id': item['party_id'],
                'party_name': item['party__name'],
                'total_receivable': total_amount,
                'received_amount': received_amount,
                'pending_amount': total_amount - received_amount,
            })

        employee_payments_on_selected_date = [
            {
                'payment_entry_id': entry.id,
                'labour_id': entry.labour_id,
                'labour_name': entry.labour.name,
                'site_id': entry.site_id,
                'site_name': entry.site.name if entry.site else None,
                'amount': entry.amount,
                'date': entry.date,
                'notes': entry.notes,
            }
            for entry in LabourPaymentEntry.objects.filter(date=selected_date)
            .select_related('labour', 'site')
            .order_by('id')
        ]

        miscellaneous_expenses_on_selected_date = [
            {
                'expense_id': expense.id,
                'title': expense.title,
                'site_id': expense.site_id,
                'site_name': expense.site.name if expense.site else None,
                'labour_id': expense.labour_id,
                'labour_name': expense.labour.name if expense.labour else None,
                'paid_to_name': expense.paid_to_name,
                'amount': expense.amount,
                'payment_mode': expense.payment_mode,
                'date': expense.date,
                'notes': expense.notes,
            }
            for expense in miscellaneous_expenses_queryset.filter(date=selected_date)
            .select_related('site', 'labour')
            .order_by('-id')
        ]

        recent_receipts = [
            {
                'receipt_id': receipt.id,
                'party_id': receipt.party_id,
                'party_name': receipt.party.name,
                'site_id': receipt.site_id,
                'site_name': receipt.site.name,
                'amount': receipt.amount,
                'payment_mode': receipt.payment_mode,
                'sender_name': receipt.sender_name,
                'receiver_name': receipt.receiver_name,
                'cheque_number': receipt.cheque_number,
                'date': receipt.date,
                'reference_number': receipt.reference_number,
            }
            for receipt in receipts_queryset.select_related('party', 'site').order_by('-date', '-id')[:10]
        ]

        recent_vendor_payments = [
            {
                'payment_id': payment.id,
                'vendor_id': payment.vendor_id,
                'vendor_name': payment.vendor.name,
                'site_id': payment.site_id,
                'site_name': payment.site.name,
                'amount': payment.amount,
                'payment_mode': payment.payment_mode,
                'sender_name': payment.sender_name,
                'receiver_name': payment.receiver_name,
                'cheque_number': payment.cheque_number,
                'date': payment.date,
                'reference_number': payment.reference_number,
            }
            for payment in VendorPayment.objects.select_related('vendor', 'site').order_by('-date', '-id')[:10]
        ]

        recent_employee_payments = [
            {
                'payment_entry_id': payment.id,
                'labour_id': payment.labour_id,
                'labour_name': payment.labour.name,
                'site_id': payment.site_id,
                'site_name': payment.site.name if payment.site else None,
                'amount': payment.amount,
                'date': payment.date,
                'notes': payment.notes,
            }
            for payment in LabourPaymentEntry.objects.select_related('labour', 'site').order_by('-date', '-id')[:10]
        ]

        recent_miscellaneous_expenses = [
            {
                'expense_id': expense.id,
                'title': expense.title,
                'site_id': expense.site_id,
                'site_name': expense.site.name if expense.site else None,
                'labour_id': expense.labour_id,
                'labour_name': expense.labour.name if expense.labour else None,
                'paid_to_name': expense.paid_to_name,
                'amount': expense.amount,
                'payment_mode': expense.payment_mode,
                'date': expense.date,
                'notes': expense.notes,
            }
            for expense in miscellaneous_expenses_queryset.select_related('site', 'labour').order_by('-date', '-id')[:10]
        ]

        user = self.context['request'].user
        return {
            'user_id': user.id,
            'user_name': user.get_full_name() or user.username,
            'title': 'Personal Admin Dashboard',
            'selected_date': selected_date,
            'summary': {
                'total_sites': Site.objects.count(),
                'currently_working_sites': working_sites,
                'receivable_from_parties': total_receivables,
                'payment_received': total_received,
                'payment_pending': pending_receivables,
                'vendor_payment_paid': total_vendor_paid,
                'vendor_payment_pending': total_vendor_pending,
                'employee_payment_paid': total_employee_paid,
                'employee_payment_pending': total_employee_pending,
                'miscellaneous_expense_paid': total_miscellaneous_expense,
                'cash_receipts': receipt_mode_totals[PAYMENT_MODE_CASH],
                'check_receipts': receipt_mode_totals[PAYMENT_MODE_CHECK],
                'bank_transfer_receipts': receipt_mode_totals[PAYMENT_MODE_BANK_TRANSFER],
                'upi_receipts': receipt_mode_totals[PAYMENT_MODE_UPI],
                'other_receipts': receipt_mode_totals[PAYMENT_MODE_OTHER],
                'cash_receipts_on_selected_date': selected_date_receipt_mode_totals[PAYMENT_MODE_CASH],
                'check_receipts_on_selected_date': selected_date_receipt_mode_totals[PAYMENT_MODE_CHECK],
                'receipt_payment_mode_breakdown': receipt_mode_totals,
                'total_cash_payment': total_vendor_paid + total_employee_paid + total_miscellaneous_expense,
                'total_outgoing_payment': total_vendor_paid + total_employee_paid + total_miscellaneous_expense,
                'cash_payment_on_selected_date': (
                    vendor_paid_on_selected_date
                    + employee_paid_on_selected_date
                    + miscellaneous_expense_on_selected_date
                ),
                'outgoing_payment_on_selected_date': (
                    vendor_paid_on_selected_date
                    + employee_paid_on_selected_date
                    + miscellaneous_expense_on_selected_date
                ),
                'employee_payment_on_selected_date': employee_paid_on_selected_date,
                'miscellaneous_expense_on_selected_date': miscellaneous_expense_on_selected_date,
            },
            'site_overview': site_overview,
            'party_receivables': party_receivables,
            'employee_payments_on_selected_date': employee_payments_on_selected_date,
            'miscellaneous_expenses_on_selected_date': miscellaneous_expenses_on_selected_date,
            'recent_receipts': recent_receipts,
            'recent_vendor_payments': recent_vendor_payments,
            'recent_employee_payments': recent_employee_payments,
            'recent_miscellaneous_expenses': recent_miscellaneous_expenses,
        }


class OwnerDashboardSerializer(PersonalAdminDashboardSerializer):
    def _sum_by_site(self, queryset, amount_field='amount'):
        return {
            item['site_id']: self._as_decimal(item['total'])
            for item in queryset.values('site_id').annotate(total=Sum(amount_field))
            if item['site_id'] is not None
        }

    def to_representation(self, instance):
        selected_date = self._selected_date()
        user = self.context['request'].user

        total_sites = Site.objects.count()
        active_site_ids = set(
            LabourAttendance.objects.filter(date=selected_date, present=True)
            .values_list('site_id', flat=True)
            .distinct()
        )

        total_client_invoiced = self._as_decimal(Transaction.objects.aggregate(total=Sum('amount'))['total'])
        total_client_received = self._as_decimal(ClientReceipt.objects.aggregate(total=Sum('amount'))['total'])
        client_pending = total_client_invoiced - total_client_received

        total_vendor_invoiced = self._as_decimal(VendorTransaction.objects.aggregate(total=Sum('total_amount'))['total'])
        total_vendor_paid = self._as_decimal(VendorPayment.objects.aggregate(total=Sum('amount'))['total'])
        vendor_pending = total_vendor_invoiced - total_vendor_paid

        total_employee_payable = self._as_decimal(LabourPayment.objects.aggregate(total=Sum('total_amount'))['total'])
        total_employee_paid = self._as_decimal(LabourPaymentEntry.objects.aggregate(total=Sum('amount'))['total'])
        employee_pending = total_employee_payable - total_employee_paid

        total_cash_received = self._as_decimal(
            ClientReceipt.objects.filter(payment_mode=PAYMENT_MODE_CASH).aggregate(total=Sum('amount'))['total']
        )
        cash_paid_to_vendors = self._as_decimal(
            VendorPayment.objects.filter(payment_mode=PAYMENT_MODE_CASH).aggregate(total=Sum('amount'))['total']
        )
        cash_paid_to_employees = total_employee_paid
        cash_paid_to_casual_labour = self._as_decimal(
            CasualLabourEntry.objects.aggregate(total=Sum('paid_amount'))['total']
        )
        cash_paid_for_miscellaneous_expenses = self._as_decimal(
            MiscellaneousExpense.objects.filter(payment_mode=PAYMENT_MODE_CASH).aggregate(total=Sum('amount'))['total']
        )
        cash_paid_for_owner_payments = self._as_decimal(
            OwnerPayout.objects.filter(payment_mode=PAYMENT_MODE_CASH).aggregate(total=Sum('amount'))['total']
        )
        total_cash_outflow = (
            cash_paid_to_vendors
            + cash_paid_to_employees
            + cash_paid_to_casual_labour
            + cash_paid_for_miscellaneous_expenses
            + cash_paid_for_owner_payments
        )
        cash_available = total_cash_received - total_cash_outflow

        client_invoiced_by_site = self._sum_by_site(Transaction.objects.all())
        client_received_by_site = self._sum_by_site(ClientReceipt.objects.all())
        vendor_invoiced_by_site = self._sum_by_site(VendorTransaction.objects.all(), amount_field='total_amount')
        vendor_paid_by_site = self._sum_by_site(VendorPayment.objects.all())
        employee_payable_by_site = self._sum_by_site(LabourPayment.objects.exclude(site_id__isnull=True), amount_field='total_amount')
        employee_paid_by_site = self._sum_by_site(LabourPaymentEntry.objects.exclude(site_id__isnull=True))

        site_overview = [
            {
                'site_id': site.id,
                'site_name': site.name,
                'location': site.location,
                'is_active': site.id in active_site_ids,
                'payment_pending_from_clients': (
                    client_invoiced_by_site.get(site.id, Decimal('0'))
                    - client_received_by_site.get(site.id, Decimal('0'))
                ),
                'payment_pending_to_vendors': (
                    vendor_invoiced_by_site.get(site.id, Decimal('0'))
                    - vendor_paid_by_site.get(site.id, Decimal('0'))
                ),
                'payment_pending_to_employees': (
                    employee_payable_by_site.get(site.id, Decimal('0'))
                    - employee_paid_by_site.get(site.id, Decimal('0'))
                ),
            }
            for site in Site.objects.order_by('name')
        ]

        notifications = []
        if cash_available < 0:
            notifications.append({
                'type': 'negative_cash_balance',
                'severity': 'high',
                'message': f'Your cash balance is {cash_available:.2f}.',
                'cash_available': cash_available,
            })

        return {
            'user_id': user.id,
            'user_name': user.get_full_name() or user.username,
            'title': 'Owner Dashboard',
            'site_activity_date': selected_date,
            'summary': {
                'total_sites': total_sites,
                'active_sites': len(active_site_ids),
                'inactive_sites': total_sites - len(active_site_ids),
                'payment_pending_from_clients': client_pending,
                'payment_pending_to_vendors': vendor_pending,
                'payment_pending_to_employees': employee_pending,
                'total_cash_received': total_cash_received,
                'cash_paid_to_vendors': cash_paid_to_vendors,
                'cash_paid_to_employees': cash_paid_to_employees,
                'cash_paid_to_casual_labour': cash_paid_to_casual_labour,
                'cash_paid_for_miscellaneous_expenses': cash_paid_for_miscellaneous_expenses,
                'cash_paid_for_owner_payments': cash_paid_for_owner_payments,
                'total_cash_outflow': total_cash_outflow,
                'cash_available': cash_available,
                'has_negative_cash_balance': cash_available < 0,
            },
            'notifications': notifications,
            'site_overview': site_overview,
        }
