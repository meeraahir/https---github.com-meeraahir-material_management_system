import { useCallback, useDeferredValue, useEffect, useState } from "react";

import type { CrudService } from "../services/crudService";
import { getErrorMessage } from "../utils/apiError";

interface CrudModuleOptions<TEntity, TFormValues> {
  getId: (entity: TEntity) => number;
  service: CrudService<TEntity, TFormValues>;
}

export function useCrudModule<TEntity, TFormValues>({
  getId,
  service,
}: CrudModuleOptions<TEntity, TFormValues>) {
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
    } finally {
      setIsLoading(false);
    }
  }, [deferredSearchValue, page, service]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

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
      await loadList();
    } finally {
      setIsDeleteLoading(false);
    }
  }

  async function handleSubmit(values: TFormValues) {
    if (editingItem) {
      await service.update(getId(editingItem), values);
    } else {
      await service.create(values);
    }

    setIsFormOpen(false);
    setEditingItem(null);
    await loadList();
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
  };
}
