import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { sitesService } from "../../services/sitesService";
import type { Site, SiteFormValues } from "../../types/erp.types";

const siteSchema = z.object({
  description: z.string(),
  location: z.string().trim().min(1, "Location is required."),
  name: z.string().trim().min(1, "Site name is required."),
});

export function SitesPage() {
  const { user } = useAuth();

  return (
    <CrudModulePage<Site, SiteFormValues>
      canManage={user?.role === "admin"}
      columns={[
        { key: "name", header: "Name", accessor: (row) => row.name, sortValue: (row) => row.name },
        { key: "location", header: "Location", accessor: (row) => row.location, sortValue: (row) => row.location },
        { key: "description", header: "Description", accessor: (row) => row.description || "-" },
      ]}
      createLabel="Create Site"
      defaultValues={{ description: "", location: "", name: "" }}
      description="Manage all construction sites linked to operational records."
      emptyDescription="No sites have been created yet."
      emptyTitle="No sites found"
      fields={[
        { kind: "text", label: "Site Name", name: "name", placeholder: "Enter site name" },
        { kind: "text", label: "Location", name: "location", placeholder: "Enter location" },
        { kind: "textarea", label: "Description", name: "description", placeholder: "Optional notes" },
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
    />
  );
}
