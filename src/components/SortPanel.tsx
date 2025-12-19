import { useState } from 'react';
import { useStore } from '../store/useStore';
import './SortPanel.css';

export function SortPanel() {
  const sorts = useStore(state => state.sorts);
  const constructors = useStore(state => state.constructors);
  const selectedSortId = useStore(state => state.selectedSortId);
  const addSort = useStore(state => state.addSort);
  const deleteSort = useStore(state => state.deleteSort);
  const selectSort = useStore(state => state.selectSort);
  const addConstructor = useStore(state => state.addConstructor);
  const deleteConstructor = useStore(state => state.deleteConstructor);
  const [newSortName, setNewSortName] = useState('');
  const [newSortKind, setNewSortKind] = useState<'inductive' | 'atom'>('inductive');
  const [newSortIsBinder, setNewSortIsBinder] = useState(false);
  const [newAtomPrefix, setNewAtomPrefix] = useState('');
  const [showAddSort, setShowAddSort] = useState(false);
  const [newConstructorName, setNewConstructorName] = useState('');
  const [newConstructorArgs, setNewConstructorArgs] = useState<{ sortId: string; label: string }[]>([]);

  const sortsList = Array.from(sorts.values());
  const selectedSort = selectedSortId ? sorts.get(selectedSortId) : null;
  const sortConstructors = selectedSortId
    ? Array.from(constructors.values()).filter(c => c.sortId === selectedSortId)
    : [];

  const handleAddSort = () => {
    if (newSortName.trim()) {
      const prefix = newSortKind === 'atom' ? (newAtomPrefix.trim() || undefined) : undefined;
      const sort = addSort(newSortName.trim(), newSortKind, newSortIsBinder, prefix);
      selectSort(sort.id);
      setNewSortName('');
      setNewSortKind('inductive');
      setNewSortIsBinder(false);
      setNewAtomPrefix('');
      setShowAddSort(false);
    }
  };

  const handleAddConstructor = () => {
    if (newConstructorName.trim() && selectedSortId) {
      addConstructor(selectedSortId, newConstructorName.trim(), newConstructorArgs);
      setNewConstructorName('');
      setNewConstructorArgs([]);
    }
  };

  const addArgToNewConstructor = () => {
    if (sortsList.length > 0) {
      setNewConstructorArgs([
        ...newConstructorArgs,
        { sortId: selectedSortId || sortsList[0].id, label: '' }
      ]);
    }
  };

  const updateArgSort = (index: number, sortId: string) => {
    const updated = [...newConstructorArgs];
    updated[index] = { ...updated[index], sortId };
    setNewConstructorArgs(updated);
  };

  const updateArgLabel = (index: number, label: string) => {
    const updated = [...newConstructorArgs];
    updated[index] = { ...updated[index], label };
    setNewConstructorArgs(updated);
  };

  const removeArg = (index: number) => {
    setNewConstructorArgs(newConstructorArgs.filter((_, i) => i !== index));
  };

  return (
    <div className="sort-panel">
      <div className="panel-section">
        <div className="section-header">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Syntactic Sorts
          </h3>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowAddSort(!showAddSort)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {showAddSort && (
          <div className="add-form animate-fade-in">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                placeholder="e.g., Expr, Nat, Var"
                value={newSortName}
                onChange={e => setNewSortName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newSortName.trim() && handleAddSort()}
                autoFocus
                className={!newSortName.trim() ? 'input-empty' : ''}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Type</label>
              <div className="kind-toggle">
                <button 
                  className={`toggle-btn ${newSortKind === 'inductive' ? 'active' : ''}`}
                  onClick={() => { setNewSortKind('inductive'); setNewSortIsBinder(false); }}
                >
                  Inductive
                </button>
                <button 
                  className={`toggle-btn ${newSortKind === 'atom' ? 'active' : ''}`}
                  onClick={() => { setNewSortKind('atom'); setNewSortIsBinder(false); }}
                >
                  Atom
                </button>
              </div>
              <div className="kind-hint">
                {newSortKind === 'inductive' 
                  ? 'Define with constructors (e.g., ℕ := Z | S(n))'
                  : 'Infinite set of names (e.g., x₁, x₂, ...)'}
              </div>
            </div>

            {newSortKind === 'atom' && (
              <div className="form-group">
                <label className="form-label">Symbol prefix</label>
                <input
                  type="text"
                  placeholder="e.g., x, y, p"
                  value={newAtomPrefix}
                  onChange={e => setNewAtomPrefix(e.target.value)}
                  className="prefix-input"
                />
                <div className="kind-hint">
                  Will generate: {newAtomPrefix || 'x'}₁, {newAtomPrefix || 'x'}₂, {newAtomPrefix || 'x'}₃, ...
                </div>
              </div>
            )}

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={newSortIsBinder}
                onChange={e => setNewSortIsBinder(e.target.checked)}
              />
              <span>Can be used as a binder (λ, ∀, let, etc.)</span>
            </label>

            <div className="form-actions">
              <button 
                className="btn btn-primary" 
                onClick={handleAddSort}
                disabled={!newSortName.trim()}
              >
                Add Sort
              </button>
              <button className="btn btn-ghost" onClick={() => {
                setShowAddSort(false);
                setNewSortName('');
                setNewSortKind('inductive');
                setNewSortIsBinder(false);
                setNewAtomPrefix('');
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="sort-list">
          {sortsList.map((sort, index) => (
            <div
              key={sort.id}
              className={`sort-item ${selectedSortId === sort.id ? 'selected' : ''} ${sort.kind === 'atom' ? 'atom-sort' : ''}`}
              onClick={() => selectSort(sort.id)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="sort-info">
                <span
                  className="sort-name font-mono"
                  style={{ color: sort.color || (sort.isBinderSort ? 'var(--binder-color)' : 'var(--nonterminal-color)') }}
                >
                  {sort.name}
                </span>
                {sort.kind === 'atom' && (
                  <span className="badge badge-atom" title={`Atoms: ${sort.atomPrefix}₁, ${sort.atomPrefix}₂, ...`}>
                    {sort.isBinderSort ? 'bindable' : 'atom'}
                  </span>
                )}
                {sort.kind === 'inductive' && sort.isBinderSort && (
                  <span className="badge badge-binder">binder</span>
                )}
              </div>
              <button
                className="btn btn-ghost btn-icon delete-btn"
                onClick={e => {
                  e.stopPropagation();
                  deleteSort(sort.id);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedSort && selectedSort.kind === 'atom' && (
        <div className="panel-section atom-info-section animate-slide-in">
          <div className="section-header">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              Atom Sort:{' '}
              <span className="font-mono" style={{ color: selectedSort.color }}>
                {selectedSort.name}
              </span>
            </h3>
          </div>
          <div className="atom-details">
            <div className="atom-preview">
              <span className="atom-label">Examples:</span>
              <span className="atom-examples font-mono" style={{ color: selectedSort.color }}>
                {selectedSort.atomPrefix}₁, {selectedSort.atomPrefix}₂, {selectedSort.atomPrefix}₃, ...
              </span>
            </div>
            <div className="atom-properties">
              {selectedSort.isBinderSort ? (
                <span className="atom-property bindable">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  These atoms can be bound (e.g., λx. ...)
                </span>
              ) : (
                <span className="atom-property unbindable">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  These atoms are free identifiers (not bindable)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedSort && selectedSort.kind === 'inductive' && (
        <div className="panel-section constructors-section animate-slide-in">
          <div className="section-header">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Constructors for{' '}
              <span className="font-mono" style={{ color: selectedSort.color || (selectedSort.isBinderSort ? 'var(--binder-color)' : 'var(--nonterminal-color)') }}>
                {selectedSort.name}
              </span>
            </h3>
          </div>

          <div className="constructor-list">
            {sortConstructors.map((constructor, index) => (
              <div
                key={constructor.id}
                className="constructor-item"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="constructor-signature">
                  {/* Compute isTerminal dynamically: true only if no args reference the same sort */}
                  {(() => {
                    const isActuallyTerminal = constructor.args.length === 0 || 
                      !constructor.args.some(arg => arg.sortId === constructor.sortId);
                    return (
                      <>
                        <span className={`constructor-name font-mono ${isActuallyTerminal ? 'text-terminal' : 'text-nonterminal'}`}>
                          {constructor.name}
                        </span>
                        {constructor.args.length > 0 && (
                          <span className="constructor-args font-mono">
                            <span className="term-paren">(</span>
                            {constructor.args.map((arg, i) => {
                              const argSort = sorts.get(arg.sortId);
                              return (
                                <span key={arg.id}>
                                  {arg.label && <span className="arg-label">{arg.label}: </span>}
                                  <span style={{ color: argSort?.isBinderSort ? 'var(--binder-color)' : 'var(--nonterminal-color)' }}>
                                    {argSort?.name || '?'}
                                  </span>
                                  {arg.isBinder && <span className="binder-indicator" title="This argument is a binder">⁺</span>}
                                  {i < constructor.args.length - 1 && ', '}
                                </span>
                              );
                            })}
                            <span className="term-paren">)</span>
                          </span>
                        )}
                        {isActuallyTerminal && (
                          <span className="badge badge-terminal">terminal</span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <button
                  className="btn btn-ghost btn-icon delete-btn"
                  onClick={() => deleteConstructor(constructor.id)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="add-constructor">
            <div className="constructor-form">
              <input
                type="text"
                placeholder="Constructor name"
                value={newConstructorName}
                onChange={e => setNewConstructorName(e.target.value)}
                className="constructor-name-input"
              />
              
              {newConstructorArgs.length > 0 && (
                <div className="args-list">
                  {newConstructorArgs.map((arg, index) => (
                    <div key={index} className="arg-row">
                      <input
                        type="text"
                        placeholder="label"
                        value={arg.label}
                        onChange={e => updateArgLabel(index, e.target.value)}
                        className="arg-label-input"
                      />
                      <select
                        value={arg.sortId}
                        onChange={e => updateArgSort(index, e.target.value)}
                        className="arg-sort-select"
                      >
                        {sortsList.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => removeArg(index)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="constructor-form-actions">
                <button className="btn btn-ghost" onClick={addArgToNewConstructor}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Arg
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddConstructor}
                  disabled={!newConstructorName.trim()}
                >
                  Add Constructor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

