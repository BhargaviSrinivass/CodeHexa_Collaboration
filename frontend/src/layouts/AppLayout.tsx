import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16 pt-12 md:pb-0 md:pt-0">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}
