import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import CharacterCount from '@tiptap/extension-character-count';
import { Bold, Italic, List, ListOrdered, ImagePlus, Heading2, Minus } from 'lucide-react';
import { useRef, type ReactElement, type ChangeEvent } from 'react';
import { IconButton } from '@/components/shared/IconButton';
import { cn } from '@/lib/utils';

const MAX_CHARS = 5000;

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  userId: number;
  onUploadImage: (file: File, userId: number) => Promise<{ url: string }>;
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      CharacterCount.configure({ limit: MAX_CHARS }),
    ],
    content: value || '',
    onUpdate({ editor: e }) {
      const html = e.isEmpty ? '' : e.getHTML();
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
    const result = await onUploadImage(file, userId);
    editor.chain().focus().setImage({ src: result.url }).run();
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
          title="Insert image"
        >
          <ImagePlus size={13} className="shrink-0" />
        </ToolbarButton>

        <span className={cn('ml-auto text-xs font-mono tabular-nums', isNearLimit ? 'text-accent-red' : 'text-ink-muted')}>
          {charCount}/{MAX_CHARS}
        </span>
      </div>

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
