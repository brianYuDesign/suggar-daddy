'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@suggar-daddy/ui';
import { tagsApi } from '../../../../lib/api';
import { useAuth } from '../../../../providers/auth-provider';
import { InterestTagPicker } from '../../../../components/InterestTagPicker';
import { Sparkles } from 'lucide-react';

export default function OnboardingInterestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  // Redirect if user already has tags
  useEffect(() => {
    if (!user?.id) return;
    tagsApi
      .getUserTags(user.id)
      .then((tags) => {
        if (tags && tags.length > 0) {
          router.replace('/discover');
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [user?.id, router]);

  const handleContinue = async () => {
    if (selectedTagIds.length === 0) {
      router.push('/discover');
      return;
    }
    setSaving(true);
    try {
      await tagsApi.updateMyTags(selectedTagIds);
      router.push('/discover');
    } catch {
      // Still navigate even if save fails
      router.push('/discover');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <Sparkles className="h-6 w-6 text-neutral-700" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">選擇你的興趣</h1>
        <p className="mt-2 text-sm text-gray-500">
          幫助我們推薦更適合你的對象，至少選擇 3 個標籤
        </p>
      </div>

      <InterestTagPicker
        selectedTagIds={selectedTagIds}
        onChange={setSelectedTagIds}
      />

      <div className="flex gap-3 pt-4">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => router.push('/discover')}
        >
          跳過
        </Button>
        <Button
          className="flex-1 bg-neutral-900 hover:bg-neutral-800"
          onClick={handleContinue}
          disabled={saving}
        >
          {saving ? '儲存中...' : '繼續'}
        </Button>
      </div>
    </div>
  );
}
