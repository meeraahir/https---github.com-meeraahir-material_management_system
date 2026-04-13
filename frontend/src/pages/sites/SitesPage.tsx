import { z } from "zod";
import { useNavigate } from "react-router-dom";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { sitesService } from "../../services/sitesService";
import type { Site, SiteFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const siteSchema = z.object({
  description: z.string().max(300, "Description must be 300 characters or fewer."),
  location: z
    .string()
    .trim()
    .min(2, "Location must be at least 2 characters.")
    .max(120, "Location must be 120 characters or fewer."),
  name: z
    .string()
    .trim()
    .min(2, "Site name must be at least 2 characters.")
    .max(100, "Site name must be 100 characters or fewer."),
});

export function SitesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<Site, SiteFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        { key: "name", header: "Name", accessor: (row) => row.name, sortValue: (row) => row.name },
        { key: "location", header: "Location", accessor: (row) => row.location, sortValue: (row) => row.location },
        { key: "description", header: "Description", accessor: (row) => row.description || "-" },
      ]}
      createLabel="Add Site"
      defaultValues={{ description: "", location: "", name: "" }}
      description="Manage all construction sites linked to operational records."
      emptyDescription="No sites have been created yet."
      emptyTitle="No sites found"
      extraActions={[
        {
          label: "Dashboard",
          onClick: (row: Site) => navigate(`/sites/${row.id}/dashboard`),
          variant: "secondary",
        },
      ]}
      fields={[
        {
          kind: "text",
          label: "Site Name",
          maxLength: 100,
          minLength: 2,
          name: "name",
          placeholder: "Enter site name",
          required: true,
        },
        {
          kind: "text",
          label: "Location",
          maxLength: 120,
          minLength: 2,
          name: "location",
          placeholder: "Enter location",
          required: true,
        },
        {
          kind: "textarea",
          label: "Description",
          name: "description",
          placeholder: "Optional notes about this site",
          rows: 5,
        },
      ]}
      getEditValues={(entity) => ({
        description: entity.description,
        location: entity.location,
        name: entity.name,
      })}
      getId={(entity) => entity.id}
      schema={siteSchema}
      searchPlaceholder="Search by site name or location"
      service={sitesService}
      title="Sites"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Site Name", value: (row) => row.name, highlight: true },
        { label: "Location", value: (row) => row.location },
        { label: "Description", value: (row) => row.description, span: "full" },
      ]}
    />
  );
}
