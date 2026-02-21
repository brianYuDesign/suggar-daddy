'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { Card, CardHeader, CardTitle, CardContent } from '@suggar-daddy/ui';
import type { AdminDiamondConfig } from '@suggar-daddy/api-client';

export default function DiamondConfigPage() {
  const toast = useToast();
  const { data: config, loading, refetch } = useAdminQuery(() => adminApi.getDiamondConfig());
  const [form, setForm] = useState<AdminDiamondConfig>({
    superLikeCost: 50,
    boostCost: 150,
    boostDurationMinutes: 30,
    conversionRate: 100,
    platformFeeRate: 0.2,
    minConversionDiamonds: 500,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateDiamondConfig(form);
      toast.success('Diamond config updated');
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update config');
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<{
    key: keyof AdminDiamondConfig;
    label: string;
    description: string;
    step?: number;
    min?: number;
    max?: number;
  }> = [
    {
      key: 'superLikeCost',
      label: 'Super Like Cost',
      description: 'Diamonds required to send a Super Like',
      min: 1,
    },
    {
      key: 'boostCost',
      label: 'Profile Boost Cost',
      description: 'Diamonds required for a profile boost',
      min: 1,
    },
    {
      key: 'boostDurationMinutes',
      label: 'Boost Duration (minutes)',
      description: 'How long a profile boost lasts',
      min: 1,
    },
    {
      key: 'conversionRate',
      label: 'Conversion Rate',
      description: 'Diamonds per 1 USD (e.g. 100 = 100 diamonds per $1)',
      min: 1,
    },
    {
      key: 'platformFeeRate',
      label: 'Platform Fee Rate',
      description: 'Fee taken on conversions (0.2 = 20%)',
      step: 0.01,
      min: 0,
      max: 1,
    },
    {
      key: 'minConversionDiamonds',
      label: 'Min Conversion Diamonds',
      description: 'Minimum diamonds needed for cash conversion',
      min: 1,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Diamond Pricing Config</h1>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {fields.map((field) => (
                <div key={field.key} className="grid gap-1">
                  <label className="text-sm font-medium">{field.label}</label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                  <input
                    type="number"
                    value={form[field.key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [field.key]: field.step
                          ? parseFloat(e.target.value) || 0
                          : parseInt(e.target.value) || 0,
                      })
                    }
                    step={field.step || 1}
                    min={field.min}
                    max={field.max}
                    className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}

              {/* Preview */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <h3 className="mb-2 text-sm font-medium">Preview</h3>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <p>Super Like: {form.superLikeCost} diamonds</p>
                  <p>Boost: {form.boostCost} diamonds for {form.boostDurationMinutes} min</p>
                  <p>
                    Conversion: {form.conversionRate} diamonds = $1.00 (after{' '}
                    {(form.platformFeeRate * 100).toFixed(0)}% fee ={' '}
                    ${((1 - form.platformFeeRate) * 1).toFixed(2)} net)
                  </p>
                  <p>Min conversion: {form.minConversionDiamonds} diamonds</p>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Config'}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
