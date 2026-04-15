import type { AxiosResponse } from "axios";

import { apiClient } from "../api/client";
import type { CrudService } from "./crudService";
import { createCrudService } from "./crudService";
import type {
  Attendance,
  AttendanceFormValues,
  DateRangeFilters,
  PaginatedResponse,
} from "../types/erp.types";
import { ensurePaginatedResponse } from "../utils/pagination";

type AttendanceService = CrudService<Attendance, AttendanceFormValues> & {
  getBySiteAndDate: (siteId: number, date: string) => Promise<Attendance[]>;
};

const attendanceCrudService = createCrudService<
  Attendance,
  AttendanceFormValues
>("/labour/attendance/");

async function fetchAllAttendance(params?: {
  date?: string;
  labour?: number;
  page?: number;
  present?: boolean;
  site?: number;
}) {
  const collected: Attendance[] = [];
  let nextUrl: string | null = "/labour/attendance/";
  let isFirstRequest = true;

  while (nextUrl) {
    const response: AxiosResponse<PaginatedResponse<Attendance>> = await apiClient.get(nextUrl, {
      params: isFirstRequest ? params : undefined,
    });
    const payload: PaginatedResponse<Attendance> = ensurePaginatedResponse(response.data);
    collected.push(...payload.results);
    nextUrl = payload.next;
    isFirstRequest = false;
  }

  return collected;
}

function sortAttendanceRows(rows: Attendance[]) {
  return [...rows].sort((left, right) => {
    const dateComparison = right.date.localeCompare(left.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return right.id - left.id;
  });
}

export const attendanceService: AttendanceService = {
  ...attendanceCrudService,
  async list(params) {
    const search = params?.search?.trim().toLowerCase() || "";
    const page = params?.page ?? 1;
    const pageSize = 10;
    const allRows = sortAttendanceRows(await fetchAllAttendance({ page: 1 }));
    const filteredRows = search
      ? allRows.filter((row) => {
          const labourName = row.labour_name?.toLowerCase() || "";
          const siteName = row.site_name?.toLowerCase() || "";
          return labourName.includes(search) || siteName.includes(search);
        })
      : allRows;
    const startIndex = (page - 1) * pageSize;

    return {
      count: filteredRows.length,
      next:
        startIndex + pageSize < filteredRows.length
          ? String(page + 1)
          : null,
      previous: page > 1 ? String(page - 1) : null,
      results: filteredRows.slice(startIndex, startIndex + pageSize),
    };
  },
  async getBySiteAndDate(siteId, date) {
    const collected = await fetchAllAttendance({
      date,
      page: 1,
      site: siteId,
    });

    return sortAttendanceRows(
      collected.filter(
        (row: Attendance) => row.site === siteId && row.date === date,
      ),
    );
  },
};

export const attendanceReportsService = {
  async getLabourAttendance(labourId: number, filters?: DateRangeFilters) {
    const collected = await fetchAllAttendance({
      labour: labourId,
      page: 1,
    });

    return sortAttendanceRows(collected).filter((row) => {
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
