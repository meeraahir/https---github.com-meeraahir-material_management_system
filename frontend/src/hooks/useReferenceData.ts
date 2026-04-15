import { useDataContext } from "../context/DataContext";

export function useReferenceData() {
  const data = useDataContext();

  return {
    labour: data.labour,
    materials: data.materials,
    materialVariants: data.materialVariants,
    parties: data.parties,
    sites: data.sites,
    vendors: data.vendors,
    error: data.error,
    isLoading: data.isLoading,
  };
}
