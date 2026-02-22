'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { TiptapEditor } from '@/components/tiptap-editor';
import { uploadImage } from '@/lib/upload-image';
import { Card, CardContent, Input, Button, Badge, Skeleton } from '@suggar-daddy/ui';

export default function PageEditPage() {
  const { t } = useTranslation('pages');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();

  const { data: pageData, loading } = useAdminQuery(
    () => adminApi.getPage(id),
    [id],
  );

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (pageData && !initialized) {
      setTitle(pageData.title);
      setContent(pageData.content);
      setMetaTitle(pageData.metaTitle || '');
      setMetaDescription(pageData.metaDescription || '');
      setInitialized(true);
    }
  }, [pageData, initialized]);

  const handleSave = async (publishStatus?: 'draft' | 'published') => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await adminApi.updatePage(id, {
        title,
        content,
        ...(publishStatus ? { status: publishStatus } : {}),
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
      });
      toast.success(t('editor.saveSuccess'));
      router.push('/content/pages');
    } catch {
      toast.error(t('editor.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/content/pages">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('editor.backToList')}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{t('editor.editTitle')}</h1>
          {pageData && (
            <Badge variant={pageData.status === 'published' ? 'default' : pageData.status === 'draft' ? 'secondary' : 'outline'}>
              {t(`status.${pageData.status}`)}
            </Badge>
          )}
        </div>
      </div>

      {/* Page type info */}
      {pageData && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{t('editor.pageTypeLabel')}: <strong>{t(`pageType.${pageData.pageType}`)}</strong></span>
          <span>{t('editor.slugLabel')}: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/{pageData.slug}</code></span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('editor.titleLabel')}</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('editor.titlePlaceholder')}
                  className="text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t('editor.contentLabel')}</label>
                {initialized && (
                  <TiptapEditor
                    content={content}
                    onChange={setContent}
                    placeholder={t('editor.contentPlaceholder')}
                    onImageUpload={uploadImage}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* SEO */}
          <Card>
            <CardContent className="p-6">
              <button
                type="button"
                onClick={() => setSeoOpen(!seoOpen)}
                className="flex items-center justify-between w-full text-sm font-medium"
              >
                {t('editor.seoSection')}
                {seoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {seoOpen && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">{t('editor.metaTitleLabel')}</label>
                    <Input
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder={t('editor.metaTitlePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">{t('editor.metaDescLabel')}</label>
                    <textarea
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder={t('editor.metaDescPlaceholder')}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleSave('draft')}
              disabled={saving || !title.trim()}
            >
              {saving ? t('editor.saving') : t('editor.saveDraft')}
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleSave('published')}
              disabled={saving || !title.trim()}
            >
              {saving ? t('editor.saving') : t('editor.saveAndPublish')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
