'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { setToken, setRefreshToken } from '@/lib/auth';
import { ApiError } from '@suggar-daddy/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Button } from '@suggar-daddy/ui';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_KEY = 'admin_login_lockout';
const ATTEMPTS_KEY = 'admin_login_attempts';

function getLockoutState(): { attempts: number; lockedUntil: number | null } {
  if (typeof window === 'undefined') return { attempts: 0, lockedUntil: null };
  const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
  const lockedUntil = localStorage.getItem(LOCKOUT_KEY);
  return {
    attempts,
    lockedUntil: lockedUntil ? Number(lockedUntil) : null,
  };
}

function recordFailedAttempt(): { locked: boolean; lockedUntil: number | null } {
  const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
  localStorage.setItem(ATTEMPTS_KEY, String(attempts));
  if (attempts >= MAX_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem(LOCKOUT_KEY, String(until));
    return { locked: true, lockedUntil: until };
  }
  return { locked: false, lockedUntil: null };
}

function clearLoginAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_KEY);
}

export default function LoginPage() {
  const { t } = useTranslation('login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');

  // Check lockout state on mount
  useEffect(() => {
    const state = getLockoutState();
    if (state.lockedUntil && state.lockedUntil > Date.now()) {
      setLockedUntil(state.lockedUntil);
    } else if (state.lockedUntil) {
      clearLoginAttempts();
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        clearLoginAttempts();
        setLockedUntil(null);
        setCountdown('');
        setError('');
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && lockedUntil > Date.now();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      clearLoginAttempts();
      setToken(res.accessToken);
      if (res.refreshToken) {
        setRefreshToken(res.refreshToken);
      }
      router.replace('/');
    } catch (err: unknown) {
      const msg = ApiError.getMessage(err, 'Login failed');
      const result = recordFailedAttempt();
      if (result.locked) {
        setLockedUntil(result.lockedUntil);
        setError(t('tooManyAttempts'));
      } else {
        const remaining = MAX_ATTEMPTS - parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
        setError(t('attemptsRemaining', { msg, count: remaining }));
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, isLocked, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
                {isLocked && countdown && (
                  <p className="mt-1 font-mono text-xs">{t('tryAgainIn', { time: countdown })}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || isLocked}>
              {loading ? t('signingIn') : isLocked ? t('accountLocked') : t('signIn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
