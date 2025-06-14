
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface AdminContextProps {
  isAdmin: boolean;
  unlockAdmin: (password: string) => boolean;
  lockAdmin: () => void;
}

const AdminContext = createContext<AdminContextProps>({
  isAdmin: false,
  unlockAdmin: () => false,
  lockAdmin: () => {},
});

const ADMIN_PASSWORD = "dinosecret"; // You can change this to anything you like

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  // On mount, check sessionStorage for admin state
  useEffect(() => {
    if (sessionStorage.getItem("isAdmin") === "true") {
      setIsAdmin(true);
    }
  }, []);

  // If isAdmin changes, sync to sessionStorage
  useEffect(() => {
    if (isAdmin) {
      sessionStorage.setItem("isAdmin", "true");
    } else {
      sessionStorage.removeItem("isAdmin");
    }
  }, [isAdmin]);

  const unlockAdmin = (password: string) => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const lockAdmin = () => {
    setIsAdmin(false);
  };

  return (
    <AdminContext.Provider value={{ isAdmin, unlockAdmin, lockAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);

