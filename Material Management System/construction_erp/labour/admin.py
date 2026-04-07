from django.contrib import admin
from .models import Labour, LabourAttendance, LabourPayment

# Register your models here.
admin.site.register(Labour)
admin.site.register(LabourAttendance)
admin.site.register(LabourPayment)
