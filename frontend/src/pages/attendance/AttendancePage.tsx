import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { useReferenceData } from "../../hooks/useReferenceData";
import { attendanceService } from "../../services/attendanceService";
import type { Attendance, AttendanceFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const today = new Date().toISOString().slice(0, 10);

const attendanceSchema = z
  .object({
    date: z
      .string()
      .min(1, "Date is required.")
      .refine((value) => value <= today, "Future dates are not allowed."),
    labour: z.number().min(1, "Labour is required."),
    present: z.boolean(),
    site: z.number().min(1, "Site is required."),
  });

export function AttendancePage() {
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);
  const labourNameMap = new Map(
    references.labour.map((labour) => [labour.id, labour.name]),
  );
  const siteNameMap = new Map(references.sites.map((site) => [site.id, site.name]));

  return (
    <CrudModulePage<Attendance, AttendanceFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        {
          key: "labour",
          header: "Labour",
          accessor: (row) => row.labour_name || labourNameMap.get(row.labour) || row.labour,
          sortValue: (row) => row.labour_name || labourNameMap.get(row.labour) || row.labour,
        },
        {
          key: "site",
          header: "Site",
          accessor: (row) => row.site_name || siteNameMap.get(row.site) || row.site,
          sortValue: (row) => row.site_name || siteNameMap.get(row.site) || row.site,
        },
        { key: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
        { key: "present", header: "Present", accessor: (row) => (row.present ? "Yes" : "No"), sortValue: (row) => row.present },
      ]}
      createLabel="Mark Attendance"
      defaultValues={{
        date: new Date().toISOString().slice(0, 10),
        labour: 0,
        present: true,
        site: 0,
      }}
      description="Maintain daily labour attendance across active sites."
      emptyDescription="No attendance records are available."
      emptyTitle="No attendance found"
      externalError={references.error}
      fields={[
        {
          kind: "select",
          label: "Labour",
          name: "labour",
          options: references.labour.map((labour) => ({ label: labour.name, value: labour.id })),
          required: true,
          valueType: "number",
        },
        {
          kind: "select",
          label: "Site",
          name: "site",
          options: references.sites.map((site) => ({ label: site.name, value: site.id })),
          required: true,
          valueType: "number",
        },
        { kind: "date", label: "Date", max: today, name: "date", required: true },
        { kind: "checkbox", label: "Present", name: "present" },
      ]}
      getEditValues={(entity) => ({
        date: entity.date,
        labour: entity.labour,
        present: entity.present,
        site: entity.site,
      })}
      getId={(entity) => entity.id}
      schema={attendanceSchema}
      searchPlaceholder="Search attendance by labour or site"
      service={attendanceService}
      title="Attendance"
    />
  );
}
