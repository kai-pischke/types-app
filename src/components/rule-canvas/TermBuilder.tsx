import React from 'react';
import { useStore } from '../../store/useStore';
import type { Term } from '../../types/syntax';
import { uuidv4 } from '../../utils/uuid';

interface TermBuilderProps {
  sortId: string;
  value: Term | null;
  onChange: (term: Term | null) => void;
}

// Helper to convert number to subscript
function toSubscript(n: number): string {
  const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  return n.toString().split('').map(d => subscripts[parseInt(d)]).join('');
}

export function TermBuilder({ sortId, value, onChange }: TermBuilderProps) {
  const constructors = useStore(state => state.constructors);
  const sorts = useStore(state => state.sorts);

  const handleClear = () => {
    onChange(null);
  };

  // Render a term (or placeholder)
  const renderTerm = (term: Term | null, expectedSortId: string, onUpdate: (t: Term | null) => void, isNested: boolean = false): React.ReactNode => {
    const expectedSort = sorts.get(expectedSortId);

    if (!term) {
      // Check if this is an atom sort
      if (expectedSort?.kind === 'atom') {
        const prefix = expectedSort.atomPrefix || expectedSort.name.toLowerCase().charAt(0);
        return (
          <span className={`term-builder-slot atom-slot ${isNested ? 'nested' : ''}`}>
            <span className="slot-label">{expectedSort.name}</span>
            <span className="atom-picker">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  className="atom-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({
                      id: uuidv4(),
                      constructorId: '',
                      args: [],
                      isVariable: true,
                      variableName: `${prefix}${toSubscript(i)}`,
                    });
                  }}
                  title={`Select ${prefix}${toSubscript(i)}`}
                >
                  {prefix}{toSubscript(i)}
                </button>
              ))}
            </span>
          </span>
        );
      }

      // Inductive sort - show constructor picker
      const availableConstructors = Array.from(constructors.values()).filter(c => c.sortId === expectedSortId);
      
      return (
        <span className={`term-builder-slot ${isNested ? 'nested' : ''}`}>
          <span className="slot-label">{expectedSort?.name || '?'}</span>
          <span className="constructor-picker">
            {availableConstructors.map(c => (
              <button
                key={c.id}
                className="constructor-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (c.args.length === 0) {
                    onUpdate({
                      id: uuidv4(),
                      constructorId: c.id,
                      args: [],
                    });
                  } else {
                    onUpdate({
                      id: uuidv4(),
                      constructorId: c.id,
                      args: c.args.map(() => null as unknown as Term),
                    });
                  }
                }}
                title={c.args.length > 0 ? `${c.name}(${c.args.map(a => sorts.get(a.sortId)?.name || '?').join(', ')})` : c.name}
              >
                {c.name}
                {c.args.length > 0 && <span className="constructor-arity">⟨{c.args.length}⟩</span>}
              </button>
            ))}
          </span>
        </span>
      );
    }

    // Handle atom terms (variables)
    if (term.isVariable && term.variableName) {
      return (
        <span 
          className="term-builder-leaf atom-leaf" 
          onClick={(e) => { e.stopPropagation(); onUpdate(null); }} 
          title="Click to change"
          style={{ color: expectedSort?.color || 'var(--binder-color)' }}
        >
          {term.variableName}
        </span>
      );
    }

    const constructor = constructors.get(term.constructorId);
    if (!constructor) return <span className="term-error">?</span>;

    if (term.args.length === 0) {
      // Leaf term - show with option to change
      return (
        <span 
          className="term-builder-leaf" 
          onClick={(e) => { e.stopPropagation(); onUpdate(null); }} 
          title="Click to change"
        >
          {constructor.name}
        </span>
      );
    }

    // Term with args - use visual nesting instead of parentheses
    return (
      <span className="term-builder-node">
        <span 
          className="term-constructor" 
          onClick={(e) => { e.stopPropagation(); onUpdate(null); }} 
          title="Click to change"
        >
          {constructor.name}
        </span>
        <span className="term-args-container">
          {term.args.map((arg, i) => (
            <span key={i} className="term-arg">
              {renderTerm(
                arg,
                constructor.args[i]?.sortId || '',
                (newArg) => {
                  const newArgs = [...term.args];
                  newArgs[i] = newArg as Term;
                  onUpdate({ ...term, args: newArgs });
                },
                true
              )}
            </span>
          ))}
        </span>
      </span>
    );
  };

  return (
    <span className="term-builder">
      {renderTerm(value, sortId, onChange, false)}
      {value && (
        <button className="term-builder-clear" onClick={handleClear} title="Clear term">
          ×
        </button>
      )}
    </span>
  );
}
