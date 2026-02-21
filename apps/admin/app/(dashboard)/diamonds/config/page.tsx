'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { Card, CardHeader, CardTitle, CardContent } from '@suggar-daddy/ui';
import type { AdminDiamondConfig } from '@suggar-daddy/api-client';

export default function DiamondConfigPage() {
  const { t } = useTranslation('diamonds');
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
      toast.success(t('config.configUpdated'));
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('config.updateFailed'));
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
      label: t('config.superLikeCost'),
      description: t('config.superLikeCostDesc'),
      min: 1,
    },
    {
      key: 'boostCost',
      label: t('config.boostCost'),
      description: t('config.boostCostDesc'),
      min: 1,
    },
    {
      key: 'boostDurationMinutes',
      label: t('config.boostDuration'),
      description: t('config.boostDurationDesc'),
      min: 1,
    },
    {
      key: 'conversionRate',
      label: t('config.conversionRate'),
      description: t('config.conversionRateDesc'),
      min: 1,
    },
    {
      key: 'platformFeeRate',
      label: t('config.platformFeeRate'),
      description: t('config.platformFeeRateDesc'),
      step: 0.01,
      min: 0,
      max: 1,
    },
    {
      key: 'minConversionDiamonds',
      label: t('config.minConversion'),
      description: t('config.minConversionDesc'),
      min: 1,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('config.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('config.settings')}</CardTitle>
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
                <h3 className="mb-2 text-sm font-medium">{t('config.preview')}</h3>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <p>{t('config.previewSuperLike', { count: form.superLikeCost })}</p>
                  <p>{t('config.previewBoost', { cost: form.boostCost, duration: form.boostDurationMinutes })}</p>
                  <p>
                    {t('config.previewConversion', {
                      rate: form.conversionRate,
                      fee: (form.platformFeeRate * 100).toFixed(0),
                      net: ((1 - form.platformFeeRate) * 1).toFixed(2),
                    })}
                  </p>
                  <p>{t('config.previewMinConversion', { count: form.minConversionDiamonds })}</p>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? t('config.saving') : t('config.saveConfig')}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
