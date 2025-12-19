import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { Term } from '../types/syntax';
import { generateRandomTerm, resetAtomCounter } from '../types/syntax';
import './TermDisplay.css';

export function TermDisplay() {
  const sorts = useStore(state => state.sorts);
  const constructors = useStore(state => state.constructors);
  const selectedSortId = useStore(state => state.selectedSortId);
  
  const [generatedTerms, setGeneratedTerms] = useState<Map<string, Term[]>>(new Map());
  const [maxDepth, setMaxDepth] = useState(3);
  const [numTerms, setNumTerms] = useState(5);

  const selectedSort = selectedSortId ? sorts.get(selectedSortId) : null;
  const currentTerms = selectedSortId ? generatedTerms.get(selectedSortId) || [] : [];

  const generateTerms = useCallback(() => {
    if (!selectedSortId) return;
    
    resetAtomCounter(); // Reset atom counter for fresh names
    const terms: Term[] = [];
    for (let i = 0; i < numTerms; i++) {
      const term = generateRandomTerm(selectedSortId, constructors, sorts, maxDepth);
      if (term) terms.push(term);
    }
    
    setGeneratedTerms(prev => {
      const newMap = new Map(prev);
      newMap.set(selectedSortId, terms);
      return newMap;
    });
  }, [selectedSortId, constructors, sorts, maxDepth, numTerms]);

  const renderTerm = (term: Term, depth: number = 0): React.ReactNode => {
    // Handle atom terms (variables)
    if (term.isVariable && term.variableName) {
      // Find the sort for this atom
      // Atoms don't have constructorId, so we use the sort from context
      return (
        <span className="term-atom term-binder">
          {term.variableName}
        </span>
      );
    }

    const constructor = constructors.get(term.constructorId);
    if (!constructor) return <span className="term-error">?</span>;

    const sort = sorts.get(constructor.sortId);
    // Compute terminal status dynamically: no args that reference the same sort
    const isTerminal = constructor.args.length === 0 || 
      !constructor.args.some(arg => arg.sortId === constructor.sortId);
    const isBinder = sort?.isBinderSort;

    const colorClass = isBinder 
      ? 'term-binder' 
      : isTerminal 
        ? 'term-terminal' 
        : 'term-nonterminal';

    if (term.args.length === 0) {
      return (
        <span className={`term-constructor ${colorClass}`}>
          {constructor.name}
        </span>
      );
    }

    return (
      <span className="term">
        <span className={`term-constructor ${colorClass}`}>
          {constructor.name}
        </span>
        <span className="term-paren">(</span>
        {term.args.map((arg, i) => (
          <span key={arg.id}>
            {renderTerm(arg, depth + 1)}
            {i < term.args.length - 1 && <span className="term-comma">, </span>}
          </span>
        ))}
        <span className="term-paren">)</span>
      </span>
    );
  };

  // Alternative tree-style rendering
  const renderTermTree = (term: Term, depth: number = 0, isLast: boolean = true, prefix: string = ''): React.ReactNode => {
    const connector = depth === 0 ? '' : isLast ? '└─ ' : '├─ ';
    const childPrefix = prefix + (depth === 0 ? '' : isLast ? '   ' : '│  ');

    // Handle atom terms
    if (term.isVariable && term.variableName) {
      return (
        <div className="term-tree-node" key={term.id}>
          <span className="term-tree-prefix">{prefix}{connector}</span>
          <span className="term-atom term-binder">
            {term.variableName}
          </span>
        </div>
      );
    }

    const constructor = constructors.get(term.constructorId);
    if (!constructor) return null;

    const sort = sorts.get(constructor.sortId);
    // Compute terminal status dynamically
    const isTerminal = constructor.args.length === 0 || 
      !constructor.args.some(arg => arg.sortId === constructor.sortId);
    const isBinder = sort?.isBinderSort;

    const colorClass = isBinder 
      ? 'term-binder' 
      : isTerminal 
        ? 'term-terminal' 
        : 'term-nonterminal';

    return (
      <div className="term-tree-node" key={term.id}>
        <span className="term-tree-prefix">{prefix}{connector}</span>
        <span className={`term-constructor ${colorClass}`}>
          {constructor.name}
        </span>
        {term.args.map((arg, i) => (
          <div key={arg.id} style={{ marginLeft: 0 }}>
            {renderTermTree(arg, depth + 1, i === term.args.length - 1, childPrefix)}
          </div>
        ))}
      </div>
    );
  };

  const [viewMode, setViewMode] = useState<'inline' | 'tree'>('inline');

  return (
    <div className="term-display">
      <div className="term-display-header">
        <div className="header-left">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            Term Instances
            {selectedSort && (
              <span className="sort-label font-mono" style={{ color: selectedSort.isBinderSort ? 'var(--binder-color)' : 'var(--nonterminal-color)' }}>
                {selectedSort.name}
              </span>
            )}
          </h3>
        </div>
        <div className="header-controls">
          <div className="control-group">
            <label>Depth:</label>
            <input
              type="number"
              min="1"
              max="6"
              value={maxDepth}
              onChange={e => setMaxDepth(parseInt(e.target.value) || 3)}
              className="depth-input"
            />
          </div>
          <div className="control-group">
            <label>Count:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={numTerms}
              onChange={e => setNumTerms(parseInt(e.target.value) || 5)}
              className="count-input"
            />
          </div>
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'inline' ? 'active' : ''}`}
              onClick={() => setViewMode('inline')}
              title="Inline view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <button
              className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => setViewMode('tree')}
              title="Tree view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v18" />
                <path d="M18 9H6" />
                <path d="M21 15H3" />
              </svg>
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={generateTerms}
            disabled={!selectedSortId}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            Generate
          </button>
        </div>
      </div>

      <div className="term-display-content">
        {!selectedSortId ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <p>Select a sort to generate term instances</p>
          </div>
        ) : currentTerms.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p>Click "Generate" to create random terms</p>
          </div>
        ) : (
          <div className={`terms-grid ${viewMode}`}>
            {currentTerms.map((term, index) => (
              <div
                key={term.id}
                className="term-card animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="term-card-header">
                  <span className="term-index">#{index + 1}</span>
                </div>
                <div className="term-card-body font-mono">
                  {viewMode === 'inline' ? renderTerm(term) : renderTermTree(term)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

