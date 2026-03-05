import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

export interface FragmentedIndex {
  TableName: string;
  IndexName: string;
  Fragmentation: number;
  PageCount: number;
}
export interface DbFile {
  FileType: string;
  LogicalName: string;
  TotalSizeMB: number;
  UsedSizeMB: number;
  RecoveryModel: string;
}
export interface TopTable {
  TableName: string;
  RowCount: number;
  TotalSpaceMB: number;
}
export interface TableStatistic {
  TableName: string;
  LastUpdated: any;
  TotalRows: number;
  ModifiedRows: number;
  StalePercentage: number;
}

export function useDatabaseMaintenance() {
  const { t } = useTranslation();

  const [indexes, setIndexes] = useState<FragmentedIndex[]>([]);
  const [indexHealthScore, setIndexHealthScore] = useState<number>(100);
  const [loadingIndexes, setLoadingIndexes] = useState(false);

  const [dbFiles, setDbFiles] = useState<DbFile[]>([]);
  const [topTables, setTopTables] = useState<TopTable[]>([]);
  const [loadingDisk, setLoadingDisk] = useState(false);
  const [diskError, setDiskError] = useState<string | null>(null);

  const [tableStats, setTableStats] = useState<TableStatistic[]>([]);
  const [statsHealthScore, setStatsHealthScore] = useState<number>(100);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadFragmentedIndexes = useCallback(async () => {
    setLoadingIndexes(true);
    try {
      if ((window as any).electronAPI?.dbGetFragmentedIndexes) {
        const result = await (
          window as any
        ).electronAPI.dbGetFragmentedIndexes();
        if (result?.success) {
          const responseData = result.data as any;
          setIndexes(responseData.indexes || []);
          setIndexHealthScore(responseData.healthScore ?? 100);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingIndexes(false);
    }
  }, []);

  const loadDiskInfo = useCallback(async () => {
    setLoadingDisk(true);
    setDiskError(null);
    try {
      if ((window as any).electronAPI?.dbGetDbSpaceInfo) {
        const result = await (window as any).electronAPI.dbGetDbSpaceInfo();
        if (result?.success) {
          setDbFiles(result.data.files || []);
          setTopTables(result.data.topTables || []);
        } else {
          setDiskError(result.message || t("maintenance.sqlError"));
        }
      }
    } catch (error: any) {
      setDiskError(error.message);
    } finally {
      setLoadingDisk(false);
    }
  }, [t]);

  const loadStatisticsInfo = useCallback(async () => {
    setLoadingStats(true);
    try {
      if ((window as any).electronAPI?.dbGetStatisticsInfo) {
        const result = await (window as any).electronAPI.dbGetStatisticsInfo();
        if (result?.success) {
          setTableStats(result.data.stats || []);
          setStatsHealthScore(result.data.healthScore ?? 100);
        }
      }
    } catch (error) {
      console.error(t("maintenance.statsLoadError"), error);
    } finally {
      setLoadingStats(false);
    }
  }, [t]);

  return {
    indexes,
    setIndexes,
    indexHealthScore,
    setIndexHealthScore,
    loadingIndexes,
    loadFragmentedIndexes,

    dbFiles,
    topTables,
    loadingDisk,
    diskError,
    loadDiskInfo,

    tableStats,
    statsHealthScore,
    loadingStats,
    loadStatisticsInfo,
  };
}
