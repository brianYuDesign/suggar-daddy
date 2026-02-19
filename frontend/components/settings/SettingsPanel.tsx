'use client';

import React, { useState } from 'react';
import { CreatorSettings } from '@/types/creator';

interface SettingsPanelProps {
  settings: CreatorSettings;
  onSave: (settings: CreatorSettings) => void;
}

export default function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [formData, setFormData] = useState(settings);

  const handleToggle = (key: keyof Omit<CreatorSettings, 'id' | 'creatorId' | 'subscriptionPrice' | 'subscriptionDescription' | 'bankAccount'>) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-white mb-6">General Settings</h2>

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-600">
          <div>
            <div className="text-white font-semibold">Email Notifications</div>
            <div className="text-gray-400 text-sm">Receive updates via email</div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('emailNotifications')}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              formData.emailNotifications ? 'bg-purple-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={formData.emailNotifications}
            aria-label="Email notifications toggle"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                formData.emailNotifications ? 'translate-x-9' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Public Profile */}
        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-600">
          <div>
            <div className="text-white font-semibold">Public Profile</div>
            <div className="text-gray-400 text-sm">Allow others to visit your profile</div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('publicProfile')}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              formData.publicProfile ? 'bg-purple-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={formData.publicProfile}
            aria-label="Public profile toggle"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                formData.publicProfile ? 'translate-x-9' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Allow Comments */}
        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-600">
          <div>
            <div className="text-white font-semibold">Allow Comments</div>
            <div className="text-gray-400 text-sm">Let users comment on your content</div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('allowComments')}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              formData.allowComments ? 'bg-purple-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={formData.allowComments}
            aria-label="Allow comments toggle"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                formData.allowComments ? 'translate-x-9' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Auto Publish */}
        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-600">
          <div>
            <div className="text-white font-semibold">Auto-publish Scheduled Content</div>
            <div className="text-gray-400 text-sm">Automatically publish content on schedule</div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('autoPublish')}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              formData.autoPublish ? 'bg-purple-600' : 'bg-gray-700'
            }`}
            role="switch"
            aria-checked={formData.autoPublish}
            aria-label="Auto-publish toggle"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                formData.autoPublish ? 'translate-x-9' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8">
        <button
          type="submit"
          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
        >
          Save Settings
        </button>
      </div>
    </form>
  );
}
