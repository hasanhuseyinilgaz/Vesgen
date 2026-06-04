import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Play,
  Square,
  RefreshCw,
  ServerCog,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  History,
  Terminal,
  PlusCircle,
  CalendarClock,
  Code,
  Trash2,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import CustomTabs from "@/components/ui/custom-tabs";
import PageHeader from "@/components/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSqlJobs,
  SqlJob,
  JobHistory,
  JobStep,
  JobSchedule,
} from "@/hooks/useSqlJobs";

import ActionTooltip from "@/components/ui/action-tooltip";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import ConnectionRequired from "@/components/ConnectionRequired";

const formatSqlDate = (d?: number, t?: number) => {
  if (!d) return "-";
  const ds = d.toString();
  const ts = (t || 0).toString().padStart(6, "0");
  return `${ds.substring(6, 8)}.${ds.substring(4, 6)}.${ds.substring(0, 4)} ${ts.substring(0, 2)}:${ts.substring(2, 4)}`;
};

const formatDuration = (dur?: number) => {
  if (dur === undefined) return "-";
  const s = dur.toString().padStart(6, "0");
  const h = parseInt(s.substring(0, 2)),
    m = parseInt(s.substring(2, 4)),
    sc = parseInt(s.substring(4, 6));
  return h > 0 ? `${h}sa ${m}dk` : m > 0 ? `${m}dk ${sc}sn` : `${sc}sn`;
};

const groupHistoryByRun = (history: JobHistory[]) => {
  const grouped: { outcome: JobHistory | null; steps: JobHistory[] }[] = [];
  let currentRun: { outcome: JobHistory | null; steps: JobHistory[] } | null =
    null;
  history.forEach((record: JobHistory) => {
    if (record.StepId === 0) {
      if (currentRun) {
        currentRun.outcome = record;
        grouped.push(currentRun);
        currentRun = null;
      } else {
        grouped.push({ outcome: record, steps: [] });
      }
    } else {
      if (!currentRun) currentRun = { outcome: null, steps: [] };
      currentRun.steps.push(record);
    }
  });
  if (currentRun) grouped.push(currentRun);
  return grouped;
};

