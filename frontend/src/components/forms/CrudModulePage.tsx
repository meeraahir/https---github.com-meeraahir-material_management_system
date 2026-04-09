import type { FieldValues } from "react-hook-form";
import type { z } from "zod";

import { useCrudModule } from "../../hooks/useCrudModule";
import type { CrudService } from "../../services/crudService";
import type { TableColumn } from "../../types/ui.types";
import type { FormFieldConfig } from "../../types/ui.types";
import { PageHeader } from "../layout/PageHeader";
import { ConfirmDialog } from "../modal/ConfirmDialog";
import { DataTable } from "../table/DataTable";
import { Button } from "../ui/Button";
import { FormError } from "../ui/FormError";
import { EntityFormModal } from "./EntityFormModal";

interface CrudModulePageProps<TEntity, TFormValues extends FieldValues> {
  canCreate: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  columns: TableColumn<TEntity>[];
  createLabel: string;
  defaultValues: TFormValues;
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  externalError?: string;
  fields: FormFieldConfig<TFormValues>[];
  getEditValues: (entity: TEntity) => TFormValues;
  getId: (entity: TEntity) => number;
  schema: z.ZodType<TFormValues>;
  searchPlaceholder: string;
  service: CrudService<TEntity, TFormValues>;
  title: string;
}

export function CrudModulePage<TEntity, TFormValues extends FieldValues>({
  canCreate,
  canDelete = false,
  canEdit = false,
  columns,
  createLabel,
  defaultValues,
  description,
  emptyDescription,
  emptyTitle,
  externalError,
  fields,
  getEditValues,
  getId,
  schema,
  searchPlaceholder,
  service,
  title,
}: CrudModulePageProps<TEntity, TFormValues>) {
  const {
    deleteTarget,
    editingItem,
    error,
    handleDelete,
    handleSubmit,
    isDeleteLoading,
    isFormOpen,
    isLoading,
    items,
    openCreate,
    openEdit,
    page,
    searchValue,
    setDeleteTarget,
    setIsFormOpen,
    setPage,
    setSearchValue,
    totalCount,
  } = useCrudModule({
    getId,
    service,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          canCreate ? (
            <Button onClick={openCreate} type="button">
              {createLabel}
            </Button>
          ) : null
        }
        description={description}
        title={title}
      />

      <FormError message={externalError} />
      <FormError message={error} />

      <DataTable
        actions={
          canEdit || canDelete
            ? [
                ...(canEdit
                  ? [{ label: "Edit", onClick: openEdit, variant: "secondary" as const }]
                  : []),
                ...(canDelete
                  ? [
                      {
                        label: "Delete",
                        onClick: setDeleteTarget,
                        variant: "ghost" as const,
                      },
                    ]
                  : []),
              ]
            : undefined
        }
        columns={columns}
        data={items}
        emptyDescription={emptyDescription}
        emptyTitle={emptyTitle}
        isLoading={isLoading}
        keyExtractor={getId}
        page={page}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        title={`${title} Records`}
        totalCount={totalCount}
        onPageChange={setPage}
        onSearchChange={setSearchValue}
      />

      <EntityFormModal
        defaultValues={editingItem ? getEditValues(editingItem) : defaultValues}
        description={`Create or update ${title.toLowerCase()} records.`}
        fields={fields}
        onClose={() => {
          setIsFormOpen(false);
        }}
        onSubmit={handleSubmit}
        open={isFormOpen && (canCreate || canEdit)}
        schema={schema}
        title={editingItem ? `Edit ${title}` : `Create ${title}`}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={`Are you sure you want to delete this ${title.toLowerCase()} record?`}
        isLoading={isDeleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          void handleDelete();
        }}
        open={canDelete && Boolean(deleteTarget)}
        title={`Delete ${title}`}
      />
    </div>
  );
}
