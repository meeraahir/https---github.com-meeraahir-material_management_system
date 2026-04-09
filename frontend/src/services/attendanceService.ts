import type { AxiosResponse } from "axios";

import { apiClient } from "../api/client";
import { createCrudService } from "./crudService";
import type {
  Attendance,
  AttendanceFormValues,
  DateRangeFilters,
  PaginatedResponse,
} from "../types/erp.types";
import { ensurePaginatedResponse } from "../utils/pagination";

export const attendanceService = createCrudService<
  Attendance,
  AttendanceFormValues
>("/labour/attendance/");

export const attendanceReportsService = {
  async getLabourAttendance(labourId: number, filters?: DateRangeFilters) {
    const collected: Attendance[] = [];
    let nextUrl: string | null = "/labour/attendance/";
    let isFirstRequest = true;

    while (nextUrl) {
      const response: AxiosResponse<PaginatedResponse<Attendance>> = await apiClient.get(nextUrl, {
        params: isFirstRequest
          ? {
              labour: labourId,
              page: 1,
            }
          : undefined,
      });
      const payload: PaginatedResponse<Attendance> = ensurePaginatedResponse(response.data);
      collected.push(
        ...payload.results.filter((row: Attendance) => row.labour === labourId),
      );
      nextUrl = payload.next;
      isFirstRequest = false;
    }

    return collected.filter((row) => {
      if (filters?.dateFrom && row.date < filters.dateFrom) {
        return false;
      }

      if (filters?.dateTo && row.date > filters.dateTo) {
        return false;
      }

      return true;
    });
  },
};
