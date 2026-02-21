'use client';

import { useState } from 'react';
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
        toast.success('Package updated');
      } else {
        await adminApi.createDiamondPackage(form as Omit<AdminDiamondPackage, 'id'>);
        toast.success('Package created');
      }
      cancelEdit();
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this package?')) return;
    try {
      await adminApi.deleteDiamondPackage(id);
      toast.success('Package deactivated');
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleToggleActive = async (pkg: AdminDiamondPackage) => {
    try {
      await adminApi.updateDiamondPackage(pkg.id, { isActive: !pkg.isActive });
      toast.success(pkg.isActive ? 'Package deactivated' : 'Package activated');
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Diamond Packages</h1>
        <button
          onClick={startCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Package
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreate || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Package' : 'Create Package'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Starter Pack"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Diamond Amount</label>
                <input
                  type="number"
                  value={form.diamondAmount}
                  onChange={(e) => setForm({ ...form, diamondAmount: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  min={1}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Bonus Diamonds</label>
                <input
                  type="number"
                  value={form.bonusDiamonds}
                  onChange={(e) => setForm({ ...form, bonusDiamonds: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Price (USD)</label>
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
                <label className="mb-1 block text-sm font-medium">Sort Order</label>
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
                  Active
                </label>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={cancelEdit}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Packages Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Packages{' '}
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
            <p className="text-sm text-muted-foreground">No packages found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Diamonds</th>
                    <th className="pb-2 font-medium">Bonus</th>
                    <th className="pb-2 font-medium">Price</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium">Actions</th>
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
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3">{pkg.sortOrder}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(pkg)}
                            className="rounded px-2 py-1 text-xs hover:bg-muted"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(pkg)}
                            className="rounded px-2 py-1 text-xs hover:bg-muted"
                          >
                            {pkg.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(pkg.id)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Delete
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
