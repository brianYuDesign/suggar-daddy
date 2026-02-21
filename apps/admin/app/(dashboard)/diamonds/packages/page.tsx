'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { Card, CardHeader, CardTitle, CardContent } from '@suggar-daddy/ui';
import type { AdminDiamondPackage } from '@suggar-daddy/api-client';

interface PackageForm {
  name: string;
  diamondAmount: number;
  bonusDiamonds: number;
  priceUsd: number;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm: PackageForm = {
  name: '',
  diamondAmount: 100,
  bonusDiamonds: 0,
  priceUsd: 0.99,
  isActive: true,
  sortOrder: 0,
};

export default function PackagesPage() {
  const { t } = useTranslation('diamonds');
  const toast = useToast();
  const { data: packages, loading, refetch } = useAdminQuery(() => adminApi.getDiamondPackages());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = (pkg: AdminDiamondPackage) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      diamondAmount: pkg.diamondAmount,
      bonusDiamonds: pkg.bonusDiamonds,
      priceUsd: pkg.priceUsd,
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder,
    });
    setShowCreate(false);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowCreate(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreate(false);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateDiamondPackage(editingId, form);
        toast.success(t('packages.packageUpdated'));
      } else {
        await adminApi.createDiamondPackage(form as Omit<AdminDiamondPackage, 'id'>);
        toast.success(t('packages.packageCreated'));
      }
      cancelEdit();
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('packages.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('packages.deactivateConfirm'))) return;
    try {
      await adminApi.deleteDiamondPackage(id);
      toast.success(t('packages.packageDeactivated'));
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('packages.deleteFailed'));
    }
  };

  const handleToggleActive = async (pkg: AdminDiamondPackage) => {
    try {
      await adminApi.updateDiamondPackage(pkg.id, { isActive: !pkg.isActive });
      toast.success(pkg.isActive ? t('packages.packageDeactivated') : t('packages.packageActivated'));
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('packages.toggleFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('packages.title')}</h1>
        <button
          onClick={startCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('packages.newPackage')}
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreate || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t('packages.editPackage') : t('packages.createPackage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">{t('packages.name')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Starter Pack"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('packages.diamondAmount')}</label>
                <input
                  type="number"
                  value={form.diamondAmount}
                  onChange={(e) => setForm({ ...form, diamondAmount: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  min={1}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('packages.bonus')}</label>
                <input
                  type="number"
                  value={form.bonusDiamonds}
                  onChange={(e) => setForm({ ...form, bonusDiamonds: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('packages.price')}</label>
                <input
                  type="number"
                  value={form.priceUsd}
                  onChange={(e) => setForm({ ...form, priceUsd: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  min={0.01}
                  step={0.01}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('packages.sortOrder')}</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  min={0}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded"
                  />
                  {t('packages.active')}
                </label>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? t('packages.saving') : editingId ? t('packages.update') : t('packages.create')}
              </button>
              <button
                onClick={cancelEdit}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {t('common:actions.cancel')}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('packages.allPackages')}{' '}
            {packages && (
              <span className="font-normal text-muted-foreground">
                ({Array.isArray(packages) ? packages.length : 0})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !packages || !Array.isArray(packages) || packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('packages.noPackages')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">{t('packages.name')}</th>
                    <th className="pb-2 font-medium">{t('table.diamonds')}</th>
                    <th className="pb-2 font-medium">{t('packages.bonus')}</th>
                    <th className="pb-2 font-medium">{t('packages.price')}</th>
                    <th className="pb-2 font-medium">{t('table.status')}</th>
                    <th className="pb-2 font-medium">{t('packages.sortOrder')}</th>
                    <th className="pb-2 font-medium">{t('common:table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg: AdminDiamondPackage) => (
                    <tr key={pkg.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{pkg.name}</td>
                      <td className="py-3">{pkg.diamondAmount.toLocaleString()}</td>
                      <td className="py-3">{pkg.bonusDiamonds > 0 ? `+${pkg.bonusDiamonds}` : '-'}</td>
                      <td className="py-3">${Number(pkg.priceUsd).toFixed(2)}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            pkg.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}
                        >
                          {pkg.isActive ? t('packages.active') : t('packages.inactive')}
                        </span>
                      </td>
                      <td className="py-3">{pkg.sortOrder}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(pkg)}
                            className="rounded px-2 py-1 text-xs hover:bg-muted"
                          >
                            {t('packages.edit')}
                          </button>
                          <button
                            onClick={() => handleToggleActive(pkg)}
                            className="rounded px-2 py-1 text-xs hover:bg-muted"
                          >
                            {pkg.isActive ? t('packages.deactivate') : t('packages.activate')}
                          </button>
                          <button
                            onClick={() => handleDelete(pkg.id)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            {t('packages.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
