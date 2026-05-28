import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 200);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside 
      className={`fixed left-0 top-0 z-40 flex h-screen w-56 flex-col overflow-hidden transition-all duration-300 ${
        glitchActive ? 'animate-glitch' : ''
      }`}
      style={{
        background: `linear-gradient(180deg, rgba(5, 5, 5, 0.95) 0%, rgba(10, 10, 15, 0.98) 100%)`,
        borderRight: '1px solid rgba(0, 229, 255, 0.15)',
        boxShadow: '4px 0 24px rgba(0, 229, 255, 0.08)',
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 229, 255, 0.1) 0%, transparent 80%)',
        }}
      />

      {/* Scan line effect */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.05) 2px, rgba(0, 229, 255, 0.05) 4px)',
        }}
      />

      {/* Relative container for content */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Logo Section */}
        <div 
          className="group relative border-b px-5 py-5 transition-all duration-300"
          style={{ borderColor: 'rgba(0, 229, 255, 0.1)' }}
        >
          {/* Glow effect on hover */}
          <div 
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.05), transparent)',
            }}
          />
          
          <div className="relative flex items-center gap-3">
            {/* Logo icon with neon glow */}
            <div 
              className="relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 group-hover:shadow-lg group-hover:shadow-cyan-500/20"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)',
              }}
            >
              <span 
                className="font-mono text-xl font-bold tracking-wider transition-all duration-300"
                style={{
                  color: '#00e5ff',
                  textShadow: '0 0 10px rgba(0, 229, 255, 0.8), 0 0 20px rgba(0, 229, 255, 0.4)',
                }}
              >
                P
              </span>
              
              {/* Pulse ring */}
              <div 
                className="absolute inset-0 animate-ping rounded-lg opacity-20"
                style={{ border: '1px solid #00e5ff' }}
              />
            </div>

            <div className="flex flex-col">
              <h1 
                className="text-base font-bold tracking-[0.25em] transition-all duration-300"
                style={{ color: '#e0e0ec' }}
              >
                PULSE
              </h1>
              <p 
                className="font-mono text-[10px] tracking-[0.3em] transition-all duration-300"
                style={{ 
                  color: '#6b6b8a',
                  textShadow: glitchActive ? '2px 0 #ff2d95, -2px 0 #00e5ff' : 'none',
                }}
              >
                {'// MONITOR_v1.0'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `
              group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
              transition-all duration-300 ease-out
              ${isActive 
                ? 'text-white' 
                : 'text-gray-500 hover:text-gray-300'
              }
            `}
            style={({ isActive }) => isActive ? {
              background: 'linear-gradient(90deg, rgba(0, 229, 255, 0.12) 0%, transparent 100%)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              boxShadow: 'inset 0 0 20px rgba(0, 229, 255, 0.08), 0 0 15px rgba(0, 229, 255, 0.15)',
            } : {
              border: '1px solid transparent',
            }}
          >
            {({ isActive }) => (
              <>
                {/* Hover glow effect */}
                <div 
                  className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: 'linear-gradient(90deg, rgba(0, 229, 255, 0.06) 0%, transparent 100%)',
                    boxShadow: isActive ? 'none' : '0 0 20px rgba(0, 229, 255, 0.1)',
                  }}
                />
                
                <svg 
                  className="relative h-4 w-4 transition-all duration-300 group-hover:scale-110" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke={isActive ? '#00e5ff' : 'currentColor'} 
                  strokeWidth={2}
                  style={isActive ? { 
                    filter: 'drop-shadow(0 0 3px rgba(0, 229, 255, 0.6))',
                  } : {}}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                
                <span className="relative font-mono tracking-wide">Dashboard</span>
                
                {/* Active indicator */}
                {isActive && (
                  <div 
                    className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full"
                    style={{
                      background: '#00e5ff',
                      boxShadow: '0 0 10px rgba(0, 229, 255, 0.8)',
                    }}
                  />
                )}
              </>
            )}
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) => `
              group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
              transition-all duration-300 ease-out
              ${isActive 
                ? 'text-white' 
                : 'text-gray-500 hover:text-gray-300'
              }
            `}
            style={({ isActive }) => isActive ? {
              background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.12) 0%, transparent 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              boxShadow: 'inset 0 0 20px rgba(168, 85, 247, 0.08), 0 0 15px rgba(168, 85, 247, 0.15)',
            } : {
              border: '1px solid transparent',
            }}
          >
            {({ isActive }) => (
              <>
                {/* Hover glow effect */}
                <div 
                  className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.06) 0%, transparent 100%)',
                    boxShadow: isActive ? 'none' : '0 0 20px rgba(168, 85, 247, 0.1)',
                  }}
                />
                
                <svg 
                  className="relative h-4 w-4 transition-all duration-300 group-hover:scale-110" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke={isActive ? '#a855f7' : 'currentColor'} 
                  strokeWidth={2}
                  style={isActive ? { 
                    filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.6))',
                  } : {}}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                
                <span className="relative font-mono tracking-wide">Settings</span>
                
                {/* Active indicator */}
                {isActive && (
                  <div 
                    className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full"
                    style={{
                      background: '#a855f7',
                      boxShadow: '0 0 10px rgba(168, 85, 247, 0.8)',
                    }}
                  />
                )}
              </>
            )}
          </NavLink>
        </nav>

        {/* Footer Status */}
        <div 
          className="border-t px-5 py-3 transition-all duration-300"
          style={{ borderColor: 'rgba(0, 229, 255, 0.1)' }}
        >
          <div className="flex items-center gap-3">
            {/* Status indicator with pulse */}
            <div className="relative flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span 
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: '#00e5ff' }}
                />
                <span 
                  className="relative inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ 
                    backgroundColor: '#00e5ff',
                    boxShadow: '0 0 8px rgba(0, 229, 255, 0.8)',
                  }}
                />
              </span>
              <span 
                className="font-mono text-[11px] tracking-[0.2em] font-medium"
                style={{ color: '#00e5ff', textShadow: '0 0 5px rgba(0, 229, 255, 0.5)' }}
              >
                SYSTEM ONLINE
              </span>
            </div>
          </div>
          
          {/* Version info */}
          <div 
            className="mt-2 font-mono text-[9px] tracking-wider"
            style={{ color: '#4a4a5e' }}
          >
            v1.0.0 // BUILD_20260527
          </div>
        </div>
      </div>
    </aside>
  );
}
