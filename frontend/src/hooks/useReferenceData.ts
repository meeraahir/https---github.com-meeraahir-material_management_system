import { useEffect, useState } from "react";

import { labourService } from "../services/labourService";
import { materialsService } from "../services/materialsService";
import { partiesService } from "../services/partiesService";
import { sitesService } from "../services/sitesService";
import { vendorsService } from "../services/vendorsService";
import type { Labour, Material, Party, Site, Vendor } from "../types/erp.types";

interface ReferenceState {
  labour: Labour[];
  materials: Material[];
  parties: Party[];
  sites: Site[];
  vendors: Vendor[];
}

export function useReferenceData() {
  const [data, setData] = useState<ReferenceState>({
    labour: [],
    materials: [],
    parties: [],
    sites: [],
    vendors: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReferences() {
      try {
        setIsLoading(true);
        const [sites, materials, vendors, labour, parties] = await Promise.all([
          sitesService.getOptions(),
          materialsService.getOptions(),
          vendorsService.getOptions(),
          labourService.getOptions(),
          partiesService.getOptions(),
        ]);

        setData({
          labour,
          materials,
          parties,
          sites,
          vendors,
        });
      } finally {
        setIsLoading(false);
      }
    }

    void loadReferences();
  }, []);

  return {
    ...data,
    isLoading,
  };
}
