

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/employees', label: 'Employees', icon: 'Users' },
  { href: '/ai-assistant', label: 'AI Assistant', icon: 'Bot' },
] as const;

export type NavHref = (typeof NAV_ITEMS)[number]['href'];
