import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import { Bold, Italic, List, ListOrdered, ImagePlus, Heading2, Minus } from 'lucide-react';
import { useRef, useState, type ReactElement, type ChangeEvent } from 'react';
import { IconButton } from '@/components/shared/IconButton';
import { deleteMedia } from '@/lib/http/cloudinary';
import { cldImage } from '@/lib/http/cloudinaryUrl';
import { validateUploadFile, MAX_IMAGE_BYTES } from '@/lib/http/uploadValidation';
import { cn } from '@/lib/format/utils';
import { partitionEditorImages, type TrackedImage } from './richTextImages';

const MAX_CHARS = 5000;

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  userId: string;
  onUploadImage: (file: File, userId: string) => Promise<{ url: string; publicId: string }>;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactElement;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps): ReactElement {
  return (
    <IconButton
      onClick={onClick}
      title={title}
      className={cn(
        'size-7 rounded-tb-pill transition-colors',
        active
          ? 'bg-accent-amber/20 text-accent-amber'
          : 'text-ink-sec hover:text-ink-pri hover:bg-canvas-elevated',
      )}
    >
      {children}
    </IconButton>
  );
}

export function RichTextEditor({ value, onChange, placeholder, userId, onUploadImage }: Props): ReactElement {
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Images uploaded into the editor this session, tracked with their Cloudinary
  // publicId so an image removed from the editor can be cleaned up (UP-03).
  const trackedRef = useRef<TrackedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      CharacterCount.configure({ limit: MAX_CHARS }),
    ],
    content: value || '',
    onUpdate({ editor: e }) {
      const html = e.isEmpty ? '' : e.getHTML();
      // Prune assets no longer referenced in the editor so they don't orphan on
      // Cloudinary (UP-03). Only session-uploaded images are tracked, so
      // pre-existing images embedded in `value` are never destroyed.
      const { kept, removed } = partitionEditorImages(trackedRef.current, html);
      if (removed.length) {
        trackedRef.current = kept;
        removed.forEach(img => void deleteMedia(img.publicId));
      }
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[160px] font-body text-sm text-ink-pri leading-relaxed',
      },
    },
  });

  async function handleImageFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (imageInputRef.current) imageInputRef.current.value = '';
    // UP-04: reject bad files before wasting an upload round-trip.
    const invalid = validateUploadFile(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const result = await onUploadImage(file, userId);
      // Embed the delivery-transformed URL, not the raw original — this string is
      // persisted into the description HTML and rendered as-is everywhere later.
      // Track that same URL so `partitionEditorImages` keeps matching it.
      const src = cldImage(result.url, 1000);
      editor.chain().focus().setImage({ src }).run();
      trackedRef.current = [...trackedRef.current, { url: src, publicId: result.publicId }];
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload ảnh thất bại');
    } finally {
      setUploading(false);
    }
  }

  const charCount = editor?.storage.characterCount.characters() ?? 0;
  const isNearLimit = charCount >= MAX_CHARS * 0.9;

  return (
    <div className="flex flex-col rounded-tb-input border border-bdr bg-canvas-elevated overflow-hidden focus-within:border-accent-amber/50 focus-within:ring-2 focus-within:ring-accent-amber/20 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-bdr bg-canvas-surface">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold')}
          title="Bold"
        >
          <Bold size={13} className="shrink-0" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive('italic')}
          title="Italic"
        >
          <Italic size={13} className="shrink-0" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive('heading', { level: 2 })}
          title="Heading"
        >
          <Heading2 size={13} className="shrink-0" />
        </ToolbarButton>

        <div className="w-px h-4 bg-bdr mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList')}
          title="Bullet list"
        >
          <List size={13} className="shrink-0" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive('orderedList')}
          title="Ordered list"
        >
          <ListOrdered size={13} className="shrink-0" />
        </ToolbarButton>

        <div className="w-px h-4 bg-bdr mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus size={13} className="shrink-0" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => imageInputRef.current?.click()}
          title={uploading ? 'Đang tải ảnh...' : 'Insert image'}
        >
          <ImagePlus size={13} className={cn('shrink-0', uploading && 'opacity-40')} />
        </ToolbarButton>

        <span className={cn('ml-auto text-xs font-mono tabular-nums', isNearLimit ? 'text-accent-red' : 'text-ink-muted')}>
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      {uploadError && (
        <p className="px-3.5 pt-2 text-xs text-accent-red font-body">{uploadError}</p>
      )}

      {/* Editor area */}
      <div className="relative px-3.5 py-2.5">
        {!editor?.getText().trim() && (
          <p className="absolute top-2.5 left-3.5 text-sm text-ink-muted font-body pointer-events-none select-none">
            {placeholder ?? 'Mô tả chi tiết về sản phẩm...'}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => void handleImageFile(e)}
      />
    </div>
  );
}
