import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

import ActionTooltip from "@/components/ActionTooltip";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
}: PasswordModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const displayTitle = title || t("components.passwordModal.defaultTitle");
  const displayDesc = description || t("components.passwordModal.defaultDesc");

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await (window as any).electronAPI.authVerifyAdmin(password);

      if (res?.success) {
        setPassword("");
        onSuccess();
      } else {
        setError(res?.message || t("components.passwordModal.wrongPassword"));
      }
    } catch (err: any) {
      setError(err.message || t("components.passwordModal.verifyError"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword("");
      setError("");
      setShowPassword(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <ActionTooltip
              label={t("components.passwordModal.authRequired")}
              side="top"
            >
              <Lock className="w-5 h-5 cursor-help" />
            </ActionTooltip>
            {displayTitle}
          </DialogTitle>
          <DialogDescription>{displayDesc}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2 relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("components.passwordModal.placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="h-11 pr-10"
            />

            <div className="absolute right-3 top-3">
              <ActionTooltip
                label={showPassword ? t("common.hide") : t("common.show")}
                side="top"
              >
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </ActionTooltip>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center mt-2 font-medium animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 mr-1.5" /> {error}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              {t("components.passwordModal.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!password || loading}
              className="min-w-[100px]"
            >
              {loading
                ? t("components.passwordModal.verifying")
                : t("components.passwordModal.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
