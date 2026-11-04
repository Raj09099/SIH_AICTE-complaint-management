import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#263746] antialiased selection:bg-[#087F75] selection:text-white">
      {/* Dark Slate Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area - lg:pl-64 offsets fixed desktop sidebar (w-64) across all pages */}
      <div className="lg:pl-64 flex flex-col min-w-0 min-h-screen bg-white">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-[1600px] w-full mx-auto space-y-6 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
