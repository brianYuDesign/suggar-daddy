'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FileText, Shield, Users, HelpCircle, Mail, Cookie, Info, ExternalLink } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { Card, CardContent, Badge, Skeleton } from '@suggar-daddy/ui';

interface PageItem {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  status: string;
  updatedAt: string;
}

const PAGE_CONFIG = [
  { slug: 'about', icon: Info, color: 'text-blue-600 bg-blue-100' },
  { slug: 'privacy', icon: Shield, color: 'text-green-600 bg-green-100' },
  { slug: 'terms', icon: FileText, color: 'text-orange-600 bg-orange-100' },
  { slug: 'community-guidelines', icon: Users, color: 'text-purple-600 bg-purple-100' },
  { slug: 'faq', icon: HelpCircle, color: 'text-cyan-600 bg-cyan-100' },
  { slug: 'contact', icon: Mail, color: 'text-pink-600 bg-pink-100' },
  { slug: 'cookie-policy', icon: Cookie, color: 'text-amber-600 bg-amber-100' },
];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
};

export default function PagesListPage() {
  const { t } = useTranslation('pages');

  const { data, loading } = useAdminQuery(
    () => adminApi.listPages(1, 20),
    [],
  );

  const pageMap = new Map<string, PageItem>();
  if (data?.items) {
    for (const item of data.items as PageItem[]) {
      pageMap.set(item.slug, item);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAGE_CONFIG.map(({ slug, icon: Icon, color }) => {
            const page = pageMap.get(slug);
            return (
              <Link key={slug} href={page ? `/content/pages/${page.id}/edit` : '#'}>
                <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {page ? (
                        <Badge variant={STATUS_VARIANT[page.status] || 'secondary'}>
                          {t(`status.${page.status}`)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t('status.notCreated')}</Badge>
                      )}
                    </div>
                    <div className="mt-3">
                      <h3 className="font-semibold text-sm">{t(`pageType.${slug}`)}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t(`pageDesc.${slug}`)}</p>
                    </div>
                    {page && (
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('lastUpdated')}: {new Date(page.updatedAt).toLocaleDateString()}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
