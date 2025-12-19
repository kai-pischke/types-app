import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { generateDefaultSeparators } from '../types/syntax';
import './JudgmentPanel.css';

type JudgmentTemplate = 'unary' | 'binary' | 'ternary' | 'custom';

const TEMPLATES: { id: JudgmentTemplate; label: string; example: string; argCount: number }[] = [
  { id: 'unary', label: 'Unary', example: 'e val', argCount: 1 },
  { id: 'binary', label: 'Binary', example: 'e ↓ v', argCount: 2 },
  { id: 'ternary', label: 'Ternary', example: 'Γ ⊢ e : τ', argCount: 3 },
];

export function JudgmentPanel() {
  const sorts = useStore(state => state.sorts);
  const judgments = useStore(state => state.judgments);
  const rules = useStore(state => state.rules);
  const selectedJudgmentId = useStore(state => state.selectedJudgmentId);
  const addJudgment = useStore(state => state.addJudgment);
  const updateJudgment = useStore(state => state.updateJudgment);
  const deleteJudgment = useStore(state => state.deleteJudgment);
  const selectJudgment = useStore(state => state.selectJudgment);
  const addRule = useStore(state => state.addRule);
  const deleteRule = useStore(state => state.deleteRule);
  const updateRule = useStore(state => state.updateRule);

  // Add judgment state
  const [showAddJudgment, setShowAddJudgment] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<JudgmentTemplate>('binary');
  const [newJudgmentName, setNewJudgmentName] = useState('');
  const [newJudgmentSymbol, setNewJudgmentSymbol] = useState('↓');
  const [newJudgmentArgs, setNewJudgmentArgs] = useState<{ sortId: string; label: string }[]>([]);
  const [newJudgmentSeparators, setNewJudgmentSeparators] = useState<string[]>(['', ' ↓ ', '']);

  // Edit judgment state
  const [editingJudgmentId, setEditingJudgmentId] = useState<string | null>(null);
  const [editJudgmentName, setEditJudgmentName] = useState('');
  const [editJudgmentSymbol, setEditJudgmentSymbol] = useState('');
  const [editJudgmentArgs, setEditJudgmentArgs] = useState<{ sortId: string; label: string }[]>([]);
  const [editJudgmentSeparators, setEditJudgmentSeparators] = useState<string[]>([]);

  // Rule state
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleName, setEditingRuleName] = useState('');

  const sortsList = Array.from(sorts.values());
  const judgmentsList = Array.from(judgments.values());
  const selectedJudgment = selectedJudgmentId ? judgments.get(selectedJudgmentId) : null;
  const selectedRules = selectedJudgmentId
    ? Array.from(rules.values()).filter(r => r.conclusion.judgmentId === selectedJudgmentId)
    : [];

  // Initialize args when template changes
  useEffect(() => {
    if (showAddJudgment && sortsList.length > 0) {
      const template = TEMPLATES.find(t => t.id === selectedTemplate);
      if (template) {
        const args: { sortId: string; label: string }[] = [];
        const defaultLabels = selectedTemplate === 'ternary' 
          ? ['Γ', 'e', 'τ'] 
          : selectedTemplate === 'binary' 
            ? ['e', 'v'] 
            : ['e'];
        
        for (let i = 0; i < template.argCount; i++) {
          args.push({ sortId: sortsList[0].id, label: defaultLabels[i] || '' });
        }
        setNewJudgmentArgs(args);
        setNewJudgmentSeparators(generateDefaultSeparators(template.argCount, newJudgmentSymbol));
      }
    }
  }, [selectedTemplate, showAddJudgment, sortsList.length]);

  // Update separators when symbol changes
  useEffect(() => {
    if (showAddJudgment && newJudgmentArgs.length > 0) {
      setNewJudgmentSeparators(generateDefaultSeparators(newJudgmentArgs.length, newJudgmentSymbol));
    }
  }, [newJudgmentSymbol]);

  const handleAddJudgment = () => {
    if (newJudgmentName.trim() && newJudgmentArgs.length > 0) {
      const judgment = addJudgment(
        newJudgmentName.trim(),
        newJudgmentSymbol.trim(),
        newJudgmentArgs,
        newJudgmentSeparators
      );
      selectJudgment(judgment.id);
      resetAddForm();
    }
  };

  const resetAddForm = () => {
    setNewJudgmentName('');
    setNewJudgmentSymbol('↓');
    setNewJudgmentArgs([]);
    setNewJudgmentSeparators(['', ' ↓ ', '']);
    setSelectedTemplate('binary');
    setShowAddJudgment(false);
  };

  const updateNewArgSort = (index: number, sortId: string) => {
    const updated = [...newJudgmentArgs];
    updated[index] = { ...updated[index], sortId };
    setNewJudgmentArgs(updated);
  };

  const updateNewArgLabel = (index: number, label: string) => {
    const updated = [...newJudgmentArgs];
    updated[index] = { ...updated[index], label };
    setNewJudgmentArgs(updated);
  };

  const updateNewSeparator = (index: number, value: string) => {
    const updated = [...newJudgmentSeparators];
    updated[index] = value;
    setNewJudgmentSeparators(updated);
  };

  // Edit judgment functions
  const startEditingJudgment = (judgmentId: string) => {
    const judgment = judgments.get(judgmentId);
    if (judgment) {
      setEditingJudgmentId(judgmentId);
      setEditJudgmentName(judgment.name);
      setEditJudgmentSymbol(judgment.symbol);
      setEditJudgmentArgs([...judgment.argSorts]);
      setEditJudgmentSeparators(judgment.separators ? [...judgment.separators] : generateDefaultSeparators(judgment.argSorts.length, judgment.symbol));
      setShowAddJudgment(false);
    }
  };

  const handleUpdateJudgment = () => {
    if (editingJudgmentId && editJudgmentName.trim() && editJudgmentArgs.length > 0) {
      updateJudgment(editingJudgmentId, {
        name: editJudgmentName.trim(),
        symbol: editJudgmentSymbol.trim(),
        argSorts: editJudgmentArgs,
        separators: editJudgmentSeparators,
      });
      cancelEditingJudgment();
    }
  };

  const cancelEditingJudgment = () => {
    setEditingJudgmentId(null);
    setEditJudgmentName('');
    setEditJudgmentSymbol('');
    setEditJudgmentArgs([]);
    setEditJudgmentSeparators([]);
  };

  const addEditArg = () => {
    if (sortsList.length > 0) {
      const newArgs = [...editJudgmentArgs, { sortId: sortsList[0].id, label: '' }];
      setEditJudgmentArgs(newArgs);
      // Add a separator for the new arg
      const newSeps = [...editJudgmentSeparators];
      newSeps.splice(newSeps.length - 1, 0, ', ');
      setEditJudgmentSeparators(newSeps);
    }
  };


  const updateEditArgSort = (index: number, sortId: string) => {
    const updated = [...editJudgmentArgs];
    updated[index] = { ...updated[index], sortId };
    setEditJudgmentArgs(updated);
  };

  const updateEditArgLabel = (index: number, label: string) => {
    const updated = [...editJudgmentArgs];
    updated[index] = { ...updated[index], label };
    setEditJudgmentArgs(updated);
  };

  const updateEditSeparator = (index: number, value: string) => {
    const updated = [...editJudgmentSeparators];
    updated[index] = value;
    setEditJudgmentSeparators(updated);
  };

  // Rule functions
  const handleAddRule = () => {
    if (newRuleName.trim() && selectedJudgmentId) {
      addRule(newRuleName.trim(), selectedJudgmentId);
      setNewRuleName('');
      setShowAddRule(false);
    }
  };

  const startEditingRule = (ruleId: string, currentName: string) => {
    setEditingRuleId(ruleId);
    setEditingRuleName(currentName);
  };

  const handleRenameRule = () => {
    if (editingRuleId && editingRuleName.trim()) {
      updateRule(editingRuleId, { name: editingRuleName.trim() });
      setEditingRuleId(null);
      setEditingRuleName('');
    }
  };

  const cancelEditingRule = () => {
    setEditingRuleId(null);
    setEditingRuleName('');
  };

  // Render judgment preview with separators
  const renderJudgmentPreview = (
    args: { sortId: string; label: string }[],
    separators: string[],
    isCompact: boolean = false
  ) => {
    if (args.length === 0) return null;

    return (
      <span className={`judgment-preview-display ${isCompact ? 'compact' : ''}`}>
        {args.map((arg, i) => {
          const sort = sorts.get(arg.sortId);
          return (
            <span key={i}>
              {separators[i] && <span className="separator">{separators[i]}</span>}
              <span 
                className="arg-display"
                style={{ color: sort?.isBinderSort ? 'var(--binder-color)' : 'var(--nonterminal-color)' }}
              >
                {arg.label || sort?.name || '?'}
              </span>
            </span>
          );
        })}
        {separators[args.length] && <span className="separator">{separators[args.length]}</span>}
      </span>
    );
  };

  // Common separator presets for ternary judgments
  const TERNARY_PRESETS = [
    { label: 'Typing', seps: ['', ' ⊢ ', ' : ', ''], desc: 'Γ ⊢ e : τ' },
    { label: 'Step', seps: ['', ' ; ', ' → ', ''], desc: 'σ ; e → e\'' },
    { label: 'Eval', seps: ['', ' , ', ' ⇓ ', ''], desc: 'ρ , e ⇓ v' },
  ];

  // Render the form for adding/editing a judgment
  const renderJudgmentForm = (
    isEditing: boolean,
    name: string,
    setName: (v: string) => void,
    symbol: string,
    setSymbol: (v: string) => void,
    args: { sortId: string; label: string }[],
    separators: string[],
    updateArgSort: (i: number, v: string) => void,
    updateArgLabel: (i: number, v: string) => void,
    updateSeparator: (i: number, v: string) => void,
    onSubmit: () => void,
    onCancel: () => void,
    setSeparators?: (seps: string[]) => void
  ) => {
    const canSubmit = name.trim() && args.length > 0;
    const argCount = args.length;

    return (
      <div className="judgment-form animate-fade-in">
        {/* Live Preview */}
        <div className="form-preview">
          <span className="preview-label">Preview:</span>
          <span className="preview-content font-mono">
            {renderJudgmentPreview(args, separators)}
          </span>
        </div>

        {/* Name input */}
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            placeholder="e.g., eval, typed, step"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Symbol/Separator controls - different UI based on arg count */}
        {argCount === 1 && (
          <div className="form-group">
            <label>Suffix (appears after argument)</label>
            <div className="symbol-row">
              <input
                type="text"
                value={separators[1] || ''}
                onChange={e => updateSeparator(1, e.target.value)}
                className="symbol-input"
                placeholder="e.g., val"
              />
              <div className="symbol-suggestions">
                {[' val', ' ok', ' closed', ' ↓', ' ⇓'].map(suf => (
                  <button
                    key={suf}
                    className={`symbol-btn ${separators[1] === suf ? 'active' : ''}`}
                    onClick={() => updateSeparator(1, suf)}
                  >
                    {suf.trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {argCount === 2 && (
          <div className="form-group">
            <label>Symbol (between arguments)</label>
            <div className="symbol-row">
              <input
                type="text"
                value={symbol}
                onChange={e => {
                  setSymbol(e.target.value);
                  updateSeparator(1, ` ${e.target.value} `);
                }}
                className="symbol-input"
              />
              <div className="symbol-suggestions">
                {['↓', '⇒', '→', '⊢', '≡', '∼', '⊑', '∈', ':', '⟹', '⇓'].map(sym => (
                  <button
                    key={sym}
                    className={`symbol-btn ${symbol === sym ? 'active' : ''}`}
                    onClick={() => {
                      setSymbol(sym);
                      updateSeparator(1, ` ${sym} `);
                    }}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {argCount >= 3 && setSeparators && (
          <div className="form-group">
            <label>Separators</label>
            
            {/* Quick presets */}
            <div className="ternary-presets">
              {TERNARY_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  className={`preset-btn ${JSON.stringify(separators) === JSON.stringify(preset.seps) ? 'active' : ''}`}
                  onClick={() => setSeparators(preset.seps)}
                >
                  <span className="preset-label">{preset.label}</span>
                  <span className="preset-desc font-mono">{preset.desc}</span>
                </button>
              ))}
            </div>

            {/* Custom separator editors */}
            <div className="custom-separators">
              <span className="custom-sep-label">Or customize:</span>
              <div className="separator-slots">
                {args.map((_, i) => (
                  i > 0 && (
                    <div key={i} className="separator-slot">
                      <span className="slot-label">between arg {i} & {i + 1}:</span>
                      <input
                        type="text"
                        className="separator-custom-input"
                        value={separators[i] || ''}
                        onChange={e => updateSeparator(i, e.target.value)}
                        placeholder="separator"
                      />
                      <div className="separator-quickpicks">
                        {[' ⊢ ', ' : ', ' → ', ' ⇒ ', ' ; ', ' , ', ' ↓ ', ' ⇓ '].map(sym => (
                          <button
                            key={sym}
                            className={`sep-pick-btn ${separators[i] === sym ? 'active' : ''}`}
                            onClick={() => updateSeparator(i, sym)}
                            title={sym.trim()}
                          >
                            {sym.trim()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Arguments with inline separators */}
        <div className="form-group">
          <label>Arguments {argCount >= 3 ? '& Separators' : ''}</label>
          <div className={`args-separators-editor ${argCount < 3 ? 'simple-mode' : ''}`}>
            {args.map((arg, i) => (
              <div key={i} className="arg-sep-row">
                {/* Separator before this arg - only show for 3+ args */}
                {argCount >= 3 && (
                  <input
                    type="text"
                    className="separator-input"
                    value={separators[i] || ''}
                    onChange={e => updateSeparator(i, e.target.value)}
                    placeholder={i === 0 ? '(prefix)' : 'sep'}
                    title={`Separator before argument ${i + 1}`}
                  />
                )}
                
                {/* Argument */}
                <div className="arg-editor">
                  <input
                    type="text"
                    className="arg-label-input"
                    value={arg.label}
                    onChange={e => updateArgLabel(i, e.target.value)}
                    placeholder="label"
                  />
                  <select
                    value={arg.sortId}
                    onChange={e => updateArgSort(i, e.target.value)}
                    className="arg-sort-select"
                  >
                    {sortsList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {isEditing && args.length > 1 && (
                    <button
                      className="btn btn-ghost btn-icon remove-arg-btn"
                      onClick={() => {
                        const newArgs = args.filter((_, idx) => idx !== i);
                        const newSeps = [...separators];
                        newSeps.splice(i + 1, 1);
                        // This is a bit hacky - we need to call the parent's setState
                        if (isEditing) {
                          setEditJudgmentArgs(newArgs);
                          setEditJudgmentSeparators(newSeps);
                        }
                      }}
                      title="Remove argument"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Final separator (suffix) - only show for 3+ args */}
            {argCount >= 3 && (
              <div className="arg-sep-row suffix-row">
                <input
                  type="text"
                  className="separator-input"
                  value={separators[args.length] || ''}
                  onChange={e => updateSeparator(args.length, e.target.value)}
                  placeholder="(suffix)"
                  title="Separator after last argument"
                />
              </div>
            )}
          </div>
          
          {isEditing && (
            <button className="btn btn-ghost add-arg-btn" onClick={addEditArg}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Argument
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {isEditing ? 'Save' : 'Create'}
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="judgment-panel">
      <div className="panel-section">
        <div className="section-header">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Judgment Forms
          </h3>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => {
              setShowAddJudgment(!showAddJudgment);
              if (!showAddJudgment) cancelEditingJudgment();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {showAddJudgment && (
          <div className="add-judgment-form">
            {/* Template selector */}
            <div className="template-selector">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  className={`template-btn ${selectedTemplate === t.id ? 'active' : ''}`}
                  onClick={() => setSelectedTemplate(t.id)}
                >
                  <span className="template-label">{t.label}</span>
                  <span className="template-example font-mono">{t.example}</span>
                </button>
              ))}
            </div>

            {renderJudgmentForm(
              false,
              newJudgmentName,
              setNewJudgmentName,
              newJudgmentSymbol,
              setNewJudgmentSymbol,
              newJudgmentArgs,
              newJudgmentSeparators,
              updateNewArgSort,
              updateNewArgLabel,
              updateNewSeparator,
              handleAddJudgment,
              resetAddForm,
              setNewJudgmentSeparators
            )}
          </div>
        )}

        <div className="judgment-list">
          {judgmentsList.map((judgment, index) => (
            <div key={judgment.id}>
              {editingJudgmentId === judgment.id ? (
                renderJudgmentForm(
                  true,
                  editJudgmentName,
                  setEditJudgmentName,
                  editJudgmentSymbol,
                  setEditJudgmentSymbol,
                  editJudgmentArgs,
                  editJudgmentSeparators,
                  updateEditArgSort,
                  updateEditArgLabel,
                  updateEditSeparator,
                  handleUpdateJudgment,
                  cancelEditingJudgment,
                  setEditJudgmentSeparators
                )
              ) : (
                <div
                  className={`judgment-item ${selectedJudgmentId === judgment.id ? 'selected' : ''}`}
                  onClick={() => selectJudgment(judgment.id)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="judgment-info">
                    <span className="judgment-name">{judgment.name}</span>
                    <span className="judgment-preview font-mono">
                      {renderJudgmentPreview(
                        judgment.argSorts,
                        judgment.separators || generateDefaultSeparators(judgment.argSorts.length, judgment.symbol),
                        true
                      )}
                    </span>
                  </div>
                  <div className="judgment-actions">
                    <button
                      className="btn btn-ghost btn-icon edit-btn"
                      onClick={e => {
                        e.stopPropagation();
                        startEditingJudgment(judgment.id);
                      }}
                      title="Edit judgment"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="btn btn-ghost btn-icon delete-btn"
                      onClick={e => {
                        e.stopPropagation();
                        deleteJudgment(judgment.id);
                      }}
                      title="Delete judgment"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedJudgment && (
        <div className="panel-section rules-section animate-slide-in">
          <div className="section-header">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="15" x2="20" y2="15" />
                <line x1="10" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="14" y2="21" />
              </svg>
              Rules for <span className="text-judgment">{selectedJudgment.name}</span>
            </h3>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setShowAddRule(!showAddRule)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {showAddRule && (
            <div className="add-form animate-fade-in">
              <input
                type="text"
                placeholder="Rule name (e.g., E-Zero)"
                value={newRuleName}
                onChange={e => setNewRuleName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddRule()}
                autoFocus
              />
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleAddRule}
                  disabled={!newRuleName.trim()}
                >
                  Add Rule
                </button>
                <button className="btn btn-ghost" onClick={() => setShowAddRule(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="rules-list">
            {selectedRules.map((rule, index) => (
              <div
                key={rule.id}
                className="rule-item"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="rule-info">
                  {editingRuleId === rule.id ? (
                    <div className="rule-edit-form">
                      <input
                        type="text"
                        value={editingRuleName}
                        onChange={e => setEditingRuleName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameRule();
                          if (e.key === 'Escape') cancelEditingRule();
                        }}
                        autoFocus
                        className="rule-name-input"
                      />
                      <button className="btn btn-ghost btn-icon" onClick={handleRenameRule} title="Save">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={cancelEditingRule} title="Cancel">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span 
                        className="rule-name text-rule font-serif"
                        onDoubleClick={() => startEditingRule(rule.id, rule.name)}
                        title="Double-click to rename"
                      >
                        {rule.name}
                      </span>
                      <span className="rule-meta text-xs">
                        {rule.premises.length} premise{rule.premises.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
                <div className="rule-actions">
                  <button
                    className="btn btn-ghost btn-icon edit-btn"
                    onClick={() => startEditingRule(rule.id, rule.name)}
                    title="Rename rule"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-ghost btn-icon delete-btn"
                    onClick={() => deleteRule(rule.id)}
                    title="Delete rule"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
