'use client';

import React, { useState } from 'react';
import { CreatorSettings } from '@/types/creator';
import SettingsPanel from '@/components/settings/SettingsPanel';
import SubscriptionPricingPanel from '@/components/settings/SubscriptionPricingPanel';

export default function Settings() {
  const [settings, setSettings] = useState<CreatorSettings>({
    id: 'settings1',
    creatorId: 'creator1',
    subscriptionPrice: 9.99,
    subscriptionDescription: 'Access exclusive content, early releases, and direct support',
    emailNotifications: true,
    publicProfile: true,
    allowComments: true,
    autoPublish: false,
    bankAccount: {
      accountHolder: 'John Doe',
      accountNumber: '**** **** **** 1234',
      bankName: 'Example Bank',
    },
  });

  const [activeTab, setActiveTab] = useState<'general' | 'subscription' | 'payment'>('general');
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = (updatedSettings: CreatorSettings) => {
    setSettings(updatedSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Manage your account and content preferences</p>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-lg text-green-300 flex items-center gap-2">
            <span>✓</span> Settings saved successfully
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700 overflow-x-auto pb-4">
          {(['general', 'subscription', 'payment'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <SettingsPanel settings={settings} onSave={handleSaveSettings} />
        )}

        {activeTab === 'subscription' && (
          <SubscriptionPricingPanel settings={settings} onSave={handleSaveSettings} />
        )}

        {activeTab === 'payment' && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Payment Method</h2>
            <div className="space-y-6">
              {settings.bankAccount && (
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">🏦</div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{settings.bankAccount.bankName}</div>
                      <div className="text-gray-400 text-sm">{settings.bankAccount.accountNumber}</div>
                      <div className="text-gray-500 text-xs mt-1">{settings.bankAccount.accountHolder}</div>
                    </div>
                    <button className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              )}

              {!settings.bankAccount && (
                <div className="p-6 text-center bg-slate-900/50 rounded-lg border border-slate-600">
                  <p className="text-gray-400 mb-4">No payment method added</p>
                  <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                    Add Payment Method
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
