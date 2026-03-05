import { useState, useCallback } from "react";

export interface SqlJob {
  JobId: string;
  JobName: string;
  IsEnabled: boolean;
  Description: string;
  IsRunning: number;
  LastRunStatus: number | null;
}
export interface JobHistory {
  StepId: number;
  StepName: string;
  RunStatus: number;
  Message: string;
  RunDate: number;
  RunTime: number;
  Duration: number;
}
export interface JobStep {
  StepId: number;
  StepName: string;
  Subsystem: string;
  Command: string;
  DatabaseName: string;
}
export interface JobSchedule {
  ScheduleName: string;
  IsEnabled: boolean;
  FreqType: number;
  FreqInterval: number;
  StartTime: number;
}

export const useSqlJobs = () => {
  const [jobs, setJobs] = useState<SqlJob[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await (window as any).electronAPI.dbGetSqlJobs();
      if (res?.success) setJobs(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const executeJobAction = async (
    jobName: string,
    action: "start" | "stop",
  ) => {
    try {
      return await (window as any).electronAPI.dbExecuteJobAction({
        jobName,
        action,
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const toggleJob = async (jobName: string, enabled: boolean) => {
    try {
      return await (window as any).electronAPI.dbToggleSqlJob({
        jobName,
        enabled,
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const getJobHistory = async (jobName: string): Promise<JobHistory[]> => {
    try {
      const res = await (window as any).electronAPI.dbGetSqlJobHistory(jobName);
      return res?.success ? res.data : [];
    } catch (error) {
      return [];
    }
  };

  const getJobDetails = async (jobName: string) => {
    try {
      const res = await (window as any).electronAPI.dbGetSqlJobDetails(jobName);
      return res?.success ? res.data : { steps: [], schedules: [] };
    } catch (error) {
      return { steps: [], schedules: [] };
    }
  };

  const getCurrentDbName = async () => {
    try {
      const res = await (window as any).electronAPI.dbGetCurrentDbName();
      return res?.success ? res.data : "master";
    } catch (error) {
      return "master";
    }
  };

  const saveJobMaster = async (
    isEdit: boolean,
    originalName: string,
    jobData: any,
  ) => {
    try {
      return await (window as any).electronAPI.dbSaveJobMaster({
        isEdit,
        originalName,
        jobData,
      });
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  return {
    jobs,
    loading,
    fetchJobs,
    executeJobAction,
    toggleJob,
    getJobHistory,
    getJobDetails,
    getCurrentDbName,
    saveJobMaster,
  };
};
