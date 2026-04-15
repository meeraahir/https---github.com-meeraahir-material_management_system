export const attendanceUpdatedEventName = "erp:attendance-updated";

export interface AttendanceUpdatedDetail {
  date: string;
  labourIds: number[];
  siteId: number;
}

export function emitAttendanceUpdated(detail: AttendanceUpdatedDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AttendanceUpdatedDetail>(attendanceUpdatedEventName, {
      detail,
    }),
  );
}
