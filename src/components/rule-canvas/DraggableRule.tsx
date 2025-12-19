import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

interface DraggableRuleProps {
  rule: { id: string; position: { x: number; y: number } };
  children: ReactNode;
}

export function DraggableRule({ rule, children }: DraggableRuleProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: rule.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    left: rule.position.x,
    top: rule.position.y,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="draggable-rule"
    >
      {children}
    </div>
  );
}

