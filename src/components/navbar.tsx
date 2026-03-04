'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, ClipboardCheck, Home } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/approval-process', label: 'Approval Timeline', icon: ClipboardCheck },
    { href: '/medtech_products', label: 'Products', icon: Activity },
  ];

  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0A3161] h-14">
      <div className="container mx-auto flex h-full max-w-screen-2xl items-center justify-between px-4">
        {/* Left side - Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#2dd4bf] flex items-center justify-center">
              <Home className="w-4 h-4 text-[#0A3161]" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">AcuityMD</span>
          </Link>

          {/* Navigation links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full py-1.5 px-4 text-sm font-medium transition-colors flex items-center gap-2 ${
                  pathname === href
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right side - Guest badge */}
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm">Guest Mode</span>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white text-sm font-medium">G</span>
          </div>
        </div>
      </div>
    </nav>
  );
} 
