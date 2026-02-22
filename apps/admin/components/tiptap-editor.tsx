'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import type { Editor } from '@tiptap/react';
import { useRef, useCallback, useEffect, useState } from 'react';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

function MenuBar({ editor, onImageUpload }: { editor: Editor | null; onImageUpload?: (file: File) => Promise<string> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor || !onImageUpload) return;

    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error('Image upload failed:', err);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [editor, onImageUpload]);

  const handleLinkToggle = useCallback(() => {
    if (!editor) return;
    if (showLinkInput) {
      setShowLinkInput(false);
      return;
    }
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
    setTimeout(() => linkInputRef.current?.focus(), 0);
  }, [editor, showLinkInput]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `p-1.5 rounded text-sm ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-2 bg-gray-50 rounded-t-lg">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Bold">
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italic">
        <em>I</em>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="Underline">
        <u>U</u>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Strikethrough">
        <s>S</s>
      </button>

      <span className="w-px h-5 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="Heading 1">
        H1
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="Heading 2">
        H2
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="Heading 3">
        H3
      </button>

      <span className="w-px h-5 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List">
        &bull;
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Ordered List">
        1.
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Blockquote">
        &ldquo;
      </button>

      <span className="w-px h-5 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))} title="Align Left">
        &#8676;
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))} title="Align Center">
        &#8596;
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))} title="Align Right">
        &#8677;
      </button>

      <span className="w-px h-5 bg-gray-300 mx-1" />

      <button type="button" onClick={handleLinkToggle} className={btnClass(editor.isActive('link'))} title="Link">
        &#128279;
      </button>
      {showLinkInput && (
        <div className="flex items-center gap-1 ml-1">
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLinkSubmit()}
            placeholder="https://..."
            className="h-7 w-48 rounded border px-2 text-xs"
          />
          <button type="button" onClick={handleLinkSubmit} className="p-1 rounded text-xs bg-gray-200 hover:bg-gray-300">
            OK
          </button>
        </div>
      )}

      {onImageUpload && (
        <>
          <button type="button" onClick={handleImageUpload} className={btnClass(false)} title="Image">
            &#128247;
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </>
      )}

      <span className="w-px h-5 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={`${btnClass(false)} disabled:opacity-30`} title="Undo">
        &#8634;
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={`${btnClass(false)} disabled:opacity-30`} title="Redo">
        &#8635;
      </button>
    </div>
  );
}

export function TiptapEditor({ content, onChange, placeholder, onImageUpload }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || '' }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <MenuBar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none" />
    </div>
  );
}
