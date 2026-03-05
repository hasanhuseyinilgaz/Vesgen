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
  Save,
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
import CustomTabs from "@/components/CustomTabs";
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

import ActionTooltip from "@/components/ActionTooltip";

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
    fetchJobs();
  }, [fetchJobs]);

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

  const addStep = async () => {
    const db = await getCurrentDbName();
    setEditorModal((p) => ({
      ...p,
      data: {
        ...p.data,
        steps: [
          ...p.data.steps,
          { id: Date.now(), name: t("jobs.newStep"), db, cmd: "" },
        ],
      },
    }));
  };

  const updateStep = (id: number, field: string, value: string) => {
    setEditorModal((p) => ({
      ...p,
      data: {
        ...p.data,
        steps: p.data.steps.map((s: any) =>
          s.id === id ? { ...s, [field]: value } : s,
        ),
      },
    }));
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

  return (
    <PageLayout>
      <div className="flex h-screen bg-background flex-col w-full relative z-0">
        <div className="p-6 pb-4 border-b bg-muted/10 shrink-0 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <ServerCog className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {t("jobs.title")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("jobs.description")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder={t("jobs.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 bg-card border-border/50"
            />
            <ActionTooltip label={t("common.refresh")} side="bottom">
              <Button
                onClick={() => fetchJobs(false)}
                disabled={loading || actionLoading}
                variant="outline"
                size="icon"
                className="shadow-sm border-border/50"
              >
                <RefreshCw
                  className={cn("w-4 h-4", loading && "animate-spin")}
                />
              </Button>
            </ActionTooltip>
            <div className="w-px h-8 bg-border/50 mx-1"></div>
            <Button
              onClick={openEditorForCreate}
              className="bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-primary/20"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> {t("jobs.createJob")}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-muted/5 custom-scrollbar">
          <Card className="border-border/50 shadow-sm overflow-hidden bg-card">
            <CardContent className="p-0">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 border-b border-border/50">
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
                          "transition-all duration-200",
                          job.IsEnabled
                            ? "hover:bg-muted/30"
                            : "opacity-60 bg-muted/10",
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
          <DialogHeader className="p-6 border-b bg-card shrink-0 shadow-sm z-10">
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
                    className="relative border-border/60 shadow-md"
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
                      className="relative border-border/60 shadow-md"
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
                            <div className="space-y-3 border-l pl-8">
                              <Label className="font-semibold text-muted-foreground">
                                {t("jobs.scheduleDetails")}
                              </Label>
                              {sch.freqType === 8 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {t("jobs.every")}
                                  </span>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="w-16 h-8 text-center"
                                    value={sch.freqInterval}
                                    onChange={(e) =>
                                      updateSchedule(
                                        "freqInterval",
                                        e.target.value,
                                      )
                                    }
                                  />
                                  <span className="text-sm">
                                    {t("jobs.weeks")}
                                  </span>
                                </div>
                              )}
                              {sch.freqType === 16 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {t("jobs.dayOf")}
                                  </span>
                                  <Input
                                    type="number"
                                    min="1"
                                    className="w-16 h-8 text-center"
                                    value={sch.freqInterval}
                                    onChange={(e) =>
                                      updateSchedule(
                                        "freqInterval",
                                        e.target.value,
                                      )
                                    }
                                  />
                                  <span className="text-sm">
                                    {t("jobs.day")}
                                  </span>
                                </div>
                              )}
                              <div className="pt-4 border-t mt-4">
                                <Label className="font-semibold text-muted-foreground mb-2 block">
                                  {t("jobs.runTime")}
                                </Label>
                                <Input
                                  type="time"
                                  className="w-32 font-bold bg-background"
                                  value={sch.time}
                                  onChange={(e) =>
                                    updateSchedule("time", e.target.value)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                    {t("jobs.noSchedules")}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-card">
            <Button
              variant="outline"
              onClick={() => setEditorModal((p) => ({ ...p, isOpen: false }))}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveJob}
              disabled={actionLoading}
              className="bg-primary text-primary-foreground px-8 font-bold"
            >
              {actionLoading && (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              )}{" "}
              {t("jobs.saveAndApply")}
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
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background border-border/50 shadow-2xl">
          <DialogHeader className="p-6 border-b bg-card shrink-0 shadow-sm z-10 flex flex-row justify-between items-center">
            <DialogTitle className="flex items-center text-xl text-foreground">
              <History className="w-6 h-6 mr-3 text-primary" />{" "}
              {t("jobs.historyTitle")}: {historyModal.jobName}
            </DialogTitle>
            <Button
              onClick={() => openHistory(historyModal.jobName)}
              variant="outline"
              size="sm"
              className="shadow-sm"
            >
              <RefreshCw
                className={cn(
                  "w-3.5 h-3.5 mr-1.5",
                  historyModal.loading && "animate-spin",
                )}
              />{" "}
              {t("common.refresh")}
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-muted/5 custom-scrollbar">
            {historyModal.loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <RefreshCw className="w-10 h-10 animate-spin mb-4 opacity-30" />
                {t("jobs.analyzingHistory")}
              </div>
            ) : groupHistoryByRun(historyModal.history).length === 0 ? (
              <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-card">
                {t("jobs.noHistory")}
              </div>
            ) : (
              <div className="space-y-10">
                {groupHistoryByRun(historyModal.history).map(
                  (run: any, idx: number) => {
                    const isSuccess = run.outcome?.RunStatus === 1;
                    const isFail = run.outcome?.RunStatus === 0;
                    return (
                      <div
                        key={idx}
                        className="relative bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {run.steps.length > 0 && (
                          <div className="absolute top-[60px] bottom-10 left-[41px] w-0.5 bg-border z-0" />
                        )}
                        <div className="relative z-10 flex items-start gap-4 mb-2">
                          <div className="bg-card p-1 -ml-1 rounded-full shrink-0">
                            {isSuccess ? (
                              <CheckCircle2 className="w-7 h-7 text-success fill-success/10" />
                            ) : isFail ? (
                              <AlertTriangle className="w-7 h-7 text-destructive fill-destructive/10" />
                            ) : (
                              <Ban className="w-7 h-7 text-warning fill-warning/10" />
                            )}
                          </div>
                          <div className="flex-1 pt-0.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <h4 className="font-bold text-lg text-foreground tracking-tight">
                                {t("jobs.runResult")}
                              </h4>
                              <span className="text-xs font-semibold text-muted-foreground bg-muted/80 px-2.5 py-1 rounded-md border border-border/50">
                                {formatSqlDate(
                                  run.outcome?.RunDate,
                                  run.outcome?.RunTime,
                                )}
                              </span>
                            </div>
                            {run.outcome?.Duration !== undefined && (
                              <p className="text-xs font-bold text-muted-foreground mt-1.5 uppercase tracking-wider">
                                {t("jobs.totalDuration")}:{" "}
                                {formatDuration(run.outcome.Duration)}
                              </p>
                            )}
                            <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                              {run.outcome?.Message}
                            </p>
                          </div>
                        </div>
                        {run.steps.length > 0 && (
                          <div className="space-y-6 mt-8 pl-[46px]">
                            {[...run.steps]
                              .reverse()
                              .map((step: any, j: number) => {
                                const stepSuccess = step.RunStatus === 1;
                                return (
                                  <div
                                    key={j}
                                    className="relative z-10 flex items-start gap-4"
                                  >
                                    <div
                                      className={cn(
                                        "absolute left-[-31px] top-1.5 w-3 h-3 rounded-full border-2 border-card",
                                        stepSuccess
                                          ? "bg-success"
                                          : step.RunStatus === 0
                                            ? "bg-destructive"
                                            : "bg-warning",
                                      )}
                                    />
                                    <div className="flex-1 w-full overflow-hidden">
                                      <div className="flex items-center gap-2">
                                        <Terminal className="w-3.5 h-3.5 text-primary" />
                                        <h5 className="font-bold text-sm text-foreground">
                                          {t("jobs.step")} {step.StepId}:{" "}
                                          {step.StepName}
                                        </h5>
                                      </div>
                                      <div className="mt-2 text-[12px] font-mono leading-relaxed text-muted-foreground/90 bg-muted/40 p-3 rounded-lg border border-border/50 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                                        {step.Message}
                                      </div>
                                      <div className="flex gap-4 mt-2 text-[11px] font-semibold text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {formatDuration(step.Duration)}
                                        </span>
                                        <span
                                          className={
                                            stepSuccess
                                              ? "text-success"
                                              : "text-destructive"
                                          }
                                        >
                                          {stepSuccess
                                            ? t("jobs.success")
                                            : t("jobs.failed")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
