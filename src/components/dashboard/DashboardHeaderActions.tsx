import React from "react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import SmartTransactionDialog from "@/components/dashboard/SmartTransactionDialog";
import CSVImporter from "@/components/dashboard/CSVImporter";
import { useMobile } from "@/hooks/useMobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

const DashboardHeaderActions = () => {
  const isMobile = useMobile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to log out');
    } else {
      toast.success('Logged out successfully');
      navigate('/auth');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!isMobile && (
        <>
          <SmartTransactionDialog />
          <CSVImporter />
        </>
      )}
      <ThemeToggle />
      <Button variant="outline" size="icon" onClick={handleLogout} title="Log out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DashboardHeaderActions;
