'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, Send, Archive, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { TiptapEditor } from '@/components/tiptap-editor';
import { uploadImage } from '@/lib/upload-image';
import { Card, CardContent, Input, Button, Select, Badge, Skeleton, ConfirmDialog } from '@suggar-daddy/ui';

const PAGE_TYPES = [
  'privacy', 'terms', 'community-guidelines', 'about',
  'contact', 'faq', 'cookie-policy', 'custom',
];

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
  const [slug, setSlug] = useState('');
  const [pageType, setPageType] = useState('custom');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (pageData && !initialized) {
      setTitle(pageData.title);
      setContent(pageData.content);
      setSlug(pageData.slug);
      setPageType(pageData.pageType);
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
        slug: slug || undefined,
        pageType,
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

  const handlePublish = async () => {
    try {
      await adminApi.publishPage(id);
      toast.success(t('editor.saveSuccess'));
      router.push('/content/pages');
    } catch {
      toast.error(t('editor.saveFailed'));
    }
  };

  const handleArchive = async () => {
    try {
      await adminApi.archivePage(id);
      toast.success(t('editor.saveSuccess'));
      router.push('/content/pages');
    } catch {
      toast.error(t('editor.saveFailed'));
    }
  };

  const handleDelete = async () => {
    try {
      await adminApi.deletePage(id);
      toast.success(t('editor.deleteSuccess'));
      router.push('/content/pages');
    } catch {
      toast.error(t('editor.saveFailed'));
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
        <div className="flex gap-2">
          {pageData?.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={handlePublish}>
              <Send className="h-4 w-4 mr-1" />
              {t('editor.publish')}
            </Button>
          )}
          {pageData?.status === 'published' && (
            <Button variant="outline" size="sm" onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-1" />
              {t('editor.archive')}
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            {t('editor.delete')}
          </Button>
        </div>
      </div>

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
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('editor.slugLabel')}</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={t('editor.slugPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('editor.pageTypeLabel')}</label>
                <Select value={pageType} onChange={(e) => setPageType(e.target.value)}>
                  {PAGE_TYPES.map((pt) => (
                    <option key={pt} value={pt}>{t(`pageType.${pt}`)}</option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

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

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('editor.confirmDeleteTitle')}
        description={t('editor.confirmDeleteDesc')}
        confirmText={t('editor.delete')}
        cancelText={t('common:actions.cancel')}
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
