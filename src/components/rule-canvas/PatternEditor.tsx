import { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { Pattern } from '../../types/syntax';

interface PatternEditorProps {
  pattern: Pattern;
  sortId: string;
  onUpdate: (newPattern: Pattern) => void;
  onClose: () => void;
}

export function PatternEditor({ pattern, sortId, onUpdate, onClose }: PatternEditorProps) {
  const sorts = useStore(state => state.sorts);
  const constructors = useStore(state => state.constructors);
  const metaVariables = useStore(state => state.metaVariables);
  const addMetaVariable = useStore(state => state.addMetaVariable);

  const [inputValue, setInputValue] = useState(() => {
    if (pattern.metaVariableId) {
      const mv = metaVariables.get(pattern.metaVariableId);
      return mv?.name || '';
    }
    return '';
  });

  const sort = sorts.get(sortId);
  const availableConstructors = Array.from(constructors.values()).filter(c => c.sortId === sortId);
  const availableMetaVars = Array.from(metaVariables.values()).filter(mv => mv.sortId === sortId);

  const handleSetMetaVariable = (name: string) => {
    let mv = availableMetaVars.find(m => m.name === name);
    if (!mv) {
      mv = addMetaVariable(name, sortId);
    }
    onUpdate({
      ...pattern,
      metaVariableId: mv.id,
      constructorId: undefined,
      args: [],
    });
    onClose();
  };

  const handleSetConstructor = (constructorId: string) => {
    const constructor = constructors.get(constructorId);
    if (!constructor) return;

    const newArgs: Pattern[] = constructor.args.map(() => ({
      id: crypto.randomUUID(),
      args: [],
    }));

    onUpdate({
      ...pattern,
      constructorId,
      metaVariableId: undefined,
      args: newArgs,
    });
    onClose();
  };

  return (
    <div className="pattern-editor" onPointerDown={e => e.stopPropagation()}>
      <div className="pattern-editor-header">
        <span>Edit pattern ({sort?.name || '?'})</span>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="pattern-section">
        <label>Meta-variable:</label>
        <div className="metavar-input-row">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && inputValue.trim()) {
                handleSetMetaVariable(inputValue.trim());
              }
              if (e.key === 'Escape') onClose();
            }}
            placeholder="e.g., n, e, Γ"
            autoFocus
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => inputValue.trim() && handleSetMetaVariable(inputValue.trim())}
            disabled={!inputValue.trim()}
          >
            Set
          </button>
        </div>
        {availableMetaVars.length > 0 && (
          <div className="existing-metavars">
            {availableMetaVars.map(mv => (
              <button
                key={mv.id}
                className="metavar-btn"
                onClick={() => handleSetMetaVariable(mv.name)}
              >
                {mv.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {availableConstructors.length > 0 && (
        <div className="pattern-section">
          <label>Or use constructor:</label>
          <div className="constructor-options">
            {availableConstructors.map(c => (
              <button
                key={c.id}
                className="constructor-btn"
                onClick={() => handleSetConstructor(c.id)}
              >
                <span className={c.isTerminal ? 'terminal' : 'nonterminal'}>
                  {c.name}
                </span>
                {c.args.length > 0 && (
                  <span className="constructor-arity">({c.args.length} args)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

