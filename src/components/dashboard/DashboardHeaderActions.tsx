
import React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import SmartTransactionDialog from "@/components/dashboard/SmartTransactionDialog";
import CSVImporter from "@/components/dashboard/CSVImporter";
import { Button } from "@/components/ui/button";
import { Lock, LockOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMobile } from "@/hooks/useMobile";
import { useAdmin } from "@/contexts/AdminContext";

const LockButton = () => {
  const { isAdmin, lockAdmin } = useAdmin();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={isAdmin ? "Lock Editing" : "Unlock Editing"}
        onClick={() => {
          if (isAdmin) {
            lockAdmin();
            toast.info("Read-only mode enabled.");
          } else {
            setDialogOpen(true);
          }
        }}
      >
        {isAdmin ? (
          <LockOpen className="w-5 h-5 text-green-600" />
        ) : (
          <Lock className="w-5 h-5 text-orange-500" />
        )}
      </Button>
      <AdminUnlockDialog open={dialogOpen} setOpen={setDialogOpen} />
    </>
  );
};

const AdminUnlockDialog = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) => {
  const { unlockAdmin } = useAdmin();
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleUnlock = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (unlockAdmin(password)) {
        toast.success("Edit mode unlocked!");
        setOpen(false);
      } else {
        toast.error("Incorrect password");
      }
      setIsLoading(false);
      setPassword("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock Edit Mode</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="admin-pass">
            Enter Admin Password:
          </label>
          <Input
            id="admin-pass"
            type="password"
            value={password}
            disabled={isLoading}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleUnlock();
            }}
            autoFocus
          />
          <Button
            className="w-full mt-2"
            onClick={handleUnlock}
            disabled={isLoading || !password}
          >
            {isLoading ? "Unlocking..." : "Unlock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DashboardHeaderActions = () => {
  const { isAdmin } = useAdmin();
  const isMobile = useMobile();

  // Smart transaction dialog and CSVImporter are shown on desktop; on mobile, to be rendered below elsewhere
  // This header component renders only the right header actions
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      <LockButton />
      {!isMobile && (
        <>
          <SmartTransactionDialog />
          {/* Only show CSVImporter if admin */}
          {isAdmin && <CSVImporter />}
        </>
      )}
    </div>
  );
};

export default DashboardHeaderActions;
