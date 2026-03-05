import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useSettings() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<any>(null);
  const originalConfigRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saveMessage, setSaveMessage] = useState({
    show: false,
    success: false,
    text: "",
    type: "success",
  });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.configGet();
      if (res?.success) {
        originalConfigRef.current = JSON.parse(JSON.stringify(res.data));
        setConfig(res.data);
      }
    } catch (error) {
      console.error(t("settings.configLoadError"), error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const saveConfig = async () => {
    setSaveMessage({ show: false, success: false, text: "", type: "success" });
    const isChanged =
      JSON.stringify(originalConfigRef.current) !== JSON.stringify(config);

    if (!isChanged) {
      showMessage(t("settings.noChangesMade"), "info");
      return;
    }

    setSaving(true);
    try {
      const res = await (window as any).electronAPI.configSet(config);
      if (res?.success) {
        originalConfigRef.current = JSON.parse(JSON.stringify(config));
        showMessage(t("settings.saveSuccess"), "success");
      } else {
        showMessage(`${t("settings.saveFailed")} ${res.message}`, "error");
      }
    } catch (error: any) {
      showMessage(`${t("settings.errorPrefix")} ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (text: string, type: "success" | "error" | "info") => {
    setSaveMessage({ show: true, success: type === "success", text, type });
    setTimeout(
      () => setSaveMessage({ show: false, success: false, text: "", type: "" }),
      3000,
    );
  };

  const handleNestedChange = (section: string, field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handlePermissionChange = (field: string, checked: boolean) => {
    setConfig((prev: any) => ({
      ...prev,
      security: {
        ...prev.security,
        requirePasswordFor: {
          ...prev.security.requirePasswordFor,
          [field]: checked,
        },
      },
    }));
  };

  return {
    config,
    loading,
    saving,
    saveMessage,
    loadConfig,
    saveConfig,
    handleNestedChange,
    handlePermissionChange,
  };
}
