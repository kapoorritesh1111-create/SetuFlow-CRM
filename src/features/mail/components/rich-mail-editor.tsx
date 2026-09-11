'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Quote, Redo2, Strikethrough, Undo2 } from 'lucide-react';
import styles from './mail-interactions.module.css';

export function RichMailEditor({ html, disabled, onChange }: { html: string; disabled: boolean; onChange: (html: string, text: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: html || '<p></p>',
    editable: !disabled,
    immediatelyRender: false,
    editorProps: { attributes: { class: styles.richEditor, 'aria-label': 'Message' } },
    onUpdate: ({ editor: current }) => onChange(current.getHTML(), current.getText({ blockSeparator: '\n' })),
  });

  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  useEffect(() => {
    if (!editor) return;
    const next = html || '<p></p>';
    if (editor.getHTML() !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, html]);

  if (!editor) return <div className={styles.editorLoading}>Loading editor…</div>;
  const item = (label: string, active: boolean, disabledCommand: boolean, action: () => void, icon: React.ReactNode) => (
    <button type="button" className={`${styles.editorButton} ${active ? styles.editorButtonActive : ''}`} aria-label={label} title={label} disabled={disabled || disabledCommand} onClick={action}>{icon}</button>
  );

  return <div className={styles.editorShell}>
    <div className={styles.editorToolbar} aria-label="Formatting toolbar">
      {item('Bold', editor.isActive('bold'), !editor.can().chain().focus().toggleBold().run(), () => editor.chain().focus().toggleBold().run(), <Bold size={16}/>)}
      {item('Italic', editor.isActive('italic'), !editor.can().chain().focus().toggleItalic().run(), () => editor.chain().focus().toggleItalic().run(), <Italic size={16}/>)}
      {item('Strikethrough', editor.isActive('strike'), !editor.can().chain().focus().toggleStrike().run(), () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={16}/>)}
      <span className={styles.editorDivider}/>
      {item('Bulleted list', editor.isActive('bulletList'), false, () => editor.chain().focus().toggleBulletList().run(), <List size={16}/>)}
      {item('Numbered list', editor.isActive('orderedList'), false, () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={16}/>)}
      {item('Block quote', editor.isActive('blockquote'), false, () => editor.chain().focus().toggleBlockquote().run(), <Quote size={16}/>)}
      <span className={styles.editorDivider}/>
      {item('Undo', false, !editor.can().chain().focus().undo().run(), () => editor.chain().focus().undo().run(), <Undo2 size={16}/>)}
      {item('Redo', false, !editor.can().chain().focus().redo().run(), () => editor.chain().focus().redo().run(), <Redo2 size={16}/>)}
    </div>
    <EditorContent editor={editor}/>
  </div>;
}
