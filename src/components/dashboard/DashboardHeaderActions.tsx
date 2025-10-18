
import React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import SmartTransactionDialog from "@/components/dashboard/SmartTransactionDialog";
import CSVImporter from "@/components/dashboard/CSVImporter";
import { useMobile } from "@/hooks/useMobile";

const DashboardHeaderActions = () => {
  const isMobile = useMobile();

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      {!isMobile && (
        <>
          <SmartTransactionDialog />
          <CSVImporter />
        </>
      )}
    </div>
  );
};

export default DashboardHeaderActions;
