import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Briefcase, GitBranch, BarChart3, LogOut, Globe, Network, Shield, CalendarOff } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const Layout = () => {
  const { t, i18n } = useTranslation();
  const { user, loading, login, logout } = useAuth();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/resources', icon: Users, label: t('nav.resources') },
    { path: '/projects', icon: Briefcase, label: t('nav.projects') },
    { path: '/allocations', icon: GitBranch, label: t('nav.allocations') },
    { path: '/leaves', icon: CalendarOff, label: 'Time Off' },
    { path: '/analytics', icon: BarChart3, label: t('nav.analytics') },
    { path: '/hierarchy', icon: Network, label: 'Hierarchy' },
  ];

  // Add admin menu for admins only
  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', icon: Shield, label: 'Admin Panel' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center max-w-md" data-testid="login-screen">
          <h1 className="text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {t('auth.welcome')}
          </h1>
          <p className="text-sm text-muted-foreground mb-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {t('auth.pleaseSignIn')}
          </p>
          <Button 
            onClick={login} 
            className="rounded-sm font-medium"
            data-testid="sign-in-button"
            style={{ backgroundColor: '#002FA7' }}
          >
            {t('auth.signIn')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <aside className="w-64 flex-shrink-0" style={{ backgroundColor: '#0F172A', color: '#F8FAFC' }}>
        <div className="h-full flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="app-title">
              Alloc8
            </h1>
            <p className="text-xs text-slate-400 mt-1">Resource Intelligence</p>
          </div>
          
          <nav className="flex-1 px-3" data-testid="main-navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-sm mb-1 text-sm transition-colors duration-200 ${
                    isActive
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
                data-testid={`nav-${item.path.slice(1) || 'dashboard'}`}
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t" style={{ borderColor: '#1E293B' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-sm flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#3B82F6' }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="text-xs flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white" data-testid="user-name">{user?.name}</p>
                    <span className="px-1.5 py-0.5 bg-white/10 rounded text-xs">
                      {user?.role || 'user'}
                    </span>
                  </div>
                  <p className="text-slate-400">{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 rounded-sm" data-testid="language-selector">
                    <Globe className="w-4 h-4 mr-2" />
                    {i18n.language.toUpperCase()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => changeLanguage('en')} data-testid="lang-en">English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('pt')} data-testid="lang-pt">Português</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('es')} data-testid="lang-es">Español</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('zh')} data-testid="lang-zh">中文</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={logout} className="rounded-sm" data-testid="logout-button">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