export default function SqlJobsPage() {
  const { t } = useTranslation();
  const { isDbConnected } = useDatabaseContext();
  const {
    jobs,
    loading,
    fetchJobs,
    executeJobAction,
    toggleJob,
    getJobHistory,
    getJobDetails,
    getCurrentDbName,
    saveJobMaster,
  } = useSqlJobs();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [simulatedRunning, setSimulatedRunning] = useState<string[]>([]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: "start" | "stop" | null;
    job: SqlJob | null;
  }>({ isOpen: false, action: null, job: null });
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    jobName: string;
    history: JobHistory[];
    loading: boolean;
  }>({ isOpen: false, jobName: "", history: [], loading: false });

  const [editorModal, setEditorModal] = useState<{
    isOpen: boolean;
    isEdit: boolean;
    originalName: string;
    loading: boolean;
    activeTab: "general" | "steps" | "schedules";
    data: {
      name: string;
      description: string;
      enabled: boolean;
      steps: { id: number; name: string; db: string; cmd: string }[];
      schedules: {
        id: number;
        enabled: boolean;
        freqType: number;
        freqInterval: number;
        time: string;
      }[];
    };
  }>({
    isOpen: false,
    isEdit: false,
    originalName: "",
    loading: false,
    activeTab: "general",
    data: {
      name: "",
      description: "",
      enabled: true,
      steps: [],
      schedules: [],
    },
  });

  useEffect(() => {
    if (isDbConnected) {
      fetchJobs();
    }
  }, [fetchJobs, isDbConnected]);

  const handleAction = async () => {
    if (!confirmModal.job || !confirmModal.action) return;
    const jobName = confirmModal.job.JobName;
    const action = confirmModal.action;

    setActionLoading(true);
    const res = await executeJobAction(jobName, action);
    setActionLoading(false);

    if (res && !res.success) {
      alert(`${t("common.error")}: ` + res.message);
    } else {
      setConfirmModal({ isOpen: false, action: null, job: null });

      if (action === "start") {
        setSimulatedRunning((prev) => [...prev, jobName]);
        setTimeout(() => fetchJobs(true), 500);
        setTimeout(() => fetchJobs(true), 1500);
        setTimeout(() => {
          fetchJobs(true).then(() => {
            setSimulatedRunning((prev) =>
              prev.filter((name) => name !== jobName),
            );
          });
        }, 3000);
      } else {
        fetchJobs(true);
      }
    }
  };

  const handleToggleEnable = async (job: SqlJob) => {
    setActionLoading(true);
    const res = await toggleJob(job.JobName, !job.IsEnabled);
    setActionLoading(false);
    if (res && res.success) {
      fetchJobs(true);
    }
  };

  const openHistory = async (jobName: string) => {
    setHistoryModal({ isOpen: true, jobName, history: [], loading: true });
    const data = await getJobHistory(jobName);
    setHistoryModal({ isOpen: true, jobName, history: data, loading: false });
  };

  const openEditorForCreate = async () => {
    const db = await getCurrentDbName();
    setEditorModal({
      isOpen: true,
      isEdit: false,
      originalName: "",
      loading: false,
      activeTab: "general",
      data: {
        name: "",
        description: "",
        enabled: true,
        steps: [{ id: Date.now(), name: `${t("jobs.step")} 1`, db, cmd: "" }],
        schedules: [
          {
            id: Date.now(),
            enabled: false,
            freqType: 4,
            freqInterval: 1,
            time: "00:00",
          },
        ],
      },
    });
  };

  const openEditorForEdit = async (job: SqlJob) => {
    setEditorModal((p) => ({
      ...p,
      isOpen: true,
      isEdit: true,
      originalName: job.JobName,
      loading: true,
      activeTab: "general",
    }));
    const details = await getJobDetails(job.JobName);
    setEditorModal({
      isOpen: true,
      isEdit: true,
      originalName: job.JobName,
      loading: false,
      activeTab: "general",
      data: {
        name: job.JobName,
        description: job.Description || "",
        enabled: job.IsEnabled,
        steps: details.steps.map((s: JobStep) => ({
          id: s.StepId,
          name: s.StepName,
          db: s.DatabaseName,
          cmd: s.Command,
        })),
        schedules:
          details.schedules.length > 0
            ? details.schedules.map((s: JobSchedule, i: number) => ({
                id: i,
                enabled: s.IsEnabled,
                freqType: s.FreqType,
                freqInterval: s.FreqInterval,
                time: s.StartTime.toString()
                  .padStart(6, "0")
                  .substring(0, 4)
                  .replace(/(.{2})/, "$1:"),
              }))
            : [
                {
                  id: Date.now(),
                  enabled: false,
                  freqType: 4,
                  freqInterval: 1,
                  time: "00:00",
                },
              ],
      },
    });
  };

  const handleSaveJob = async () => {
    if (!editorModal.data.name) return alert(t("jobs.jobNameRequired"));
    if (editorModal.data.steps.some((s: any) => !s.cmd))
      return alert(t("jobs.commandRequired"));
    setActionLoading(true);
    const res = await saveJobMaster(
      editorModal.isEdit,
      editorModal.originalName,
      editorModal.data,
    );
    setActionLoading(false);
    if (res && res.success) {
      setEditorModal((p) => ({ ...p, isOpen: false }));
      fetchJobs(true);
    } else alert(`${t("common.error")}: ` + res?.message);
  };


  const updateSchedule = (field: string, value: any) => {
    setEditorModal((p) => ({
      ...p,
      data: {
        ...p.data,
        schedules: [{ ...p.data.schedules[0], [field]: value }],
      },
    }));
  };

  const filteredJobs = jobs.filter((j: SqlJob) =>
    j.JobName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isDbConnected) {
    return (
      <PageLayout>
        <div className="flex flex-col h-full bg-transparent overflow-hidden w-full">
          <div className="flex-1 flex flex-col gap-6 p-6 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
            <PageHeader
              title={t("jobs.title")}
              icon={ServerCog}
              description={t("jobs.description")}
              showLimitSelector={false}
              showFilterButton={false}
              showLiveButton={false}
              showRefreshButton={false}
              recordCount={0}
              showRecordCount={false}
            />
            <ConnectionRequired />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-col h-full bg-transparent overflow-hidden w-full">
        <div className="flex-1 flex flex-col gap-6 p-6 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
          <PageHeader
            title={t("jobs.title")}
            icon={ServerCog}
            description={t("jobs.description")}
            showLimitSelector={false}
            showFilterButton={false}
            showLiveButton={false}
            showRefreshButton={false}
            recordCount={filteredJobs.length}
            showRecordCount={searchTerm.length > 0}
            customActions={
              <div className="flex items-center gap-3">
                <Input
                  placeholder={t("jobs.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 sm:w-64 glass-card border-border/50 h-9"
                />
                <ActionTooltip label={t("common.refresh")} side="bottom">
                  <Button
                    onClick={() => fetchJobs(false)}
                    disabled={loading || actionLoading}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shadow-sm border-border/50"
                  >
                    <RefreshCw
                      className={cn("w-4 h-4", loading && "animate-spin")}
                    />
                  </Button>
                </ActionTooltip>
                <div className="w-px h-6 bg-border/50 mx-1 hidden sm:block"></div>
                <Button
                  onClick={openEditorForCreate}
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-primary/20 h-9"
                >
                  <PlusCircle className="w-4 h-4 mr-2" /> {t("jobs.createJob")}
                </Button>
              </div>
            }
          />
          <Card className="border-border/50 shadow-sm overflow-hidden glass-card">
            <CardContent className="p-0">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-card/95 border-b border-border/50 backdrop-blur-sm">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-muted-foreground w-40">
                      {t("jobs.status")}
                    </th>
                    <th className="px-5 py-4 font-semibold text-muted-foreground">
                      {t("jobs.jobName")}
                    </th>
                    <th className="px-5 py-4 font-semibold text-muted-foreground w-24">
                      {t("jobs.enabled")}
                    </th>
                    <th className="px-5 py-4 font-semibold text-muted-foreground w-40">
                      {t("jobs.lastRunStatus")}
                    </th>
                    <th className="px-5 py-4 text-right font-semibold text-muted-foreground w-64">
                      {t("jobs.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredJobs.map((job: SqlJob) => {
                    const isRunning =
                      job.IsRunning === 1 ||
                      simulatedRunning.includes(job.JobName);

                    return (
                      <tr
                        key={job.JobId}
                        className={cn(
                          "transition-all duration-200 table-row-solid",
                          !job.IsEnabled && "opacity-60 bg-muted/10",
                        )}
                      >
                        <td className="px-5 py-3">
                          {isRunning ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-info/10 text-info text-[11px] font-bold border border-info/20 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />{" "}
                              {t("jobs.running")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground text-[11px] font-bold border border-border/50">
                              <Clock className="w-3 h-3" /> {t("jobs.idle")}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-bold text-foreground/90 truncate max-w-md">
                            {job.JobName}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-sm mt-0.5">
                            {job.Description || t("jobs.noDescription")}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Switch
                            checked={job.IsEnabled}
                            onCheckedChange={() => handleToggleEnable(job)}
                            className="scale-75 origin-left"
                          />
                        </td>
                        <td className="px-5 py-3">
                          {job.LastRunStatus === 1 ? (
                            <div className="flex items-center gap-1.5 text-success font-semibold text-[12px]">
                              <CheckCircle2 className="w-4 h-4" />{" "}
                              {t("jobs.success")}
                            </div>
                          ) : job.LastRunStatus === 0 ? (
                            <div className="flex items-center gap-1.5 text-destructive font-semibold text-[12px]">
                              <AlertTriangle className="w-4 h-4" />{" "}
                              {t("jobs.failed")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50 font-semibold text-[12px]">
                              - {t("jobs.unknown")} -
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <ActionTooltip label={t("jobs.editJob")} side="top">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={() => openEditorForEdit(job)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </ActionTooltip>
                            <ActionTooltip label={t("jobs.history")} side="top">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-8 h-8 text-muted-foreground hover:text-info hover:bg-info/10"
                                onClick={() => openHistory(job.JobName)}
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            </ActionTooltip>
                            {isRunning ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-4 font-bold shadow-sm"
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    action: "stop",
                                    job,
                                  })
                                }
                              >
                                <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />{" "}
                                {t("jobs.stop")}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled={!job.IsEnabled}
                                className="h-8 px-4 font-bold bg-success hover:bg-success/90 text-success-foreground shadow-sm"
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    action: "start",
                                    job,
                                  })
                                }
                              >
                                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />{" "}
                                {t("jobs.start")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredJobs.length === 0 && !loading && (
                <div className="p-12 text-center text-muted-foreground text-sm italic border-t border-border/20">
                  - {t("jobs.unknown")} -
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={confirmModal.isOpen}
        onOpenChange={(o) =>
          !o && setConfirmModal((p) => ({ ...p, isOpen: false }))
        }
      >
        <DialogContent className="sm:max-w-md border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle
              className={cn(
                "flex items-center gap-2",
                confirmModal.action === "stop"
                  ? "text-destructive"
                  : "text-success",
              )}
            >
              <AlertTriangle className="w-5 h-5" />{" "}
              {confirmModal.action === "stop"
                ? t("jobs.stop")
                : t("jobs.start")}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              {confirmModal.action === "stop"
                ? t("jobs.confirmStop")
                : t("jobs.confirmStart")}
              <br />
              <strong className="text-foreground font-bold">
                {confirmModal.job?.JobName}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
              disabled={actionLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className={
                confirmModal.action === "stop"
                  ? "bg-destructive text-white"
                  : "bg-success text-white"
              }
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}{" "}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editorModal.isOpen}
        onOpenChange={(o) =>
          !o && setEditorModal((p) => ({ ...p, isOpen: false }))
        }
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-6 border-b glass-card shrink-0 shadow-sm z-10 rounded-none">
            <DialogTitle className="flex items-center gap-2">
              <ServerCog className="w-5 h-5 text-primary" />
              {editorModal.isEdit ? t("jobs.editJob") : t("jobs.createJob")}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pt-4 bg-muted/5 border-b">
            <CustomTabs
              activeTab={editorModal.activeTab}
              onTabChange={(t) =>
                setEditorModal((p) => ({ ...p, activeTab: t as any }))
              }
              tabs={[
                { value: "general", label: t("jobs.details"), icon: ServerCog },
                { value: "steps", label: t("jobs.steps"), icon: Code },
                {
                  value: "schedules",
                  label: t("jobs.schedules"),
                  icon: CalendarClock,
                },
              ]}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/5 custom-scrollbar">
            {editorModal.activeTab === "general" && (
              <div className="max-w-2xl mx-auto space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    {t("jobs.jobName")}
                  </Label>
                  <Input
                    value={editorModal.data.name}
                    onChange={(e) =>
                      setEditorModal((p) => ({
                        ...p,
                        data: { ...p.data, name: e.target.value },
                      }))
                    }
                    className="h-12 text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">
                    {t("jobs.descriptionLabel")}
                  </Label>
                  <Input
                    value={editorModal.data.description}
                    onChange={(e) =>
                      setEditorModal((p) => ({
                        ...p,
                        data: { ...p.data, description: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/20 border border-border/50 rounded-xl">
                  <Switch
                    checked={editorModal.data.enabled}
                    onCheckedChange={(c) =>
                      setEditorModal((p) => ({
                        ...p,
                        data: { ...p.data, enabled: c },
                      }))
                    }
                  />
                  <Label className="font-bold cursor-pointer">
                    {t("jobs.activateJob")}
                  </Label>
                </div>
              </div>
            )}
            {editorModal.activeTab === "steps" && (
              <div className="space-y-6">
                {editorModal.data.steps.map((s: any, idx: number) => (
                  <Card
                    key={s.id}
                    className="relative border-border/60 shadow-md glass-card"
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-primary flex items-center gap-2">
                          <Terminal className="w-4 h-4" /> {t("jobs.step")}{" "}
                          {idx + 1}
                        </h3>
                        {editorModal.data.steps.length > 1 && (
                          <ActionTooltip label={t("common.delete")} side="left">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() =>
                                setEditorModal((p) => ({
                                  ...p,
                                  data: {
                                    ...p.data,
                                    steps: p.data.steps.filter(
                                      (st: any) => st.id !== s.id,
                                    ),
                                  },
                                }))
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </ActionTooltip>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold opacity-50 uppercase">
                            {t("jobs.stepName")}
                          </Label>
                          <Input
                            value={s.name}
                            onChange={(e) => {
                              const ns = [...editorModal.data.steps];
                              ns[idx].name = e.target.value;
                              setEditorModal((p) => ({
                                ...p,
                                data: { ...p.data, steps: ns },
                              }));
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold opacity-50 uppercase">
                            {t("jobs.database")}
                          </Label>
                          <Input
                            value={s.db}
                            onChange={(e) => {
                              const ns = [...editorModal.data.steps];
                              ns[idx].db = e.target.value;
                              setEditorModal((p) => ({
                                ...p,
                                data: { ...p.data, steps: ns },
                              }));
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold opacity-50 uppercase">
                          {t("jobs.tsqlCommand")}
                        </Label>
                        <textarea
                          className="w-full h-32 p-3 bg-muted/30 border border-border/50 rounded-lg font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                          value={s.cmd}
                          onChange={(e) => {
                            const ns = [...editorModal.data.steps];
                            ns[idx].cmd = e.target.value;
                            setEditorModal((p) => ({
                              ...p,
                              data: { ...p.data, steps: ns },
                            }));
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  className="w-full h-12 border-dashed border-2 font-bold"
                  onClick={async () => {
                    const db = await getCurrentDbName();
                    setEditorModal((p) => ({
                      ...p,
                      data: {
                        ...p.data,
                        steps: [
                          ...p.data.steps,
                          {
                            id: Date.now(),
                            name: t("jobs.newStep"),
                            db,
                            cmd: "",
                          },
                        ],
                      },
                    }));
                  }}
                >
                  <PlusCircle className="w-4 h-4 mr-2" /> {t("jobs.addStep")}
                </Button>
              </div>
            )}
            {editorModal.activeTab === "schedules" && (
              <div className="space-y-6">
                {editorModal.data.schedules.length > 0 ? (
                  editorModal.data.schedules.map((sch: any) => (
                    <Card
                      key={sch.id}
                      className="relative border-border/60 shadow-md glass-card"
                    >
                      <CardContent className="p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b pb-4">
                          <Switch
                            checked={sch.enabled}
                            onCheckedChange={(c: boolean) =>
                              updateSchedule("enabled", c)
                            }
                          />
                          <Label className="font-bold text-base">
                            {t("jobs.activateSchedule")}
                          </Label>
                        </div>
                        {sch.enabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <Label className="font-semibold text-muted-foreground">
                                {t("jobs.freqType")}
                              </Label>
                              <Select
                                value={sch.freqType.toString()}
                                onValueChange={(val) =>
                                  updateSchedule("freqType", parseInt(val))
                                }
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="4">
                                    {t("jobs.daily")}
                                  </SelectItem>
                                  <SelectItem value="8">
                                    {t("jobs.weekly")}
                                  </SelectItem>
                                  <SelectItem value="16">
                                    {t("jobs.monthly")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-3">
                              <Label className="font-semibold text-muted-foreground">
                                {t("jobs.freqInterval")}
                              </Label>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="number"
                                  min="1"
                                  value={sch.freqInterval}
                                  onChange={(e) =>
                                    updateSchedule(
                                      "freqInterval",
                                      parseInt(e.target.value),
                                    )
                                  }
                                  className="w-24"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {sch.freqType === 4
                                    ? t("jobs.days")
                                    : sch.freqType === 8
                                      ? t("jobs.weeks")
                                      : t("jobs.months")}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <Label className="font-semibold text-muted-foreground">
                                {t("jobs.startTime")}
                              </Label>
                              <Input
                                type="time"
                                value={sch.time}
                                onChange={(e) =>
                                  updateSchedule("time", e.target.value)
                                }
                                className="w-full"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground italic bg-muted/10 rounded-xl border-dashed border-2">
                    {t("jobs.noSchedules")}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="p-6 border-t glass-card shrink-0 rounded-none">
            <Button
              variant="outline"
              onClick={() => setEditorModal((p) => ({ ...p, isOpen: false }))}
              disabled={actionLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveJob}
              disabled={actionLoading}
              className="px-8 font-bold shadow-lg"
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={historyModal.isOpen}
        onOpenChange={(o) =>
          !o && setHistoryModal((p) => ({ ...p, isOpen: false }))
        }
      >
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl">
          <DialogHeader className="p-6 border-b glass-card shrink-0 shadow-sm z-10 rounded-none">
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              {historyModal.jobName} - {t("jobs.history")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/5 custom-scrollbar">
            {historyModal.loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw className="w-10 h-10 animate-spin text-primary opacity-20" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                  {t("jobs.loadingHistory")}
                </p>
              </div>
            ) : historyModal.history.length > 0 ? (
              <div className="space-y-6">
                {groupHistoryByRun(historyModal.history).map((run, runIdx) => (
                  <Card
                    key={runIdx}
                    className="overflow-hidden border-border/50 shadow-md transition-all hover:shadow-lg"
                  >
                    <div
                      className={cn(
                        "px-4 py-3 border-b flex justify-between items-center",
                        run.outcome?.RunStatus === 1
                          ? "bg-success/5 border-success/10"
                          : "bg-destructive/5 border-destructive/10",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {run.outcome?.RunStatus === 1 ? (
                          <div className="p-1.5 rounded-full bg-success/20 text-success">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-full bg-destructive/20 text-destructive">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {formatSqlDate(
                              run.outcome?.RunDate,
                              run.outcome?.RunTime,
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Duration: {formatDuration(run.outcome?.Duration)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          run.outcome?.RunStatus === 1
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-destructive/10 text-destructive border-destructive/20",
                        )}
                      >
                        {run.outcome?.RunStatus === 1
                          ? t("jobs.success")
                          : t("jobs.failed")}
                      </span>
                    </div>
                    {run.steps.length > 0 && (
                      <CardContent className="p-0">
                        <table className="w-full text-[12px] text-left">
                          <thead className="bg-muted/30 border-b">
                            <tr>
                              <th className="px-4 py-2 font-bold text-muted-foreground">
                                #
                              </th>
                              <th className="px-4 py-2 font-bold text-muted-foreground">
                                {t("jobs.stepName")}
                              </th>
                              <th className="px-4 py-2 font-bold text-muted-foreground">
                                {t("jobs.status")}
                              </th>
                              <th className="px-4 py-2 font-bold text-muted-foreground">
                                {t("jobs.duration")}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {run.steps.map((s, si) => (
                              <tr
                                key={si}
                                className="hover:bg-muted/10 transition-colors"
                              >
                                <td className="px-4 py-2.5 font-mono text-muted-foreground">
                                  {s.StepId}
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-foreground/80">
                                  {s.StepName}
                                </td>
                                <td className="px-4 py-2.5">
                                  {s.RunStatus === 1 ? (
                                    <span className="text-success flex items-center gap-1 font-bold">
                                      <CheckCircle2 className="w-3 h-3" /> OK
                                    </span>
                                  ) : (
                                    <span className="text-destructive flex items-center gap-1 font-bold">
                                      <AlertTriangle className="w-3 h-3" /> FAIL
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground font-mono">
                                  {formatDuration(s.Duration)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Ban className="w-12 h-12 opacity-10" />
                <p className="italic text-sm">{t("jobs.noHistory")}</p>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 border-t glass-card shrink-0 rounded-none">
            <Button
              onClick={() => setHistoryModal((p) => ({ ...p, isOpen: false }))}
              className="px-8"
            >
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
