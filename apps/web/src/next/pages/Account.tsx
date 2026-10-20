import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@next/components/PageHeader';
import { Card } from '@next/components/ui/card';
import { Button } from '@next/components/ui/button';
import { Avatar, AvatarFallback } from '@next/components/ui/avatar';
import { Separator } from '@next/components/ui/separator';
import { authApi } from '@/api/auth';
import { Shield, KeyRound, LogOut, MonitorSmartphone, ShieldCheck } from 'lucide-react';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <Card className="rounded-sm border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
        <h3 className="font-heading text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export default function Account() {
  // Seed from the cached session so the card renders instantly; the effect
  // refreshes it from the server.
  const stored = authApi.getStoredUser();
  const [username, setUsername] = useState<string>(stored?.username || '');
  const [isAdmin, setIsAdmin] = useState<boolean>(!!stored?.is_admin);
  const [userId, setUserId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    authApi.me()
      .then((me) => {
        if (!active) return;
        setUsername(me.username);
        setIsAdmin(me.is_admin);
        setUserId(me.id);
      })
      .catch(() => { /* token handled by the 401 interceptor */ });
    return () => { active = false; };
  }, []);

  const displayName = username || 'User';
  const role = isAdmin ? 'Administrator' : 'User';

  const handleSignOut = () => {
    authApi.logout();
    navigate('/login');
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader eyebrow="Operator" title="Account" description="Your profile, role, and session." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="h-fit rounded-sm border-border bg-card lg:col-span-1">
          <div className="relative h-16 overflow-hidden border-b border-border bg-muted/40">
            <div className="absolute inset-0 grid-texture-fine opacity-60" />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Operator Profile</span>
          </div>
          <div className="flex flex-col items-center px-6 pb-6 pt-5 text-center">
            <Avatar className="h-16 w-16 rounded-none border border-border bg-card">
              <AvatarFallback className="rounded-none bg-primary/10 font-mono text-lg font-semibold text-primary">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <h2 className="mt-3 font-heading text-base font-semibold text-foreground">{displayName}</h2>
            <span className="mt-3 inline-flex items-center gap-1.5 border border-primary/40 bg-primary/[0.08] px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider text-primary">
              <Shield className="h-3 w-3" />{role}
            </span>
            <Separator className="my-5 bg-border" />
            <div className="w-full space-y-3 text-left">
              <div className="flex items-center gap-2.5 text-[12px] text-muted-foreground">
                <Shield className="h-3.5 w-3.5" /><span>{role}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[12px] text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" /><span className="font-mono text-[11px]">{userId !== null ? `User ID ${userId}` : '—'}</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="mt-5 w-full gap-2 rounded-sm border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-rose-400 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Section title="Vault">
            <div className="flex items-start gap-3">
              <MonitorSmartphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <div className="space-y-1.5 text-[13px] text-muted-foreground">
                <p className="font-medium text-foreground">Your vault lives in the Guardian apps</p>
                <p>
                  Account creation is done here, but the encrypted vault is only created, unlocked and
                  synced in the desktop and mobile apps. Sign in there with the same username and
                  password to set up your vault.
                </p>
              </div>
            </div>
          </Section>

          {!isAdmin && (
            <Section title="Access">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <p className="text-[13px] text-muted-foreground">
                  This dashboard is administered by your server operator. Ask an administrator if you
                  need an invite, a reset, or your account disabled.
                </p>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
