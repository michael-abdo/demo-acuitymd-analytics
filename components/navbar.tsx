'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { useBasePath } from '@/lib/hooks';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const { pagePath, assetPath, withoutBasePath } = useBasePath();
  const userName = user?.name || 'Sign In';
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!session) {
      e.preventDefault();
      // Use the current page as the callback URL when signing in
      // Ensure pathname is never null by providing a default value
      const callbackUrl = pathname ? withoutBasePath(pathname) : '/dashboard';
      signIn("azure-ad", { callbackUrl: pagePath(callbackUrl) });
    } else {
      e.preventDefault();
      setShowDropdown(!showDropdown);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="fixed top-0 z-50 w-full bg-[#152C5B] h-14">
      <div className="container mx-auto flex h-full max-w-screen-2xl items-center justify-between px-4">
        {/* Left side - Anomaly Detector button */}
        <Link href={pagePath("/dashboard")} className="bg-white rounded-full py-1 px-4 flex items-center space-x-2">
          {/* Document icon */}
          <div className="w-6 h-6 rounded-full border border-[#152C5B] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <span className="text-[#152C5B] font-medium">{process.env.NEXT_PUBLIC_APP_NAME || 'Template App'}</span>
        </Link>

        {/* Center - Logo */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <img src={assetPath("/logo.svg")} alt="Logo" className="w-6 h-6" />
        </div>

        {/* Right side - User Profile button with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleProfileClick}
            className="bg-white rounded-full py-1 px-4 flex items-center space-x-2"
          >
            <span className="text-[#152C5B] font-medium">{userName}</span>
            <div className="w-6 h-6 rounded-full border border-[#152C5B] flex items-center justify-center">
              <img src={assetPath("/user.svg")} alt="User" className="w-4 h-4" />
            </div>
          </button>

          {/* Dropdown menu */}
          {session && showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
              </div>
              <Link 
                href={pagePath("/profile")} 
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                onClick={() => setShowDropdown(false)}
              >
                <img src={assetPath("/settings.svg")} alt="Settings" className="h-4 w-4 mr-2 text-gray-500" />
                Profile settings
              </Link>
              <button
                onClick={() => {
                  signOut({ callbackUrl: pagePath('/dashboard') });
                  setShowDropdown(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <img src={assetPath("/logout.svg")} alt="Logout" className="h-4 w-4 mr-2 text-gray-500" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 