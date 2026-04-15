import { useCallback, useDeferredValue, useEffect, useState } from "react";

import { useToast } from "../components/feedback/useToast";
import { useDataContext } from "../context/DataContext";
import type { CrudService } from "../services/crudService";
import { getErrorMessage } from "../utils/apiError";

interface CrudModuleOptions<TEntity, TFormValues> {
  getId: (entity: TEntity) => number;
  reloadSignal?: number;
  service: CrudService<TEntity, TFormValues>;
}

export function useCrudModule<TEntity, TFormValues>({
  getId,
  reloadSignal,
  service,
}: CrudModuleOptions<TEntity, TFormValues>) {
  const { showError, showSuccess } = useToast();
  const { refreshKey, triggerRefresh } = useDataContext();
  const [items, setItems] = useState<TEntity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<TEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TEntity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const deferredSearchValue = useDeferredValue(searchValue);

  const loadList = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await service.list({
        page,
        search: deferredSearchValue,
      });
      setItems(response.results);
      setTotalCount(response.count);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      showError("Unable to load records", getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [deferredSearchValue, page, service, showError]);

  useEffect(() => {
    void loadList();
  }, [loadList, refreshKey, reloadSignal]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearchValue]);

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      setIsDeleteLoading(true);
      await service.remove(getId(deleteTarget));
      setDeleteTarget(null);
      showSuccess("Record deleted", "The record has been removed successfully.");
      triggerRefresh();
    } catch (deleteError) {
      showError("Delete failed", getErrorMessage(deleteError));
    } finally {
      setIsDeleteLoading(false);
    }
  }

  async function handleSubmit(values: TFormValues) {
    try {
      if (editingItem) {
        await service.update(getId(editingItem), values);
        showSuccess("Record updated", "Changes have been saved successfully.");
      } else {
        await service.create(values);
        showSuccess("Record created", "New details have been added successfully.");
      }

      setIsFormOpen(false);
      setEditingItem(null);
      triggerRefresh();
    } catch (submitError) {
      showError("Save failed", getErrorMessage(submitError));
      throw submitError;
    }
  }

  function openCreate() {
    setEditingItem(null);
    setIsFormOpen(true);
  }

  function openEdit(item: TEntity) {
    setEditingItem(item);
    setIsFormOpen(true);
  }

  return {
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
    reloadList: loadList,
  };
}
