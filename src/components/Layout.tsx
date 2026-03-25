import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListTodo, LogOut, User, Users, Shield, Briefcase, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationBell } from '@/components/tasks/NotificationBell';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, userRole, orgName, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  ];

  // Admin-only nav items
  const adminNavItems = isAdmin
    ? [
        { to: '/users', icon: Users, label: 'Users' },
        { to: '/designations', icon: Briefcase, label: 'Designations' },
        { to: '/access-management', icon: Shield, label: 'Access' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-bold text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {orgName || 'TaskManager'}
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    location.pathname === item.to
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}

              {adminNavItems.length > 0 && (
                <>
                  <div className="h-5 w-px bg-border mx-1" />
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                        location.pathname === item.to
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={(id) => markAsRead.mutate(id)}
              onMarkAllAsRead={() => markAllAsRead.mutate()}
              onNotificationClick={(n) => {
                if (n.task_id) navigate(`/tasks/${n.task_id}`);
              }}
            />

            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="hidden md:block">
                <p className="font-medium text-xs leading-tight">{profile?.full_name || user?.email}</p>
                {userRole && (
                  <p className="text-[10px] text-muted-foreground capitalize">{userRole.replace('_', ' ')}</p>
                )}
              </div>
            </div>

            <button
              onClick={signOut}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
