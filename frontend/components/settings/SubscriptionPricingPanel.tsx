'use client';

import React, { useState } from 'react';
import { CreatorSettings } from '@/types/creator';

interface SubscriptionPricingPanelProps {
  settings: CreatorSettings;
  onSave: (settings: CreatorSettings) => void;
}

export default function SubscriptionPricingPanel({
  settings,
  onSave,
}: SubscriptionPricingPanelProps) {
  const [formData, setFormData] = useState(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.subscriptionPrice || formData.subscriptionPrice <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (!formData.subscriptionDescription?.trim()) {
      newErrors.description = 'Description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const suggestedPrices = [4.99, 9.99, 19.99, 29.99];

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Subscription Pricing</h2>

      <div className="space-y-6">
        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Subscription Price *
          </label>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.subscriptionPrice}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  subscriptionPrice: parseFloat(e.target.value),
                })
              }
              className={`flex-1 px-4 py-2 bg-slate-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors ${
                errors.price ? 'border-red-500' : 'border-slate-600'
              }`}
              placeholder="9.99"
              aria-label="Subscription price"
            />
            <span className="text-gray-400">/month</span>
          </div>
          {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}

          {/* Suggested Prices */}
          <div className="flex gap-2 mb-4">
            {suggestedPrices.map((price) => (
              <button
                key={price}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, subscriptionPrice: price })
                }
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  formData.subscriptionPrice === price
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                ${price.toFixed(2)}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Subscription Description *
          </label>
          <textarea
            value={formData.subscriptionDescription}
            onChange={(e) =>
              setFormData({
                ...formData,
                subscriptionDescription: e.target.value,
              })
            }
            className={`w-full px-4 py-2 bg-slate-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none h-32 ${
              errors.description ? 'border-red-500' : 'border-slate-600'
            }`}
            placeholder="Describe what subscribers get..."
            aria-label="Subscription description"
          />
          {errors.description && (
            <p className="text-red-400 text-sm mt-1">{errors.description}</p>
          )}
          <p className="text-gray-500 text-xs mt-2">
            {formData.subscriptionDescription.length}/500 characters
          </p>
        </div>

        {/* Preview */}
        <div className="p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-700/50">
          <div className="text-sm text-gray-300 mb-2">Preview:</div>
          <div className="flex items-start gap-4">
            <div className="text-4xl">👑</div>
            <div>
              <div className="text-white font-semibold">Premium Membership</div>
              <div className="text-gray-300 text-sm">
                ${formData.subscriptionPrice.toFixed(2)}/month
              </div>
              <div className="text-gray-400 text-sm mt-2 line-clamp-3">
                {formData.subscriptionDescription}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div>
          <label className="block text-sm font-medium text-white mb-4">
            What subscribers get (Fixed):
          </label>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Exclusive premium content
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Early access to new releases
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Direct messaging support
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Ad-free experience
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Community access
            </li>
          </ul>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          type="submit"
          className="flex-1 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
        >
          Save Pricing
        </button>
      </div>
    </form>
  );
}
