'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlatformSettings, RecommendationSettings } from '@/types/admin';

// Mock data - replace with actual API calls
const mockPlatformSettings: PlatformSettings = {
  platformFee: 20,
  minWithdrawal: 50,
  maxUploadSize: 500,
  allowedFileTypes: ['.mp4', '.mov', '.jpg', '.png', '.mp3', '.wav'],
  autoApproveContent: false,
  maintenanceMode: false,
};

const mockRecommendationSettings: RecommendationSettings = {
  enabled: true,
  algorithm: 'hybrid',
  refreshInterval: 24,
  maxRecommendations: 10,
  personalizedWeight: 0.7,
};

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(mockPlatformSettings);
  const [recommendationSettings, setRecommendationSettings] = useState<RecommendationSettings>(mockRecommendationSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'platform' | 'recommendation'>('platform');

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      // Replace with actual API calls:
      // const platformRes = await fetch('/api/v1/admin/settings/platform');
      // const recommendationRes = await fetch('/api/v1/admin/settings/recommendation');
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPlatformSettings(mockPlatformSettings);
      setRecommendationSettings(mockRecommendationSettings);
      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  const handlePlatformSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    // Replace with actual API call:
    // await fetch('/api/v1/admin/settings/platform', {
    //   method: 'PUT',
    //   body: JSON.stringify(platformSettings),
    // });
    
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    setSaveMessage(t('platform.saveSuccess'));
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleRecommendationSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    // Replace with actual API call:
    // await fetch('/api/v1/admin/settings/recommendation', {
    //   method: 'PUT',
    //   body: JSON.stringify(recommendationSettings),
    // });
    
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    setSaveMessage(t('recommendation.saveSuccess'));
    setTimeout(() => setSaveMessage(''), 3000);
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-pulse h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="animate-pulse h-12 bg-slate-800 rounded-lg"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-slate-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700 w-fit">
          <button
            onClick={() => setActiveTab('platform')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'platform'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {t('tabs.platform')}
          </button>
          <button
            onClick={() => setActiveTab('recommendation')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'recommendation'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {t('tabs.recommendation')}
          </button>
        </div>

        {/* Success Message */}
        {saveMessage && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
            <span className="text-green-400 text-xl">✅</span>
            <p className="text-green-400 font-medium">{saveMessage}</p>
          </div>
        )}

        {/* Platform Settings Tab */}
        {activeTab === 'platform' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">{t('platform.title')}</h2>
            
            {/* Platform Fee */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('platform.platformFee')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={platformSettings.platformFee}
                  onChange={(e) =>
                    setPlatformSettings((prev) => ({
                      ...prev,
                      platformFee: parseInt(e.target.value),
                    }))
                  }
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-white font-mono w-16 text-right">
                  {platformSettings.platformFee}%
                </span>
              </div>
              <p className="text-gray-500 text-sm">
                {t('platform.platformFeeDesc')}
              </p>
            </div>

            {/* Minimum Withdrawal */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('platform.minWithdrawal')}
              </label>
              <input
                type="number"
                value={platformSettings.minWithdrawal}
                onChange={(e) =>
                  setPlatformSettings((prev) => ({
                    ...prev,
                    minWithdrawal: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-gray-500 text-sm">
                {t('platform.minWithdrawalDesc')}
              </p>
            </div>

            {/* Max Upload Size */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('platform.maxUploadSize')}
              </label>
              <input
                type="number"
                value={platformSettings.maxUploadSize}
                onChange={(e) =>
                  setPlatformSettings((prev) => ({
                    ...prev,
                    maxUploadSize: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-gray-500 text-sm">
                {t('platform.maxUploadSizeDesc')}
              </p>
            </div>

            {/* Allowed File Types */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('platform.allowedFileTypes')}
              </label>
              <div className="flex flex-wrap gap-2">
                {platformSettings.allowedFileTypes.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-gray-300 text-sm"
                  >
                    {type}
                  </span>
                ))}
                <button className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm hover:bg-purple-600/30 transition-colors">
                  {t('platform.addType')}
                </button>
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-4 pt-4 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    {t('platform.autoApprove')}
                  </label>
                  <p className="text-gray-500 text-sm">
                    {t('platform.autoApproveDesc')}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setPlatformSettings((prev) => ({
                      ...prev,
                      autoApproveContent: !prev.autoApproveContent,
                    }))
                  }
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    platformSettings.autoApproveContent
                      ? 'bg-purple-600'
                      : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      platformSettings.autoApproveContent
                        ? 'translate-x-7'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    {t('platform.maintenanceMode')}
                  </label>
                  <p className="text-gray-500 text-sm">
                    {t('platform.maintenanceModeDesc')}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setPlatformSettings((prev) => ({
                      ...prev,
                      maintenanceMode: !prev.maintenanceMode,
                    }))
                  }
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    platformSettings.maintenanceMode
                      ? 'bg-red-600'
                      : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      platformSettings.maintenanceMode
                        ? 'translate-x-7'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handlePlatformSave}
                disabled={isSaving}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {isSaving ? t('platform.saving') : t('platform.save')}
              </button>
            </div>
          </div>
        )}

        {/* Recommendation Settings Tab */}
        {activeTab === 'recommendation' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">{t('recommendation.title')}</h2>

            {/* Enable Recommendations */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  {t('recommendation.enabled')}
                </label>
                <p className="text-gray-500 text-sm">
                  {t('recommendation.enabledDesc')}
                </p>
              </div>
              <button
                onClick={() =>
                  setRecommendationSettings((prev) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }))
                }
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  recommendationSettings.enabled ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    recommendationSettings.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Algorithm Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('recommendation.algorithm')}
              </label>
              <select
                value={recommendationSettings.algorithm}
                onChange={(e) =>
                  setRecommendationSettings((prev) => ({
                    ...prev,
                    algorithm: e.target.value as RecommendationSettings['algorithm'],
                  }))
                }
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="popularity">{t('recommendation.popularity')}</option>
                <option value="engagement">{t('recommendation.engagement')}</option>
                <option value="hybrid">{t('recommendation.hybrid')}</option>
                <option value="ai">{t('recommendation.ai')}</option>
              </select>
              <p className="text-gray-500 text-sm">
                {t('recommendation.algorithmDesc')}
              </p>
            </div>

            {/* Max Recommendations */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('recommendation.maxRecommendations')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={recommendationSettings.maxRecommendations}
                  onChange={(e) =>
                    setRecommendationSettings((prev) => ({
                      ...prev,
                      maxRecommendations: parseInt(e.target.value),
                    }))
                  }
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-white font-mono w-12 text-right">
                  {recommendationSettings.maxRecommendations}
                </span>
              </div>
              <p className="text-gray-500 text-sm">
                {t('recommendation.maxRecommendationsDesc')}
              </p>
            </div>

            {/* Refresh Interval */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('recommendation.refreshInterval')}
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={recommendationSettings.refreshInterval}
                onChange={(e) =>
                  setRecommendationSettings((prev) => ({
                    ...prev,
                    refreshInterval: parseInt(e.target.value) || 1,
                  }))
                }
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-gray-500 text-sm">
                {t('recommendation.refreshIntervalDesc')}
              </p>
            </div>

            {/* Personalized Weight */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {t('recommendation.personalizationWeight')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(recommendationSettings.personalizedWeight * 100)}
                  onChange={(e) =>
                    setRecommendationSettings((prev) => ({
                      ...prev,
                      personalizedWeight: parseInt(e.target.value) / 100,
                    }))
                  }
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-white font-mono w-16 text-right">
                  {Math.round(recommendationSettings.personalizedWeight * 100)}%
                </span>
              </div>
              <p className="text-gray-500 text-sm">
                {t('recommendation.personalizationWeightDesc')}
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleRecommendationSave}
                disabled={isSaving}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {isSaving ? t('recommendation.saving') : t('recommendation.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
