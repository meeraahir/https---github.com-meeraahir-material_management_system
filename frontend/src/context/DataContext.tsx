import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

import {
  getRefreshSnapshot,
  subscribeToRefresh,
  triggerAppRefresh,
} from "./dataSyncStore";
import { useAuth } from "../hooks/useAuth";
import { attendanceService } from "../services/attendanceService";
import { labourService } from "../services/labourService";
import {
  materialVariantsService,
  materialsService,
} from "../services/materialsService";
import { partiesService } from "../services/partiesService";
import { sitesService } from "../services/sitesService";
import { vendorsService } from "../services/vendorsService";
import type {
  Attendance,
  Labour,
  Material,
  MaterialVariant,
  Party,
  Site,
  Vendor,
} from "../types/erp.types";
import { getErrorMessage } from "../utils/apiError";

interface DataContextValue {
  attendance: Attendance[];
  error: string;
  fetchAttendance: () => Promise<Attendance[]>;
  fetchLabours: () => Promise<Labour[]>;
  fetchMaterials: () => Promise<Material[]>;
  fetchReferenceData: () => Promise<void>;
  fetchVendors: () => Promise<Vendor[]>;
  isLoading: boolean;
  labour: Labour[];
  materialVariants: MaterialVariant[];
  materials: Material[];
  parties: Party[];
  refreshKey: number;
  sites: Site[];
  triggerRefresh: () => void;
  vendors: Vendor[];
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const refreshKey = useSyncExternalStore(
    subscribeToRefresh,
    getRefreshSnapshot,
    getRefreshSnapshot,
  );
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [labour, setLabour] = useState<Labour[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialVariants, setMaterialVariants] = useState<MaterialVariant[]>(
    [],
  );
  const [parties, setParties] = useState<Party[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttendance = useCallback(async () => {
    const nextAttendance = await attendanceService.getOptions();
    setAttendance(nextAttendance);
    return nextAttendance;
  }, []);

  const fetchLabours = useCallback(async () => {
    const nextLabour = await labourService.getOptions();
    setLabour(nextLabour);
    return nextLabour;
  }, []);

  const fetchMaterials = useCallback(async () => {
    const nextMaterials = await materialsService.getOptions();
    setMaterials(nextMaterials);
    return nextMaterials;
  }, []);

  const fetchVendors = useCallback(async () => {
    const nextVendors = await vendorsService.getOptions();
    setVendors(nextVendors);
    return nextVendors;
  }, []);

  const fetchReferenceData = useCallback(async () => {
    if (!isAuthenticated) {
      setAttendance([]);
      setLabour([]);
      setMaterials([]);
      setMaterialVariants([]);
      setParties([]);
      setSites([]);
      setVendors([]);
      setError("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [
        nextSites,
        nextMaterials,
        nextMaterialVariants,
        nextVendors,
        nextLabour,
        nextParties,
      ] = await Promise.all([
        sitesService.getOptions(),
        materialsService.getOptions(),
        materialVariantsService.getOptions(),
        vendorsService.getOptions(),
        labourService.getOptions(),
        partiesService.getOptions(),
      ]);

      setSites(nextSites);
      setMaterials(nextMaterials);
      setMaterialVariants(nextMaterialVariants);
      setVendors(nextVendors);
      setLabour(nextLabour);
      setParties(nextParties);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    void fetchReferenceData();
  }, [fetchReferenceData, isInitializing, refreshKey]);

  const value = useMemo<DataContextValue>(
    () => ({
      attendance,
      error,
      fetchAttendance,
      fetchLabours,
      fetchMaterials,
      fetchReferenceData,
      fetchVendors,
      isLoading,
      labour,
      materialVariants,
      materials,
      parties,
      refreshKey,
      sites,
      triggerRefresh: triggerAppRefresh,
      vendors,
    }),
    [
      attendance,
      error,
      fetchAttendance,
      fetchLabours,
      fetchMaterials,
      fetchReferenceData,
      fetchVendors,
      isLoading,
      labour,
      materialVariants,
      materials,
      parties,
      refreshKey,
      sites,
      vendors,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext() {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error("useDataContext must be used within a DataProvider.");
  }

  return context;
}
