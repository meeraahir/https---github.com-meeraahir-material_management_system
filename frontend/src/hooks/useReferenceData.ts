import { useEffect, useState } from "react";

import { useToast } from "../components/feedback/useToast";
import { labourService } from "../services/labourService";
import {
  materialVariantsService,
  materialsService,
} from "../services/materialsService";
import { partiesService } from "../services/partiesService";
import { sitesService } from "../services/sitesService";
import { vendorsService } from "../services/vendorsService";
import type {
  Labour,
  Material,
  MaterialVariant,
  Party,
  Site,
  Vendor,
} from "../types/erp.types";
import { getErrorMessage } from "../utils/apiError";

interface ReferenceState {
  labour: Labour[];
  materials: Material[];
  materialVariants: MaterialVariant[];
  parties: Party[];
  sites: Site[];
  vendors: Vendor[];
}

export function useReferenceData() {
  const { showError } = useToast();
  const [data, setData] = useState<ReferenceState>({
    labour: [],
    materials: [],
    materialVariants: [],
    parties: [],
    sites: [],
    vendors: [],
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadReferences() {
      try {
        setIsLoading(true);
        setError("");
        const [sites, materials, materialVariants, vendors, labour, parties] = await Promise.all([
          sitesService.getOptions(),
          materialsService.getOptions(),
          materialVariantsService.getOptions(),
          vendorsService.getOptions(),
          labourService.getOptions(),
          partiesService.getOptions(),
        ]);

        setData({
          labour,
          materials,
          materialVariants,
          parties,
          sites,
          vendors,
        });
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load reference data", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadReferences();
  }, [showError]);

  return {
    ...data,
    error,
    isLoading,
  };
}
