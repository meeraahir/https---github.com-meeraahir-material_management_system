import { useNavigate } from "react-router-dom";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { sitesService } from "../../services/sitesService";
import type { Site, SiteFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";
import { siteDefaultValues, siteFormFields, siteSchema } from "./siteFormConfig";

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
      defaultValues={siteDefaultValues}
      description=""
      emptyDescription="No sites have been created yet."
      emptyTitle="No sites found"
      fields={siteFormFields}
      getEditValues={(entity) => ({
        description: entity.description,
        location: entity.location,
        name: entity.name,
      })}
      getId={(entity) => entity.id}
      onRowDoubleClick={(row) => navigate(`/sites/${row.id}/dashboard`)}
      rowActionsDisplay="icon"
      schema={siteSchema}
      searchLabel=""
      searchPlaceholder="Search by site name or location"
      service={sitesService}
      showViewAction={false}
      title=""
    />
  );
}
