import { useState, useRef, useCallback } from "react";
import { SortConfig, SortDirection } from "@/components/DataTable";

interface UseTableDataProps {
  fetchDataApi: (params: any) => Promise<any>;
  fetchColumnsApi: (tableName: string) => Promise<any>;
}

export function useTableData({
  fetchDataApi,
  fetchColumnsApi,
}: UseTableDataProps) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const [activeWhereClause, setActiveWhereClause] = useState("");
  const [activeJoins, setActiveJoins] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [topRows, setTopRows] = useState("100");

  const [showFilter, setShowFilter] = useState(false);
  const [showLivePanel, setShowLivePanel] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);

  const latestParams = useRef({
    activeItem,
    activeWhereClause,
    activeJoins,
    sortConfig,
    topRows,
  });

  useCallback(() => {
    latestParams.current = {
      activeItem,
      activeWhereClause,
      activeJoins,
      sortConfig,
      topRows,
    };
  }, [activeItem, activeWhereClause, activeJoins, sortConfig, topRows]);

  const loadData = async (
    itemName: string,
    whereClause: string = "",
    currentSort: SortConfig | null = sortConfig,
    isSilent: boolean = false,
    joins: any[] = [],
  ) => {
    if (!isSilent) setLoading(true);
    setActiveItem(itemName);
    setActiveWhereClause(whereClause);
    setActiveJoins(joins);

    try {
      if (!isSilent || columns.length === 0) {
        const colResult = await fetchColumnsApi(itemName);
        if (colResult?.success) {
          const useAlias = joins && joins.length > 0;
          let mergedColumns = colResult.data.map((c: any) => ({
            ...c,
            tableName: itemName,
            COLUMN_NAME: useAlias ? `${itemName}_${c.COLUMN_NAME}` : c.COLUMN_NAME,
            originalName: c.COLUMN_NAME,
          }));

          // Fetch columns for joined tables
          if (useAlias) {
            for (const join of joins) {
              const joinColRes = await fetchColumnsApi(join.targetTable);
              if (joinColRes?.success) {
                const joinCols = joinColRes.data.map((c: any) => ({
                  ...c,
                  tableName: join.targetTable,
                  COLUMN_NAME: `${join.targetTable}_${c.COLUMN_NAME}`,
                  originalName: c.COLUMN_NAME,
                }));
                mergedColumns = [...mergedColumns, ...joinCols];
              }
            }
          }
          setColumns(mergedColumns);
        }
      }

      const dataResult = await fetchDataApi({
        tableName: itemName,
        top: parseInt(topRows) || 100,
        whereClause,
        orderBy: currentSort
          ? `${currentSort.column} ${currentSort.direction}`
          : "",
        joins,
      });

      if (dataResult?.success) {
        setData(dataResult.data || []);
      } else {
        console.error("Veri yükleme hatası:", dataResult?.message);
        setData([]);
      }
    } catch (error) {
      console.error("Tablo yüklenirken hata oluştu:", error);
      setData([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSort = (column: string, direction: SortDirection) => {
    const newSort = { column, direction };
    setSortConfig(newSort);

    const sorted = [...data].sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      if (valA === valB) return 0;
      if (valA === null) return direction === "ASC" ? -1 : 1;
      if (valB === null) return direction === "ASC" ? 1 : -1;
      return direction === "ASC"
        ? valA < valB
          ? -1
          : 1
        : valA > valB
          ? -1
          : 1;
    });
    setData(sorted);
  };

  const resetState = () => {
    setShowLivePanel(false);
    setIsLiveActive(false);
    setSortConfig(null);
    setShowFilter(false);
    setActiveJoins([]);
  };

  return {
    data,
    columns,
    loading,
    activeItem,
    topRows,
    setTopRows,
    activeWhereClause,
    activeJoins,
    sortConfig,
    showFilter,
    setShowFilter,
    showLivePanel,
    setShowLivePanel,
    isLiveActive,
    setIsLiveActive,
    loadData,
    handleSort,
    resetState,
    setLoading,
  };
}
