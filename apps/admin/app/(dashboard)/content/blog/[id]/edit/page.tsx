'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Upload, X, ChevronDown, ChevronUp, Send, Archive, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { TiptapEditor } from '@/components/tiptap-editor';
import { uploadImage } from '@/lib/upload-image';
import { Card, CardContent, Input, Button, Select, Badge, Skeleton, ConfirmDialog } from '@suggar-daddy/ui';

export default function BlogEditPage() {
  const { t } = useTranslation('blog');
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();

  const { data: blog, loading } = useAdminQuery(
    () => adminApi.getBlog(id),
    [id],
  );

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [category, setCategory] = useState('guide');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (blog && !initialized) {
      setTitle(blog.title);
      setContent(blog.content);
      setExcerpt(blog.excerpt || '');
      setCoverImage(blog.coverImage || '');
      setCategory(blog.category);
      setTags(blog.tags || []);
      setMetaTitle(blog.metaTitle || '');
      setMetaDescription(blog.metaDescription || '');
      setInitialized(true);
    }
  }, [blog, initialized]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const url = await uploadImage(file);
      setCoverImage(url);
    } catch {
      toast.error(t('editor.saveFailed'));
    } finally {
      setCoverUploading(false);
    }
  };

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = tagInput.trim();
      if (value && !tags.includes(value)) {
        setTags([...tags, value]);
      }
      setTagInput('');
    }
  };

  const handleTagRemove = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async (publishStatus?: 'draft' | 'published') => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await adminApi.updateBlog(id, {
        title,
        content,
        excerpt: excerpt || undefined,
        coverImage: coverImage || undefined,
        category,
        tags: tags.length > 0 ? tags : undefined,
        ...(publishStatus ? { status: publishStatus } : {}),
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
      });
      toast.success(t('editor.saveSuccess'));
      router.push('/content/blog');
    } catch {
      toast.error(t('editor.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      await adminApi.publishBlog(id);
      toast.success(t('editor.saveSuccess'));
      router.push('/content/blog');
    } catch {
      toast.error(t('editor.saveFailed'));
    }
  };

  const handleArchive = async () => {
    try {
      await adminApi.archiveBlog(id);
      toast.success(t('editor.saveSuccess'));
      router.push('/content/blog');
    } catch {
      toast.error(t('editor.saveFailed'));
    }
  };

  const handleDelete = async () => {
    try {
      await adminApi.deleteBlog(id);
      toast.success(t('editor.deleteSuccess'));
      router.push('/content/blog');
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
          <Link href="/content/blog">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('editor.backToList')}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{t('editor.editTitle')}</h1>
          {blog && (
            <Badge variant={blog.status === 'published' ? 'default' : blog.status === 'draft' ? 'secondary' : 'outline'}>
              {t(`status.${blog.status}`)}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {blog?.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={handlePublish}>
              <Send className="h-4 w-4 mr-1" />
              {t('editor.publish')}
            </Button>
          )}
          {blog?.status === 'published' && (
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

              <div>
                <label className="block text-sm font-medium mb-1.5">{t('editor.excerptLabel')}</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder={t('editor.excerptPlaceholder')}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Cover Image */}
          <Card>
            <CardContent className="p-6">
              <label className="block text-sm font-medium mb-3">{t('editor.coverImageLabel')}</label>
              {coverImage ? (
                <div className="relative">
                  <div className="relative h-40 rounded-lg overflow-hidden">
                    <Image src={coverImage} alt="Cover" fill className="object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    {coverUploading ? t('editor.saving') : t('editor.uploadCover')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={coverUploading}
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Category */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('editor.categoryLabel')}</label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="guide">{t('category.guide')}</option>
                  <option value="safety">{t('category.safety')}</option>
                  <option value="tips">{t('category.tips')}</option>
                  <option value="story">{t('category.story')}</option>
                  <option value="news">{t('category.news')}</option>
                </Select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('editor.tagsLabel')}</label>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagAdd}
                  placeholder={t('editor.tagsPlaceholder')}
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => handleTagRemove(tag)} className="ml-0.5 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
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
