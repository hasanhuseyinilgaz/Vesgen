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
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [topRows, setTopRows] = useState("100");

  const [showFilter, setShowFilter] = useState(false);
  const [showLivePanel, setShowLivePanel] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);

  const latestParams = useRef({
    activeItem,
    activeWhereClause,
    sortConfig,
    topRows,
  });

  useCallback(() => {
    latestParams.current = {
      activeItem,
      activeWhereClause,
      sortConfig,
      topRows,
    };
  }, [activeItem, activeWhereClause, sortConfig, topRows]);

  const loadData = async (
    itemName: string,
    whereClause: string = "",
    currentSort: SortConfig | null = sortConfig,
    isSilent: boolean = false,
  ) => {
    if (!isSilent) setLoading(true);
    setActiveItem(itemName);
    setActiveWhereClause(whereClause);

    try {
      if (!isSilent || columns.length === 0) {
        const colResult = await fetchColumnsApi(itemName);
        if (colResult?.success) setColumns(colResult.data);
      }

      const dataResult = await fetchDataApi({
        tableName: itemName,
        top: parseInt(topRows) || 100,
        whereClause,
        orderBy: currentSort
          ? `${currentSort.column} ${currentSort.direction}`
          : "",
      });

      if (dataResult?.success) {
        setData(dataResult.data || []);
      }
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
  };

  return {
    data,
    columns,
    loading,
    activeItem,
    topRows,
    setTopRows,
    activeWhereClause,
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
