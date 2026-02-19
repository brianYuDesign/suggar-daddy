'use client';

import React from 'react';
import Image from 'next/image';
import { Creator, Analytics } from '@/types/creator';
import StatCard from '@/components/creator/StatCard';
import FollowButton from '@/components/creator/FollowButton';

interface CreatorProfileProps {
  creatorId: string;
}

export default function CreatorProfile({ creatorId }: CreatorProfileProps) {
  // Mock creator data - will be replaced with API call
  const [creator, setCreator] = React.useState<Creator | null>(null);
  const [analytics, setAnalytics] = React.useState<Analytics | null>(null);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setCreator({
        id: creatorId,
        name: 'Creative Master',
        avatar: 'https://via.placeholder.com/200',
        bio: 'Creating amazing content for amazing people. 🎬',
        verified: true,
        followers: 125400,
        totalViews: 3500000,
        totalEarnings: 45230.50,
        subscriptionPrice: 9.99,
        joinDate: '2023-01-15',
        socialLinks: {
          twitter: 'https://twitter.com',
          instagram: 'https://instagram.com',
          website: 'https://example.com',
        },
      });

      setAnalytics({
        period: 'month',
        totalViews: 250000,
        totalEarnings: 5230.50,
        newSubscribers: 1200,
        averageEngagement: 8.5,
        topContent: [],
        viewsOverTime: [],
        earningsOverTime: [],
      });

      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [creatorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Creator not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header with background */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-purple-600 to-pink-600"></div>

        {/* Creator Info Card */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto -mt-24">
            <div className="bg-slate-800 rounded-lg shadow-lg p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
                {/* Avatar */}
                <Image
                  src={creator.avatar}
                  alt={creator.name}
                  width={128}
                  height={128}
                  className="w-32 h-32 rounded-full border-4 border-purple-500 object-cover"
                  loading="eager"
                  priority
                />

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold text-white">{creator.name}</h1>
                    {creator.verified && (
                      <span className="text-blue-400" title="Verified" aria-label="Verified creator">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 mb-4 max-w-xl">{creator.bio}</p>

                  {/* Stats Row */}
                  <div className="flex gap-6 mb-4 text-sm">
                    <div>
                      <div className="text-gray-400">Followers</div>
                      <div className="text-xl font-semibold text-white">
                        {(creator.followers / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Total Views</div>
                      <div className="text-xl font-semibold text-white">
                        {(creator.totalViews / 1000000).toFixed(1)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Earnings</div>
                      <div className="text-xl font-semibold text-green-400">
                        ${creator.totalEarnings.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Follow Button */}
                <FollowButton
                  isFollowing={isFollowing}
                  onToggle={() => setIsFollowing(!isFollowing)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      {analytics && (
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">This Month</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                title="Views"
                value={(analytics.totalViews / 1000).toFixed(0)}
                unit="K"
                trend="+12%"
                color="blue"
              />
              <StatCard
                title="Earnings"
                value={analytics.totalEarnings.toFixed(0)}
                unit="$"
                trend="+8%"
                color="green"
              />
              <StatCard
                title="New Subscribers"
                value={(analytics.newSubscribers / 100).toFixed(0)}
                unit="K"
                trend="+5%"
                color="purple"
              />
              <StatCard
                title="Engagement"
                value={analytics.averageEngagement.toFixed(1)}
                unit="%"
                trend="+2%"
                color="pink"
              />
            </div>
          </div>
        </div>
      )}

      {/* Social Links */}
      {creator.socialLinks && (
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Connect</h3>
            <div className="flex gap-4">
              {creator.socialLinks.twitter && (
                <a
                  href={creator.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  aria-label="Twitter"
                >
                  Twitter
                </a>
              )}
              {creator.socialLinks.instagram && (
                <a
                  href={creator.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-pink-400 transition-colors"
                  aria-label="Instagram"
                >
                  Instagram
                </a>
              )}
              {creator.socialLinks.website && (
                <a
                  href={creator.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-purple-400 transition-colors"
                  aria-label="Website"
                >
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
