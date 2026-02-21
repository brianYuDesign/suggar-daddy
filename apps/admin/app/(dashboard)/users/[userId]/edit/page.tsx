'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { usePermissions, AdminPermission } from '@/lib/permissions';
import { useToast } from '@/components/toast';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Skeleton, Badge } from '@suggar-daddy/ui';

export default function UserEditPage() {
  const { t } = useTranslation('users');
  const { requirePermission, isSuperAdmin } = usePermissions();
  requirePermission(AdminPermission.EDIT_ALL_DATA);

  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const userId = params.userId as string;
  const [saving, setSaving] = useState(false);

  const { data: user, loading } = useAdminQuery(
    () => adminApi.getUserDetail(userId),
    [userId],
  );

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    username: '',
    bio: '',
    userType: '',
    permissionRole: '',
    city: '',
    country: '',
    dmPrice: '',
    birthDate: '',
    preferredAgeMin: '',
    preferredAgeMax: '',
    preferredDistance: '',
    verificationStatus: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || '',
        email: user.email || '',
        username: (user as any).username || '',
        bio: (user as any).bio || '',
        userType: (user as any).userType || '',
        permissionRole: (user as any).permissionRole || '',
        city: (user as any).city || '',
        country: (user as any).country || '',
        dmPrice: (user as any).dmPrice?.toString() || '',
        birthDate: (user as any).birthDate || '',
        preferredAgeMin: (user as any).preferredAgeMin?.toString() || '',
        preferredAgeMax: (user as any).preferredAgeMax?.toString() || '',
        preferredDistance: (user as any).preferredDistance?.toString() || '',
        verificationStatus: (user as any).verificationStatus || '',
      });
    }
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, any> = {};

      // Only send changed fields
      if (form.displayName) updateData.displayName = form.displayName;
      if (form.email) updateData.email = form.email;
      if (form.username) updateData.username = form.username;
      if (form.bio !== undefined) updateData.bio = form.bio;
      if (form.userType) updateData.userType = form.userType;
      if (form.permissionRole) updateData.permissionRole = form.permissionRole;
      if (form.city !== undefined) updateData.city = form.city;
      if (form.country !== undefined) updateData.country = form.country;
      if (form.dmPrice) updateData.dmPrice = parseFloat(form.dmPrice);
      if (form.birthDate) updateData.birthDate = form.birthDate;
      if (form.preferredAgeMin) updateData.preferredAgeMin = parseInt(form.preferredAgeMin, 10);
      if (form.preferredAgeMax) updateData.preferredAgeMax = parseInt(form.preferredAgeMax, 10);
      if (form.preferredDistance) updateData.preferredDistance = parseInt(form.preferredDistance, 10);
      if (form.verificationStatus) updateData.verificationStatus = form.verificationStatus;

      const result = await adminApi.updateUser(userId, updateData);
      toast.success(result.message);
      router.push(`/users/${userId}`);
    } catch (err: any) {
      toast.error(err?.message || t('edit.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/users/${userId}`} className="text-sm text-muted-foreground hover:text-foreground">
          &larr; {t('edit.backToDetail')}
        </Link>
        <Badge variant="destructive">{t('edit.superAdminOnly')}</Badge>
      </div>

      <h1 className="text-2xl font-bold">{t('edit.title', { name: user?.displayName || userId })}</h1>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('edit.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">{t('edit.displayName')}</label>
              <Input
                value={form.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.email')}</label>
              <Input
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.username')}</label>
              <Input
                value={form.username}
                onChange={(e) => handleChange('username', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.birthDate')}</label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t('edit.bio')}</label>
            <textarea
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Roles & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('edit.rolesPermissions')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">{t('edit.userType')}</label>
              <select
                value={form.userType}
                onChange={(e) => handleChange('userType', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="sugar_baby">{t('edit.sugarBaby')}</option>
                <option value="sugar_daddy">{t('edit.sugarDaddy')}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.permissionRole')}</label>
              <select
                value={form.permissionRole}
                onChange={(e) => handleChange('permissionRole', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="subscriber">Subscriber</option>
                <option value="creator">Creator</option>
                <option value="admin">Admin</option>
                {isSuperAdmin() && <option value="super_admin">Super Admin</option>}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.verificationStatus')}</label>
              <select
                value={form.verificationStatus}
                onChange={(e) => handleChange('verificationStatus', e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="unverified">{t('edit.unverified')}</option>
                <option value="pending">{t('edit.pending')}</option>
                <option value="verified">{t('edit.verified')}</option>
                <option value="rejected">{t('edit.rejected')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location & Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('edit.locationPreferences')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">{t('edit.city')}</label>
              <Input
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.country')}</label>
              <Input
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.dmPrice')}</label>
              <Input
                type="number"
                value={form.dmPrice}
                onChange={(e) => handleChange('dmPrice', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.preferredDistance')}</label>
              <Input
                type="number"
                value={form.preferredDistance}
                onChange={(e) => handleChange('preferredDistance', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.preferredAgeMin')}</label>
              <Input
                type="number"
                value={form.preferredAgeMin}
                onChange={(e) => handleChange('preferredAgeMin', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('edit.preferredAgeMax')}</label>
              <Input
                type="number"
                value={form.preferredAgeMax}
                onChange={(e) => handleChange('preferredAgeMax', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('edit.saving') : t('edit.saveChanges')}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/users/${userId}`)}>
          {t('common:actions.cancel')}
        </Button>
      </div>
    </div>
  );
}
