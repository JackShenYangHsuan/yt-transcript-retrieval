"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Custom event for resetting constellation view
export const RESET_CONSTELLATION_EVENT = "reset-constellation-view";

const tabs = [
  { name: "Idea Constellation", path: "/" },
  { name: "Search", path: "/search" },
  { name: "How it Works", path: "/how-it-works" },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Handle logo click - reset constellation view if already on home
  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(RESET_CONSTELLATION_EVENT));
    }
  };

  // Update indicator position when route changes
  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.path === pathname);
    const activeTab = tabRefs.current[activeIndex];

    if (activeTab) {
      const { offsetLeft, offsetWidth } = activeTab;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [pathname]);

  return (
    <div className="fixed top-4 left-4 z-50 flex items-center gap-3">
      {/* Logo - navigates to Idea Constellation (resets view if already there) */}
      <Link
        href="/"
        onClick={handleLogoClick}
        className="flex items-center gap-2 bg-white rounded-full shadow-lg px-3 h-12 hover:shadow-xl transition-shadow flex-shrink-0"
      >
        <img
          src="/lenny-logo.webp"
          alt="Lenny's Podcast"
          className="w-8 h-8"
        />
        <span className="text-sm font-semibold text-gray-900 pr-1">
          Lenny&apos;s Podcast
        </span>
      </Link>

      {/* Menu Bar with animated indicator */}
      <div className="bg-white rounded-full shadow-lg px-2 h-12 flex items-center relative flex-shrink-0">
        {/* Sliding black pill indicator */}
        <div
          className="absolute h-8 bg-gray-900 rounded-full transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />

        {/* Tab links */}
        {tabs.map((tab, index) => (
          <Link
            key={tab.path}
            href={tab.path}
            ref={(el) => { tabRefs.current[index] = el; }}
            className={`relative z-10 text-sm px-4 py-1.5 rounded-full transition-colors duration-200 ${
              pathname === tab.path
                ? "text-white font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
