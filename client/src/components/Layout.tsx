import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Spotlight } from './ui/Spotlight';
import { Meteors } from './ui/Meteors';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-cyber-bg overflow-hidden">
      {/* Aceternity Spotlight — left-top glow */}
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="rgba(0,229,255,0.12)" />

      {/* Aceternity Meteors — subtle background particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Meteors number={12} />
      </div>

      <div className="scan-line-effect" />
      <Sidebar />
      <main className="ml-56 flex-1 overflow-auto">
        <div className="cyber-grid min-h-screen">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
