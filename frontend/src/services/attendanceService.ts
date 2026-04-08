import { createCrudService } from "./crudService";
import type { Attendance, AttendanceFormValues } from "../types/erp.types";

export const attendanceService = createCrudService<
  Attendance,
  AttendanceFormValues
>("/labour/attendance/");
