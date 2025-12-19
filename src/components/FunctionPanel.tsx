import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { RecursiveFunc, FuncExpr, FuncReturnType, FuncCase, FuncArg, Constructor, Sort } from '../types/syntax';
import { renderFuncExpr } from '../types/syntax';
import './FunctionPanel.css';

export function FunctionPanel() {
  const sorts = useStore(state => state.sorts);
  const constructors = useStore(state => state.constructors);
  const recursiveFunctions = useStore(state => state.recursiveFunctions);
  const selectedFuncId = useStore(state => state.selectedFuncId);
  const addRecursiveFunc = useStore(state => state.addRecursiveFunc);
  const updateRecursiveFunc = useStore(state => state.updateRecursiveFunc);
  const deleteRecursiveFunc = useStore(state => state.deleteRecursiveFunc);
  const selectFunc = useStore(state => state.selectFunc);
  const updateFuncCase = useStore(state => state.updateFuncCase);

  const [showAddFunc, setShowAddFunc] = useState(false);
  const [newFuncName, setNewFuncName] = useState('');
  const [newFuncInputSort, setNewFuncInputSort] = useState('');
  const [newFuncReturnKind, setNewFuncReturnKind] = useState<'int' | 'set' | 'inductive'>('int');
  const [newFuncSetSort, setNewFuncSetSort] = useState('');
  const [newFuncIndSort, setNewFuncIndSort] = useState('');

  // Get only inductive sorts (functions are defined over inductive types)
  const inductiveSorts = Array.from(sorts.values()).filter(s => s.kind === 'inductive');
  // Get atom sorts for set return types
  const atomSorts = Array.from(sorts.values()).filter(s => s.kind === 'atom');

  const handleAddFunc = () => {
    if (!newFuncName.trim() || !newFuncInputSort) return;
    
    let returnType: FuncReturnType;
    if (newFuncReturnKind === 'int') {
      returnType = { kind: 'int' };
    } else if (newFuncReturnKind === 'set') {
      if (!newFuncSetSort) return;
      returnType = { kind: 'set', elementSortId: newFuncSetSort };
    } else {
      if (!newFuncIndSort) return;
      returnType = { kind: 'inductive', sortId: newFuncIndSort };
    }
    
    addRecursiveFunc(newFuncName.trim(), newFuncInputSort, returnType);
    setNewFuncName('');
    setNewFuncReturnKind('int');
    setNewFuncSetSort('');
    setNewFuncIndSort('');
    setShowAddFunc(false);
  };

  const selectedFunc = selectedFuncId ? recursiveFunctions.get(selectedFuncId) : null;

  return (
    <div className="function-panel">
      <div className="panel-section">
        <div className="section-header">
          <h3>Recursive Functions</h3>
          <button 
            className="btn btn-icon" 
            onClick={() => setShowAddFunc(!showAddFunc)}
            title="Add function"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {showAddFunc && (
          <div className="add-form">
            <input
              type="text"
              placeholder="Function name (e.g., size, fv, depth)"
              value={newFuncName}
              onChange={e => setNewFuncName(e.target.value)}
              autoFocus
            />
            <div className="form-row">
              <label>Input sort:</label>
              <select 
                value={newFuncInputSort} 
                onChange={e => setNewFuncInputSort(e.target.value)}
              >
                <option value="">Select sort...</option>
                {inductiveSorts.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Return type:</label>
              <select 
                value={newFuncReturnKind}
                onChange={e => setNewFuncReturnKind(e.target.value as 'int' | 'set' | 'inductive')}
              >
                <option value="int">ℤ (integer)</option>
                <option value="set">Set⟨…⟩</option>
                <option value="inductive">Inductive type</option>
              </select>
            </div>
            {newFuncReturnKind === 'set' && (
              <div className="form-row">
                <label>Set element sort:</label>
                <select 
                  value={newFuncSetSort}
                  onChange={e => setNewFuncSetSort(e.target.value)}
                >
                  <option value="">Select sort...</option>
                  {atomSorts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {newFuncReturnKind === 'inductive' && (
              <div className="form-row">
                <label>Return sort:</label>
                <select 
                  value={newFuncIndSort}
                  onChange={e => setNewFuncIndSort(e.target.value)}
                >
                  <option value="">Select sort...</option>
                  {inductiveSorts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleAddFunc}>Add</button>
              <button className="btn btn-ghost" onClick={() => setShowAddFunc(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="function-list">
          {Array.from(recursiveFunctions.values()).map(func => (
            <FunctionItem
              key={func.id}
              func={func}
              isSelected={func.id === selectedFuncId}
              onSelect={() => selectFunc(func.id)}
              onDelete={() => deleteRecursiveFunc(func.id)}
              sorts={sorts}
            />
          ))}
          {recursiveFunctions.size === 0 && !showAddFunc && (
            <div className="empty-state">
              <p>No functions defined yet.</p>
              <p className="hint">Define recursive functions like size, depth, or fv.</p>
            </div>
          )}
        </div>
      </div>

      {selectedFunc && (
        <div className="panel-section func-editor">
          <div className="section-header">
            <h3>Edit: {selectedFunc.name}</h3>
            <div className="termination-badge">
              {selectedFunc.terminates ? (
                <span className="badge success">✓ Terminates</span>
              ) : (
                <span className="badge error" title={selectedFunc.terminationError}>
                  ✗ Non-terminating
                </span>
              )}
            </div>
          </div>
          
          <FunctionEditor
            func={selectedFunc}
            constructors={constructors}
            sorts={sorts}
            functions={recursiveFunctions}
            onUpdateCase={(constructorId, caseUpdate) => 
              updateFuncCase(selectedFunc.id, constructorId, caseUpdate)
            }
            onUpdateFunc={(updates) => updateRecursiveFunc(selectedFunc.id, updates)}
          />
        </div>
      )}
    </div>
  );
}

interface FunctionItemProps {
  func: RecursiveFunc;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  sorts: Map<string, Sort>;
}

function FunctionItem({ func, isSelected, onSelect, onDelete, sorts }: FunctionItemProps) {
  const inputSort = sorts.get(func.inputSortId);
  let returnTypeStr: string;
  if (func.returnType.kind === 'int') {
    returnTypeStr = 'ℤ';
  } else if (func.returnType.kind === 'set') {
    returnTypeStr = `Set⟨${sorts.get(func.returnType.elementSortId)?.name || '?'}⟩`;
  } else {
    returnTypeStr = sorts.get(func.returnType.sortId)?.name || '?';
  }
  
  // Show extra args in signature
  const extraArgsStr = (func.extraArgs || []).map(a => {
    const sortName = sorts.get(a.sortId)?.name || '?';
    return `${a.name}: ${sortName}`;
  }).join(', ');

  return (
    <div 
      className={`function-item ${isSelected ? 'selected' : ''} ${!func.terminates ? 'non-terminating' : ''}`}
      onClick={onSelect}
    >
      <div className="func-signature">
        <span className="func-name">{func.name}</span>
        <span className="func-type">
          : {inputSort?.name || '?'}{extraArgsStr ? ` × ${extraArgsStr.replace(/: /g, ': ')}` : ''} → {returnTypeStr}
        </span>
      </div>
      {!func.terminates && (
        <span className="warning-icon" title={func.terminationError}>⚠</span>
      )}
      <button 
        className="btn btn-icon btn-ghost delete-btn"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete function"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

interface FunctionEditorProps {
  func: RecursiveFunc;
  constructors: Map<string, Constructor>;
  sorts: Map<string, Sort>;
  functions: Map<string, RecursiveFunc>;
  onUpdateCase: (constructorId: string, caseUpdate: Partial<FuncCase>) => void;
  onUpdateFunc: (updates: Partial<RecursiveFunc>) => void;
}

function FunctionEditor({ func, constructors, sorts, functions, onUpdateCase, onUpdateFunc }: FunctionEditorProps) {
  const sortConstructors = Array.from(constructors.values()).filter(c => c.sortId === func.inputSortId);
  const inductiveSorts = Array.from(sorts.values()).filter(s => s.kind === 'inductive');
  const atomSorts = Array.from(sorts.values()).filter(s => s.kind === 'atom');
  const allSorts = [...inductiveSorts, ...atomSorts];

  const [showAddArg, setShowAddArg] = useState(false);
  const [newArgName, setNewArgName] = useState('');
  const [newArgSortId, setNewArgSortId] = useState('');

  const handleAddExtraArg = () => {
    if (!newArgName.trim() || !newArgSortId) return;
    const newArg: FuncArg = {
      name: newArgName.trim(),
      sortId: newArgSortId,
      isPrincipal: false, // Extra args are never principal
    };
    onUpdateFunc({ extraArgs: [...(func.extraArgs || []), newArg] });
    setNewArgName('');
    setNewArgSortId('');
    setShowAddArg(false);
  };

  const handleRemoveExtraArg = (index: number) => {
    const newArgs = [...(func.extraArgs || [])];
    newArgs.splice(index, 1);
    onUpdateFunc({ extraArgs: newArgs });
  };
  
  return (
    <div className="func-editor-content">
      {/* Extra arguments section */}
      <div className="extra-args-section">
        <div className="section-label">
          <span>Additional Arguments</span>
          <button 
            className="btn btn-icon btn-small"
            onClick={() => setShowAddArg(!showAddArg)}
            title="Add argument"
          >
            +
          </button>
        </div>
        
        {(func.extraArgs || []).length > 0 && (
          <div className="extra-args-list">
            {(func.extraArgs || []).map((arg, i) => (
              <div key={i} className="extra-arg-item">
                <span className="arg-name">{arg.name}</span>
                <span className="arg-type">: {sorts.get(arg.sortId)?.name || '?'}</span>
                <button 
                  className="btn btn-icon btn-ghost"
                  onClick={() => handleRemoveExtraArg(i)}
                  title="Remove argument"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddArg && (
          <div className="add-arg-form">
            <input
              type="text"
              placeholder="Arg name (e.g., x, v)"
              value={newArgName}
              onChange={e => setNewArgName(e.target.value)}
              autoFocus
            />
            <select value={newArgSortId} onChange={e => setNewArgSortId(e.target.value)}>
              <option value="">Select type...</option>
              {allSorts.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button className="btn btn-small btn-primary" onClick={handleAddExtraArg}>Add</button>
            <button className="btn btn-small btn-ghost" onClick={() => setShowAddArg(false)}>Cancel</button>
          </div>
        )}

        {(func.extraArgs || []).length === 0 && !showAddArg && (
          <div className="empty-hint">No extra arguments. Click + to add.</div>
        )}
      </div>

      {/* Cases */}
      <div className="func-cases">
        {sortConstructors.map(constructor => {
          const funcCase = func.cases.find(c => c.constructorId === constructor.id);
          if (!funcCase) return null;

          return (
            <CaseEditor
              key={constructor.id}
              constructor={constructor}
              funcCase={funcCase}
              func={func}
              sorts={sorts}
              functions={functions}
              constructors={constructors}
              onUpdateCase={(update) => onUpdateCase(constructor.id, update)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CaseEditorProps {
  constructor: Constructor;
  funcCase: FuncCase;
  func: RecursiveFunc;
  sorts: Map<string, Sort>;
  functions: Map<string, RecursiveFunc>;
  constructors: Map<string, Constructor>;
  onUpdateCase: (update: Partial<FuncCase>) => void;
}

function CaseEditor({ constructor, funcCase, func, sorts, functions, constructors, onUpdateCase }: CaseEditorProps) {
  const [editing, setEditing] = useState(false);

  // Classify bound variables: structural (same sort as input) vs atoms vs other
  const varInfo = funcCase.boundVars.map((varName, i) => {
    const argSort = constructor.args[i]?.sortId;
    const sort = argSort ? sorts.get(argSort) : null;
    const isStructural = argSort === func.inputSortId;
    const isAtom = sort?.kind === 'atom';
    return { name: varName, isStructural, isAtom, sortName: sort?.name || '?' };
  }).filter(v => v.name);

  const structuralVars = varInfo.filter(v => v.isStructural).map(v => v.name);
  const atomVars = varInfo.filter(v => v.isAtom).map(v => v.name);
  const isSetReturn = func.returnType.kind === 'set';
  const isInductiveReturn = func.returnType.kind === 'inductive';
  const returnSortId = func.returnType.kind === 'inductive' ? func.returnType.sortId : undefined;

  // Render the pattern with type hints
  const renderPatternVar = (varName: string, info: typeof varInfo[0]) => {
    if (info.isAtom) {
      return <span key={varName} className="var-atom" title={`Atom: ${info.sortName}`}>{varName}</span>;
    }
    if (info.isStructural) {
      return <span key={varName} className="var-structural" title={`Recursive: ${info.sortName}`}>{varName}</span>;
    }
    return <span key={varName} className="var-other" title={info.sortName}>{varName}</span>;
  };

  const patternContent = constructor.args.length === 0
    ? constructor.name
    : null;

  return (
    <div className="func-case">
      <div className="case-pattern">
        <span className="func-name">{func.name}</span>
        <span className="pattern">
          ({patternContent || varInfo.map((info, i) => (
            <span key={info.name}>
              {i > 0 && ', '}
              {renderPatternVar(info.name, info)}
            </span>
          ))})
        </span>
        <span className="equals">=</span>
      </div>
      <div className="case-body">
        {editing ? (
          <VisualExprBuilder
            expr={funcCase.body}
            onChange={(newExpr) => onUpdateCase({ body: newExpr })}
            onClose={() => setEditing(false)}
            func={func}
            structuralVars={structuralVars}
            atomVars={atomVars}
            allVars={funcCase.boundVars}
            extraArgs={func.extraArgs || []}
            isSetReturn={isSetReturn}
            isInductiveReturn={isInductiveReturn}
            returnSortId={returnSortId}
            functions={functions}
            constructors={constructors}
            sorts={sorts}
          />
        ) : (
          <div className="body-display" onClick={() => setEditing(true)}>
            <code>{renderFuncExpr(funcCase.body, functions, constructors)}</code>
            <span className="edit-hint">click to edit</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Visual Expression Builder
// ============================================================================

interface VisualExprBuilderProps {
  expr: FuncExpr;
  onChange: (expr: FuncExpr) => void;
  onClose: () => void;
  func: RecursiveFunc;
  structuralVars: string[];
  atomVars: string[];
  allVars: string[];
  extraArgs: FuncArg[];
  isSetReturn: boolean;
  isInductiveReturn: boolean;
  returnSortId?: string;
  functions: Map<string, RecursiveFunc>;
  constructors: Map<string, Constructor>;
  sorts: Map<string, Sort>;
}

function VisualExprBuilder({ 
  expr, onChange, onClose, func, structuralVars, atomVars, allVars, extraArgs, 
  isSetReturn, isInductiveReturn, returnSortId, functions, constructors, sorts
}: VisualExprBuilderProps) {
  const [selectedPath, setSelectedPath] = useState<number[] | null>(null);
  const [intValue, setIntValue] = useState('0');

  // Get expression at path
  const getExprAtPath = (e: FuncExpr, path: number[]): FuncExpr => {
    if (path.length === 0) return e;
    const [idx, ...rest] = path;
    if ('left' in e && 'right' in e) {
      return getExprAtPath(idx === 0 ? e.left : e.right, rest);
    }
    if (e.kind === 'singleton') return getExprAtPath(e.element, rest);
    if (e.kind === 'call') return getExprAtPath(e.arg, rest);
    if (e.kind === 'callMulti') return getExprAtPath(e.args[idx], rest);
    if (e.kind === 'construct') return getExprAtPath(e.args[idx], rest);
    if (e.kind === 'if') {
      if (idx === 0) return getExprAtPath(e.then, rest);
      if (idx === 1) return getExprAtPath(e.else, rest);
    }
    return e;
  };

  // Replace expression at path
  const replaceAtPath = (e: FuncExpr, path: number[], newExpr: FuncExpr): FuncExpr => {
    if (path.length === 0) return newExpr;
    const [idx, ...rest] = path;
    
    switch (e.kind) {
      case 'add':
      case 'sub':
      case 'mul':
      case 'max':
      case 'min':
      case 'union':
      case 'intersect':
      case 'diff':
        if (idx === 0) {
          return { kind: e.kind, left: replaceAtPath(e.left, rest, newExpr), right: e.right };
        } else {
          return { kind: e.kind, left: e.left, right: replaceAtPath(e.right, rest, newExpr) };
        }
      case 'singleton':
        return { kind: 'singleton', element: replaceAtPath(e.element, rest, newExpr) };
      case 'call':
        return { kind: 'call', funcId: e.funcId, arg: replaceAtPath(e.arg, rest, newExpr) };
      case 'callMulti': {
        const newArgs = [...e.args];
        newArgs[idx] = replaceAtPath(e.args[idx], rest, newExpr);
        return { kind: 'callMulti', funcId: e.funcId, args: newArgs };
      }
      case 'construct': {
        const newArgs = [...e.args];
        newArgs[idx] = replaceAtPath(e.args[idx], rest, newExpr);
        return { kind: 'construct', constructorId: e.constructorId, args: newArgs };
      }
      case 'if':
        if (idx === 0) {
          return { ...e, then: replaceAtPath(e.then, rest, newExpr) };
        } else if (idx === 1) {
          return { ...e, else: replaceAtPath(e.else, rest, newExpr) };
        }
        return e;
      default:
        return e;
    }
  };

  const handleReplace = (newExpr: FuncExpr) => {
    if (selectedPath === null) {
      onChange(newExpr);
    } else {
      onChange(replaceAtPath(expr, selectedPath, newExpr));
    }
    setSelectedPath(null);
  };

  const handleClick = (ev: React.MouseEvent, path: number[]) => {
    ev.stopPropagation();
    setSelectedPath(path);
  };

  const renderExpr = (e: FuncExpr, path: number[] = []): React.ReactNode => {
    const isSelected = selectedPath !== null && 
      selectedPath.length === path.length && 
      selectedPath.every((v, i) => v === path[i]);
    
    const baseClass = `expr-node ${isSelected ? 'selected' : ''}`;

    switch (e.kind) {
      case 'int':
        return (
          <span className={`${baseClass} expr-int`} onClick={(ev) => handleClick(ev, path)}>
            {e.value}
          </span>
        );
      case 'empty':
        return (
          <span className={`${baseClass} expr-empty`} onClick={(ev) => handleClick(ev, path)}>
            ∅
          </span>
        );
      case 'var': {
        const varType = atomVars.includes(e.name) ? 'atom' : structuralVars.includes(e.name) ? 'structural' : '';
        return (
          <span className={`${baseClass} expr-var ${varType}`} onClick={(ev) => handleClick(ev, path)}>
            {e.name}
          </span>
        );
      }
      case 'singleton':
        return (
          <span className={`${baseClass} expr-singleton`} onClick={(ev) => handleClick(ev, path)}>
            {'{'}{renderExpr(e.element, [...path, 0])}{'}'}
          </span>
        );
      case 'call': {
        const calledFunc = functions.get(e.funcId);
        return (
          <span className={`${baseClass} expr-call`} onClick={(ev) => handleClick(ev, path)}>
            <span className="call-name">{calledFunc?.name || '?'}</span>
            ({renderExpr(e.arg, [...path, 0])})
          </span>
        );
      }
      case 'callMulti': {
        const calledFunc = functions.get(e.funcId);
        return (
          <span className={`${baseClass} expr-call`} onClick={(ev) => handleClick(ev, path)}>
            <span className="call-name">{calledFunc?.name || '?'}</span>
            ({e.args.map((arg, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {renderExpr(arg, [...path, i])}
              </span>
            ))})
          </span>
        );
      }
      case 'construct': {
        const constr = constructors.get(e.constructorId);
        if (e.args.length === 0) {
          return (
            <span className={`${baseClass} expr-construct`} onClick={(ev) => handleClick(ev, path)}>
              {constr?.name || '?'}
            </span>
          );
        }
        return (
          <span className={`${baseClass} expr-construct`} onClick={(ev) => handleClick(ev, path)}>
            <span className="construct-name">{constr?.name || '?'}</span>
            ({e.args.map((arg, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {renderExpr(arg, [...path, i])}
              </span>
            ))})
          </span>
        );
      }
      case 'if':
        return (
          <span className={`${baseClass} expr-if`} onClick={(ev) => handleClick(ev, path)}>
            <span className="if-keyword">if</span> ... <span className="if-keyword">then</span> {renderExpr(e.then, [...path, 0])} <span className="if-keyword">else</span> {renderExpr(e.else, [...path, 1])}
          </span>
        );
      case 'add':
      case 'sub':
      case 'mul':
      case 'max':
      case 'min':
      case 'union':
      case 'intersect':
      case 'diff': {
        const opSymbols: Record<string, string> = {
          add: '+', sub: '−', mul: '×', max: 'max', min: 'min',
          union: '∪', intersect: '∩', diff: '\\'
        };
        const sym = opSymbols[e.kind];
        if (e.kind === 'max' || e.kind === 'min') {
          return (
            <span className={`${baseClass} expr-binop`} onClick={(ev) => handleClick(ev, path)}>
              {sym}({renderExpr(e.left, [...path, 0])}, {renderExpr(e.right, [...path, 1])})
            </span>
          );
        }
        return (
          <span className={`${baseClass} expr-binop`} onClick={(ev) => handleClick(ev, path)}>
            {renderExpr(e.left, [...path, 0])} {sym} {renderExpr(e.right, [...path, 1])}
          </span>
        );
      }
      default:
        return <span className={baseClass}>?</span>;
    }
  };

  const clearSelection = () => setSelectedPath(null);

  return (
    <div className="visual-expr-builder">
      <div className="expr-preview" onClick={clearSelection}>
        {renderExpr(expr)}
      </div>
      
      {selectedPath !== null && (
        <div className="selection-info">
          <span>Selected: click a button below to replace</span>
          <button className="btn btn-ghost btn-sm" onClick={clearSelection}>Clear selection</button>
        </div>
      )}
      
      {selectedPath === null && (
        <div className="selection-info hint">
          Click any part of the expression to select it, or click a button to replace the whole expression
        </div>
      )}
      
      <div className="builder-palette">
        {/* Literals */}
        <div className="palette-section">
          <div className="palette-label">Values</div>
          <div className="palette-items">
            {isSetReturn && (
              <button className="palette-btn empty" onClick={() => handleReplace({ kind: 'empty' })}>
                ∅
              </button>
            )}
            {!isSetReturn && (
              <div className="int-input-group">
                <input 
                  type="number" 
                  value={intValue}
                  onChange={e => setIntValue(e.target.value)}
                  className="int-input"
                />
                <button 
                  className="palette-btn int" 
                  onClick={() => handleReplace({ kind: 'int', value: parseInt(intValue) || 0 })}
                >
                  #
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Variables */}
        {allVars.length > 0 && (
          <div className="palette-section">
            <div className="palette-label">Variables</div>
            <div className="palette-items">
              {allVars.map(v => {
                const isAtom = atomVars.includes(v);
                const isStruct = structuralVars.includes(v);
                return (
                  <button 
                    key={v}
                    className={`palette-btn var ${isAtom ? 'atom' : isStruct ? 'structural' : ''}`}
                    onClick={() => handleReplace({ kind: 'var', name: v })}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Singleton (for atoms) */}
        {isSetReturn && atomVars.length > 0 && (
          <div className="palette-section">
            <div className="palette-label">Singleton</div>
            <div className="palette-items">
              {atomVars.map(v => (
                <button 
                  key={v}
                  className="palette-btn singleton"
                  onClick={() => handleReplace({ kind: 'singleton', element: { kind: 'var', name: v } })}
                >
                  {`{${v}}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recursive calls */}
        {structuralVars.length > 0 && (
          <div className="palette-section">
            <div className="palette-label">Recursive</div>
            <div className="palette-items">
              {structuralVars.map(v => (
                <button 
                  key={v}
                  className="palette-btn recursive"
                  onClick={() => handleReplace({ kind: 'call', funcId: func.id, arg: { kind: 'var', name: v } })}
                >
                  {func.name}({v})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Set operations */}
        {isSetReturn && (
          <div className="palette-section">
            <div className="palette-label">Set Ops</div>
            <div className="palette-items">
              <button 
                className="palette-btn op"
                onClick={() => handleReplace({ 
                  kind: 'union', 
                  left: { kind: 'empty' }, 
                  right: { kind: 'empty' } 
                })}
              >
                _ ∪ _
              </button>
              <button 
                className="palette-btn op"
                onClick={() => handleReplace({ 
                  kind: 'diff', 
                  left: { kind: 'empty' }, 
                  right: { kind: 'empty' } 
                })}
              >
                _ \ _
              </button>
              <button 
                className="palette-btn op"
                onClick={() => handleReplace({ 
                  kind: 'intersect', 
                  left: { kind: 'empty' }, 
                  right: { kind: 'empty' } 
                })}
              >
                _ ∩ _
              </button>
            </div>
          </div>
        )}

        {/* Arithmetic operations */}
        {!isSetReturn && !isInductiveReturn && (
          <div className="palette-section">
            <div className="palette-label">Arithmetic</div>
            <div className="palette-items">
              <button 
                className="palette-btn op"
                onClick={() => handleReplace({ 
                  kind: 'add', 
                  left: { kind: 'int', value: 0 }, 
                  right: { kind: 'int', value: 0 } 
                })}
              >
                _ + _
              </button>
              <button 
                className="palette-btn op"
                onClick={() => handleReplace({ 
                  kind: 'sub', 
                  left: { kind: 'int', value: 0 }, 
                  right: { kind: 'int', value: 0 } 
                })}
              >
                _ − _
              </button>
              <button 
                className="palette-btn op"
                onClick={() => handleReplace({ 
                  kind: 'mul', 
                  left: { kind: 'int', value: 1 }, 
                  right: { kind: 'int', value: 1 } 
                })}
              >
                _ × _
              </button>
              <button 
                className="palette-btn op"
                onClick={() => handleReplace({ 
                  kind: 'max', 
                  left: { kind: 'int', value: 0 }, 
                  right: { kind: 'int', value: 0 } 
                })}
              >
                max
              </button>
              <button 
                className="palette-btn op"
                onClick={() => handleReplace({ 
                  kind: 'min', 
                  left: { kind: 'int', value: 0 }, 
                  right: { kind: 'int', value: 0 } 
                })}
              >
                min
              </button>
            </div>
          </div>
        )}

        {/* Extra arguments as variables */}
        {extraArgs.length > 0 && (
          <div className="palette-section">
            <div className="palette-label">Extra Args</div>
            <div className="palette-items">
              {extraArgs.map(arg => {
                const argSort = sorts.get(arg.sortId);
                const isAtom = argSort?.kind === 'atom';
                return (
                  <button 
                    key={arg.name}
                    className={`palette-btn var ${isAtom ? 'atom' : ''}`}
                    onClick={() => handleReplace({ kind: 'var', name: arg.name })}
                    title={`${arg.name}: ${argSort?.name || '?'}`}
                  >
                    {arg.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Constructors for inductive return types */}
        {isInductiveReturn && returnSortId && (() => {
          const returnSortConstructors = Array.from(constructors.values()).filter(c => c.sortId === returnSortId);
          return (
            <div className="palette-section">
              <div className="palette-label">Constructors</div>
              <div className="palette-items">
                {returnSortConstructors.map(constr => {
                  const defaultArgs = constr.args.map(() => ({ kind: 'var' as const, name: '_' }));
                  return (
                    <button 
                      key={constr.id}
                      className="palette-btn construct"
                      onClick={() => handleReplace({ 
                        kind: 'construct', 
                        constructorId: constr.id,
                        args: defaultArgs
                      })}
                      title={`${constr.name}(${constr.args.map((a, i) => a.label || `x${i}`).join(', ')})`}
                    >
                      {constr.name}{constr.args.length > 0 ? '(…)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Multi-arg recursive calls (when extra args exist) */}
        {extraArgs.length > 0 && structuralVars.length > 0 && (
          <div className="palette-section">
            <div className="palette-label">Recursive (multi-arg)</div>
            <div className="palette-items">
              {structuralVars.map(v => {
                // Create a call with the structural var as principal arg, and extra args with defaults
                const args: FuncExpr[] = [
                  { kind: 'var', name: v },
                  ...extraArgs.map(a => ({ kind: 'var' as const, name: a.name }))
                ];
                return (
                  <button 
                    key={v}
                    className="palette-btn recursive"
                    onClick={() => handleReplace({ kind: 'callMulti', funcId: func.id, args })}
                  >
                    {func.name}({v}, {extraArgs.map(a => a.name).join(', ')})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="builder-actions">
        <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
