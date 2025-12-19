import { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { 
  Formula, 
  FormulaExpr, 
  Tactic,
  RecursiveFunc,
  SortId,
  FuncCase,
} from '../types/syntax';
import { renderFormula, renderFormulaExpr, isGoalTrivial } from '../types/syntax';
import './ProofPanel.css';

export function ProofPanel() {
  const sorts = useStore(state => state.sorts);
  const constructors = useStore(state => state.constructors);
  const judgments = useStore(state => state.judgments);
  const recursiveFunctions = useStore(state => state.recursiveFunctions);
  const properties = useStore(state => state.properties);
  const proofs = useStore(state => state.proofs);
  const selectedPropertyId = useStore(state => state.selectedPropertyId);
  const selectedProofId = useStore(state => state.selectedProofId);
  const selectedGoalId = useStore(state => state.selectedGoalId);
  
  const addProperty = useStore(state => state.addProperty);
  const deleteProperty = useStore(state => state.deleteProperty);
  const selectProperty = useStore(state => state.selectProperty);
  const startProof = useStore(state => state.startProof);
  const selectGoal = useStore(state => state.selectGoal);
  const applyTactic = useStore(state => state.applyTactic);
  const getProofForProperty = useStore(state => state.getProofForProperty);

  const [showAddProperty, setShowAddProperty] = useState(false);
  const [propertyName, setPropertyName] = useState('');
  const [formula, setFormula] = useState<Formula | null>(null);
  const [proofMessage, setProofMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedProperty = selectedPropertyId ? properties.get(selectedPropertyId) : null;
  const selectedProof = selectedProofId ? proofs.get(selectedProofId) : null;
  const selectedGoal = selectedGoalId && selectedProof ? selectedProof.goals.get(selectedGoalId) : null;

  const renderF = (f: Formula) => renderFormula(f, constructors, recursiveFunctions, judgments, sorts);
  const renderE = (e: FormulaExpr) => renderFormulaExpr(e, constructors, recursiveFunctions);

  const handleTactic = (tactic: Tactic, description: string) => {
    if (!selectedProofId || !selectedGoalId) return;
    
    const result = applyTactic(selectedProofId, selectedGoalId, tactic);
    if (!result.success) {
      setProofMessage({ type: 'error', text: result.error || 'Tactic failed' });
    } else {
      setProofMessage({ type: 'success', text: description });
    }
    setTimeout(() => setProofMessage(null), 2000);
  };

  // Get function cases that could apply to a given expression
  const getApplicableFuncCases = (expr: FormulaExpr): { func: RecursiveFunc; case_: FuncCase; result: string }[] => {
    const results: { func: RecursiveFunc; case_: FuncCase; result: string }[] = [];
    
    if (expr.kind === 'funcApp') {
      const func = recursiveFunctions.get(expr.funcId);
      if (func) {
        for (const c of func.cases) {
          // Show all cases for this function
          const constructor = constructors.get(c.constructorId);
          if (constructor && c.body) {
            const patternStr = constructor.args.length === 0 
              ? constructor.name 
              : `${constructor.name}(${c.boundVars.join(', ')})`;
            results.push({
              func,
              case_: c,
              result: `${func.name}(${patternStr}) = ${renderFuncExprStr(c.body, func, constructors, recursiveFunctions)}`
            });
          }
        }
      }
    }
    
    return results;
  };

  return (
    <div className="proof-panel">
      <aside className="proof-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">Theorems</span>
          <button 
            className="add-btn"
            onClick={() => {
              setShowAddProperty(!showAddProperty);
              setFormula(null);
              setPropertyName('');
            }}
          >
            {showAddProperty ? '×' : '+'}
          </button>
        </div>

        <div className="property-list">
          {Array.from(properties.values()).map(prop => {
            const proof = getProofForProperty(prop.id);
            const status = proof?.status || 'unstarted';
            
            return (
              <div
                key={prop.id}
                className={`property-item ${selectedPropertyId === prop.id ? 'active' : ''} ${status}`}
                onClick={() => {
                  selectProperty(prop.id);
                  if (proof && proof.openGoals.length > 0) {
                    selectGoal(proof.openGoals[0]);
                  }
                }}
              >
                <div className={`status-indicator ${status}`}>
                  {status === 'complete' ? '✓' : status === 'incomplete' ? '○' : '·'}
                </div>
                <span className="property-name">{prop.name}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProperty(prop.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {showAddProperty && (
          <div className="new-property-form">
            <input
              type="text"
              className="property-name-input"
              placeholder="Theorem name"
              value={propertyName}
              onChange={e => setPropertyName(e.target.value)}
              autoFocus
            />
            
            <TreeFormulaBuilder
              value={formula}
              onChange={setFormula}
              sorts={sorts}
              judgments={judgments}
              functions={recursiveFunctions}
            />
            
            {formula && (
              <div className="formula-preview">
                <span className="preview-formula">{renderF(formula)}</span>
              </div>
            )}
            
            <button
              className="create-btn"
              disabled={!propertyName || !formula}
              onClick={() => {
                if (propertyName && formula) {
                  addProperty(propertyName, formula);
                  setPropertyName('');
                  setFormula(null);
                  setShowAddProperty(false);
                }
              }}
            >
              Create Theorem
            </button>
          </div>
        )}
      </aside>

      <main className="proof-main">
        {!selectedProperty ? (
          <div className="empty-state">
            <div className="empty-symbol">∀</div>
            <h2>Proof Assistant</h2>
            <p>Select a theorem to prove</p>
          </div>
        ) : (
          <div className="proof-workspace">
            <header className="theorem-header">
              <h1>{selectedProperty.name}</h1>
              {selectedProof?.status === 'complete' && <span className="qed">QED ✓</span>}
            </header>

            {!selectedProof ? (
              <div className="start-section">
                <div className="theorem-display">{renderF(selectedProperty.formula)}</div>
                <button className="begin-btn" onClick={() => startProof(selectedProperty.id)}>
                  Begin Proof
                </button>
              </div>
            ) : selectedProof.openGoals.length === 0 ? (
              <div className="proof-complete">
                <div className="complete-check">✓</div>
                <h3>Theorem Proved</h3>
                <div className="proved-statement">
                  <div className="proved-formula">{renderF(selectedProperty.formula)}</div>
                </div>
              </div>
            ) : (
              <div className="proof-area">
                {proofMessage && (
                  <div className={`proof-message ${proofMessage.type}`}>
                    {proofMessage.text}
                  </div>
                )}
                
                {/* Goal tabs with status */}
                {selectedProof.openGoals.length > 0 && (() => {
                  // Count trivial goals
                  const trivialGoalIds: string[] = [];
                  selectedProof.openGoals.forEach(gid => {
                    const g = selectedProof.goals.get(gid);
                    if (g && isGoalTrivial(g.goal, g.context.hypotheses).trivial) {
                      trivialGoalIds.push(gid);
                    }
                  });
                  
                  return (
                    <div className="goal-tabs-container">
                      <div className="goal-progress-row">
                        <div className="goal-progress">
                          {selectedProof.openGoals.length === 1 ? '1 goal remaining' : `${selectedProof.openGoals.length} goals remaining`}
                          {trivialGoalIds.length > 0 && (
                            <span className="trivial-count"> ({trivialGoalIds.length} auto-solvable)</span>
                          )}
                        </div>
                        {trivialGoalIds.length > 1 && (
                          <button 
                            className="solve-all-btn"
                            onClick={() => {
                              // Solve all trivial goals
                              trivialGoalIds.forEach(gid => {
                                const g = selectedProof.goals.get(gid);
                                if (g) {
                                  const check = isGoalTrivial(g.goal, g.context.hypotheses);
                                  if (check.trivial && check.tactic) {
                                    let tactic: Tactic;
                                    if (check.tactic === 'simplify') tactic = { kind: 'simplify' };
                                    else if (check.tactic === 'reflexivity') tactic = { kind: 'reflexivity' };
                                    else tactic = { kind: 'trivial' };
                                    applyTactic(selectedProofId!, gid, tactic);
                                  }
                                }
                              });
                              setProofMessage({ type: 'success', text: `Solved ${trivialGoalIds.length} trivial goals` });
                            }}
                          >
                            Solve All Trivial
                          </button>
                        )}
                      </div>
                      {selectedProof.openGoals.length > 1 && (
                        <div className="goal-tabs">
                          {selectedProof.openGoals.map((gid, i) => {
                            const g = selectedProof.goals.get(gid);
                            const isTrivial = g ? isGoalTrivial(g.goal, g.context.hypotheses).trivial : false;
                            return (
                              <button
                                key={gid}
                                className={`goal-tab ${selectedGoalId === gid ? 'active' : ''} ${isTrivial ? 'trivial' : ''}`}
                                onClick={() => selectGoal(gid)}
                              >
                                Goal {i + 1}
                                {isTrivial && <span className="trivial-indicator">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {selectedGoal && (
                  <div className="goal-display">
                    {/* Context */}
                    {(selectedGoal.context.variables.length > 0 || selectedGoal.context.hypotheses.length > 0) && (
                      <div className="context-box">
                        <div className="context-title">Context</div>
                        {selectedGoal.context.variables.map((v, i) => (
                          <div key={i} className="context-entry">
                            <span className="entry-name">{v.name}</span>
                            <span className="entry-type">{sorts.get(v.sortId)?.name}</span>
                            <button 
                              className="action-btn small"
                              onClick={() => handleTactic({ kind: 'induction', varName: v.name }, `Induction on ${v.name}`)}
                              title="Induction"
                            >
                              ind
                            </button>
                          </div>
                        ))}
                        {selectedGoal.context.hypotheses.map(h => (
                          <div key={h.id} className="context-entry hyp">
                            <span className="entry-name">{h.name}</span>
                            <span className="entry-formula">{renderF(h.formula)}</span>
                            <button 
                              className="action-btn small"
                              onClick={() => handleTactic({ kind: 'exact', hypName: h.name }, `Used ${h.name}`)}
                              title="Use this"
                            >
                              use
                            </button>
                            {h.formula.kind === 'implies' && (
                              <button 
                                className="action-btn small"
                                onClick={() => handleTactic({ kind: 'apply', hypName: h.name }, `Applied ${h.name}`)}
                                title="Apply"
                              >
                                apply
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Goal */}
                    <div className="goal-box">
                      <div className="goal-title">Goal</div>
                      <InteractiveFormula
                        formula={selectedGoal.goal}
                        onAction={handleTactic}
                        renderF={renderF}
                        renderE={renderE}
                        getApplicableFuncCases={getApplicableFuncCases}
                      />
                    </div>

                    {/* Smart actions based on goal type */}
                    <GoalActions 
                      goal={selectedGoal.goal}
                      hypotheses={selectedGoal.context.hypotheses}
                      onTactic={handleTactic}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Interactive Formula - Click on parts to transform
// ============================================================================

interface InteractiveFormulaProps {
  formula: Formula;
  onAction: (tactic: Tactic, description: string) => void;
  renderF: (f: Formula) => string;
  renderE: (e: FormulaExpr) => string;
  getApplicableFuncCases: (expr: FormulaExpr) => { func: RecursiveFunc; case_: FuncCase; result: string }[];
}

function InteractiveFormula({ formula, onAction, renderF, renderE, getApplicableFuncCases }: InteractiveFormulaProps) {
  const [showMenu, setShowMenu] = useState<{ x: number; y: number; items: { label: string; action: () => void }[] } | null>(null);

  const handleForallClick = (e: React.MouseEvent, f: Formula & { kind: 'forall' }) => {
    e.stopPropagation();
    onAction({ kind: 'intro', varName: f.varName }, `Introduced ${f.varName}`);
  };

  const handleExistsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu({
      x: e.clientX,
      y: e.clientY,
      items: [{ label: 'Provide witness...', action: () => setShowMenu(null) }]
    });
  };

  const handleImpliesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAction({ kind: 'intro_hyp' }, 'Assumed hypothesis');
  };

  const handleAndClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAction({ kind: 'split' }, 'Split conjunction');
  };

  const handleOrClick = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    onAction({ kind: side }, `Chose ${side} side`);
  };

  const handleFuncAppClick = (e: React.MouseEvent, expr: FormulaExpr, side: 'left' | 'right') => {
    e.stopPropagation();
    const cases = getApplicableFuncCases(expr);
    if (cases.length > 0) {
      setShowMenu({
        x: e.clientX,
        y: e.clientY,
        items: cases.map(c => ({
          label: c.result,
          action: () => {
            onAction({ kind: 'unfold', funcId: c.func.id, side }, `Unfolded ${c.func.name}`);
            setShowMenu(null);
          }
        }))
      });
    }
  };

  const renderInteractive = (f: Formula): React.ReactNode => {
    switch (f.kind) {
      case 'forall':
        return (
          <span className="formula-part">
            <span 
              className="clickable quantifier" 
              onClick={(e) => handleForallClick(e, f)}
              title="Click to introduce variable"
            >
              ∀{f.varName}
            </span>
            <span className="formula-text">. </span>
            {renderInteractive(f.body)}
          </span>
        );
      
      case 'exists':
        return (
          <span className="formula-part">
            <span 
              className="clickable quantifier exists" 
              onClick={handleExistsClick}
              title="Click to provide witness"
            >
              ∃{f.varName}
            </span>
            <span className="formula-text">. </span>
            {renderInteractive(f.body)}
          </span>
        );
      
      case 'implies':
        return (
          <span className="formula-part">
            <span className="formula-text">(</span>
            {renderInteractive(f.left)}
            <span 
              className="clickable connective implies" 
              onClick={handleImpliesClick}
              title="Click to assume left side"
            >
              →
            </span>
            {renderInteractive(f.right)}
            <span className="formula-text">)</span>
          </span>
        );
      
      case 'and':
        return (
          <span className="formula-part">
            <span className="formula-text">(</span>
            {renderInteractive(f.left)}
            <span 
              className="clickable connective and" 
              onClick={handleAndClick}
              title="Click to split into two goals"
            >
              ∧
            </span>
            {renderInteractive(f.right)}
            <span className="formula-text">)</span>
          </span>
        );
      
      case 'or':
        return (
          <span className="formula-part">
            <span className="formula-text">(</span>
            <span 
              className="clickable side left"
              onClick={(e) => handleOrClick(e, 'left')}
              title="Click to prove left"
            >
              {renderF(f.left)}
            </span>
            <span className="connective">∨</span>
            <span 
              className="clickable side right"
              onClick={(e) => handleOrClick(e, 'right')}
              title="Click to prove right"
            >
              {renderF(f.right)}
            </span>
            <span className="formula-text">)</span>
          </span>
        );
      
      case 'numEq':
      case 'numGeq':
      case 'numLeq':
      case 'numGt':
      case 'numLt':
      case 'numNeq':
        const ops = { numEq: '=', numNeq: '≠', numLeq: '≤', numLt: '<', numGeq: '≥', numGt: '>' };
        return (
          <span className="formula-part comparison">
            <InteractiveExpr 
              expr={f.left} 
              side="left"
              onFuncClick={handleFuncAppClick}
              renderE={renderE}
            />
            <span className="op">{ops[f.kind]}</span>
            <InteractiveExpr 
              expr={f.right} 
              side="right"
              onFuncClick={handleFuncAppClick}
              renderE={renderE}
            />
          </span>
        );
      
      default:
        return <span className="formula-text">{renderF(f)}</span>;
    }
  };

  return (
    <div className="interactive-formula">
      {renderInteractive(formula)}
      {showMenu && (
        <>
          <div className="menu-backdrop" onClick={() => setShowMenu(null)} />
          <div className="context-menu" style={{ left: showMenu.x, top: showMenu.y }}>
            {showMenu.items.map((item, i) => (
              <button key={i} className="menu-item" onClick={item.action}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Interactive expression (for function unfolding)
interface InteractiveExprProps {
  expr: FormulaExpr;
  side: 'left' | 'right';
  onFuncClick: (e: React.MouseEvent, expr: FormulaExpr, side: 'left' | 'right') => void;
  renderE: (e: FormulaExpr) => string;
}

function InteractiveExpr({ expr, side, onFuncClick, renderE }: InteractiveExprProps) {
  if (expr.kind === 'funcApp') {
    return (
      <span 
        className="clickable func-app"
        onClick={(e) => onFuncClick(e, expr, side)}
        title="Click to unfold function"
      >
        {renderE(expr)}
      </span>
    );
  }
  
  if (expr.kind === 'add' || expr.kind === 'sub') {
    const op = expr.kind === 'add' ? '+' : '-';
    return (
      <span className="expr-binary">
        <InteractiveExpr expr={expr.left} side={side} onFuncClick={onFuncClick} renderE={renderE} />
        <span className="op">{op}</span>
        <InteractiveExpr expr={expr.right} side={side} onFuncClick={onFuncClick} renderE={renderE} />
      </span>
    );
  }
  
  return <span className="expr-text">{renderE(expr)}</span>;
}

// ============================================================================
// Goal Actions - Smart action suggestions
// ============================================================================

interface GoalActionsProps {
  goal: Formula;
  hypotheses: { id: string; name: string; formula: Formula }[];
  onTactic: (tactic: Tactic, description: string) => void;
}

function GoalActions({ goal, hypotheses, onTactic }: GoalActionsProps) {
  const trivialCheck = isGoalTrivial(goal, hypotheses);
  
  // If goal is trivially solvable, show prominent solve button
  if (trivialCheck.trivial && trivialCheck.tactic) {
    // Create the tactic based on the kind
    let tactic: Tactic;
    if (trivialCheck.tactic === 'simplify') {
      tactic = { kind: 'simplify' };
    } else if (trivialCheck.tactic === 'reflexivity') {
      tactic = { kind: 'reflexivity' };
    } else if (trivialCheck.tactic === 'trivial') {
      tactic = { kind: 'trivial' };
    } else {
      tactic = { kind: 'trivial' };
    }
    
    return (
      <div className="goal-actions solved">
        <div className="solve-hint">✓ This goal can be solved automatically</div>
        <button 
          className="solve-btn"
          onClick={() => onTactic(tactic, trivialCheck.message || 'Solved')}
        >
          Solve: {trivialCheck.message}
        </button>
      </div>
    );
  }
  
  // Otherwise show relevant actions based on goal type
  const actions: { label: string; tactic: Tactic; hint?: string }[] = [];
  
  // Comparison goals
  if (goal.kind === 'numEq' || goal.kind === 'numNeq' || goal.kind === 'numLeq' || 
      goal.kind === 'numLt' || goal.kind === 'numGeq' || goal.kind === 'numGt' ||
      goal.kind === 'termEq' || goal.kind === 'termNeq') {
    actions.push({ label: '⚡ Simplify', tactic: { kind: 'simplify' }, hint: 'Evaluate arithmetic' });
    
    if (goal.kind === 'numEq' || goal.kind === 'numLeq' || goal.kind === 'numGeq' || goal.kind === 'termEq') {
      actions.push({ label: '= Reflexivity', tactic: { kind: 'reflexivity' }, hint: 'x = x, x ≤ x, x ≥ x' });
    }
  }
  
  // True goal
  if (goal.kind === 'true') {
    actions.push({ label: '✓ Trivial', tactic: { kind: 'trivial' } });
  }
  
  // Conjunction
  if (goal.kind === 'and') {
    actions.push({ label: '∧ Split', tactic: { kind: 'split' }, hint: 'Prove both sides' });
  }
  
  // Disjunction
  if (goal.kind === 'or') {
    actions.push({ label: '← Left', tactic: { kind: 'left' }, hint: 'Prove left side' });
    actions.push({ label: '→ Right', tactic: { kind: 'right' }, hint: 'Prove right side' });
  }
  
  if (actions.length === 0) {
    return null;
  }
  
  return (
    <div className="goal-actions">
      {actions.map((action, i) => (
        <button 
          key={i}
          className="action-btn"
          onClick={() => onTactic(action.tactic, action.label)}
          title={action.hint}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

// Helper to render function expressions
function renderFuncExprStr(
  expr: import('../types/syntax').FuncExpr,
  func: RecursiveFunc,
  constructors: Map<string, { id: string; name: string }>,
  functions: Map<string, RecursiveFunc>
): string {
  switch (expr.kind) {
    case 'int': return expr.value.toString();
    case 'var': return expr.name;
    case 'call': {
      const calledFunc = functions.get(expr.funcId) || func;
      return `${calledFunc.name}(${renderFuncExprStr(expr.arg, func, constructors, functions)})`;
    }
    case 'add': return `${renderFuncExprStr(expr.left, func, constructors, functions)} + ${renderFuncExprStr(expr.right, func, constructors, functions)}`;
    case 'sub': return `${renderFuncExprStr(expr.left, func, constructors, functions)} - ${renderFuncExprStr(expr.right, func, constructors, functions)}`;
    case 'mul': return `${renderFuncExprStr(expr.left, func, constructors, functions)} * ${renderFuncExprStr(expr.right, func, constructors, functions)}`;
    case 'max': return `max(${renderFuncExprStr(expr.left, func, constructors, functions)}, ${renderFuncExprStr(expr.right, func, constructors, functions)})`;
    case 'min': return `min(${renderFuncExprStr(expr.left, func, constructors, functions)}, ${renderFuncExprStr(expr.right, func, constructors, functions)})`;
    case 'singleton': return `{${renderFuncExprStr(expr.element, func, constructors, functions)}}`;
    case 'union': return `${renderFuncExprStr(expr.left, func, constructors, functions)} ∪ ${renderFuncExprStr(expr.right, func, constructors, functions)}`;
    case 'intersect': return `${renderFuncExprStr(expr.left, func, constructors, functions)} ∩ ${renderFuncExprStr(expr.right, func, constructors, functions)}`;
    case 'diff': return `${renderFuncExprStr(expr.left, func, constructors, functions)} \\ ${renderFuncExprStr(expr.right, func, constructors, functions)}`;
    case 'empty': return '∅';
    case 'if': return `if ... then ${renderFuncExprStr(expr.then, func, constructors, functions)} else ${renderFuncExprStr(expr.else, func, constructors, functions)}`;
    default: return '?';
  }
}

// ============================================================================
// Tree-based Formula Builder (simplified)
// ============================================================================

type BoundVar = { name: string; sortId: SortId };

type FormulaHole = {
  path: number[];
  boundVars: BoundVar[];
};

interface TreeFormulaBuilderProps {
  value: Formula | null;
  onChange: (f: Formula | null) => void;
  sorts: Map<string, { id: string; name: string; kind: string }>;
  judgments: Map<string, { id: string; name: string; symbol: string; argSorts: { sortId: string }[] }>;
  functions: Map<string, RecursiveFunc>;
}

type FormulaWithHoles = 
  | { kind: 'hole' }
  | { kind: 'forall'; varName: string; sortId: SortId; body: FormulaWithHoles }
  | { kind: 'exists'; varName: string; sortId: SortId; body: FormulaWithHoles }
  | { kind: 'implies'; left: FormulaWithHoles; right: FormulaWithHoles }
  | { kind: 'and'; left: FormulaWithHoles; right: FormulaWithHoles }
  | { kind: 'or'; left: FormulaWithHoles; right: FormulaWithHoles }
  | { kind: 'not'; body: FormulaWithHoles }
  | { kind: 'judgment'; judgmentId: string; args: FormulaExpr[] }
  | { kind: 'numEq'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'numNeq'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'numLeq'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'numLt'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'numGeq'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'numGt'; left: FormulaExpr; right: FormulaExpr }
  | { kind: 'true' }
  | { kind: 'false' };

function TreeFormulaBuilder({ value, onChange, sorts, judgments, functions }: TreeFormulaBuilderProps) {
  const [draft, setDraft] = useState<FormulaWithHoles | null>(null);
  const [editingHole, setEditingHole] = useState<FormulaHole | null>(null);
  const [newVarName, setNewVarName] = useState('');
  const [newVarSort, setNewVarSort] = useState('');
  const [leftExpr, setLeftExpr] = useState('');
  const [rightExpr, setRightExpr] = useState('');
  const [compOp, setCompOp] = useState<'=' | '≠' | '≤' | '<' | '≥' | '>'>('≥');
  const [compError, setCompError] = useState<string | null>(null);
  const [selectedJudgment, setSelectedJudgment] = useState('');
  const [judgmentArgs, setJudgmentArgs] = useState('');

  const inductiveSorts = useMemo(() => 
    Array.from(sorts.values()).filter(s => s.kind === 'inductive'),
    [sorts]
  );
  const functionsList = useMemo(() => Array.from(functions.values()), [functions]);
  const judgmentsList = useMemo(() => Array.from(judgments.values()), [judgments]);

  const hasHoles = useCallback((f: FormulaWithHoles): boolean => {
    if (f.kind === 'hole') return true;
    if (f.kind === 'forall' || f.kind === 'exists' || f.kind === 'not') return hasHoles(f.body);
    if (f.kind === 'implies' || f.kind === 'and' || f.kind === 'or') return hasHoles(f.left) || hasHoles(f.right);
    return false;
  }, []);

  const replaceHole = useCallback((f: FormulaWithHoles, path: number[], replacement: FormulaWithHoles): FormulaWithHoles => {
    if (path.length === 0) return replacement;
    const [idx, ...rest] = path;
    if (f.kind === 'forall' || f.kind === 'exists') return { ...f, body: replaceHole(f.body, rest, replacement) };
    if (f.kind === 'implies' || f.kind === 'and' || f.kind === 'or') {
      if (idx === 0) return { ...f, left: replaceHole(f.left, rest, replacement) };
      return { ...f, right: replaceHole(f.right, rest, replacement) };
    }
    if (f.kind === 'not') return { ...f, body: replaceHole(f.body, rest, replacement) };
    return f;
  }, []);

  const toFormula = useCallback((f: FormulaWithHoles): Formula | null => {
    if (f.kind === 'hole') return null;
    if (f.kind === 'forall' || f.kind === 'exists') {
      const body = toFormula(f.body);
      if (!body) return null;
      return { kind: f.kind, varName: f.varName, sortId: f.sortId, body };
    }
    if (f.kind === 'implies' || f.kind === 'and' || f.kind === 'or') {
      const left = toFormula(f.left);
      const right = toFormula(f.right);
      if (!left || !right) return null;
      return { kind: f.kind, left, right };
    }
    if (f.kind === 'not') {
      const body = toFormula(f.body);
      if (!body) return null;
      return { kind: f.kind, body };
    }
    return f as Formula;
  }, []);

  const updateDraft = useCallback((newDraft: FormulaWithHoles | null) => {
    setDraft(newDraft);
    if (newDraft && !hasHoles(newDraft)) {
      onChange(toFormula(newDraft));
    } else {
      onChange(null);
    }
  }, [hasHoles, onChange, toFormula]);

  const parseExpr = useCallback((text: string, boundVars: BoundVar[]): FormulaExpr | null => {
    text = text.trim();
    if (!text) return null;
    
    // Check for binary operators (lowest precedence first)
    // Handle + and - (left-to-right, find rightmost)
    let depth = 0;
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === ')') depth++;
      else if (text[i] === '(') depth--;
      else if (depth === 0) {
        if (text[i] === '+') {
          const left = parseExpr(text.slice(0, i), boundVars);
          const right = parseExpr(text.slice(i + 1), boundVars);
          if (left && right) return { kind: 'add', left, right };
        }
        if (text[i] === '-' && i > 0) {
          const left = parseExpr(text.slice(0, i), boundVars);
          const right = parseExpr(text.slice(i + 1), boundVars);
          if (left && right) return { kind: 'sub', left, right };
        }
      }
    }
    
    // Handle * (higher precedence)
    depth = 0;
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === ')') depth++;
      else if (text[i] === '(') depth--;
      else if (depth === 0 && text[i] === '*') {
        const left = parseExpr(text.slice(0, i), boundVars);
        const right = parseExpr(text.slice(i + 1), boundVars);
        if (left && right) return { kind: 'mul', left, right };
      }
    }
    
    // Handle function calls: func(arg) or max(a,b) or min(a,b)
    const funcMatch = text.match(/^(\w+)\((.+)\)$/);
    if (funcMatch) {
      const fname = funcMatch[1];
      const argStr = funcMatch[2];
      
      // Check for max/min with two arguments
      if (fname === 'max' || fname === 'min') {
        // Split by comma at depth 0
        let commaPos = -1;
        let d = 0;
        for (let i = 0; i < argStr.length; i++) {
          if (argStr[i] === '(') d++;
          else if (argStr[i] === ')') d--;
          else if (d === 0 && argStr[i] === ',') {
            commaPos = i;
            break;
          }
        }
        if (commaPos !== -1) {
          const left = parseExpr(argStr.slice(0, commaPos), boundVars);
          const right = parseExpr(argStr.slice(commaPos + 1), boundVars);
          if (left && right) {
            return { kind: fname as 'max' | 'min', left, right };
          }
        }
      }
      
      // Regular function call
      const func = functionsList.find(f => f.name === fname);
      if (func) {
        const arg = parseExpr(argStr, boundVars);
        if (arg) return { kind: 'funcApp', funcId: func.id, arg };
      }
    }
    
    // Handle parentheses
    if (text.startsWith('(') && text.endsWith(')')) {
      return parseExpr(text.slice(1, -1), boundVars);
    }
    
    if (/^\d+$/.test(text)) return { kind: 'int', value: parseInt(text, 10) };
    if (boundVars.find(v => v.name === text)) return { kind: 'var', name: text };
    return null;
  }, [functionsList]);

  const fillHole = useCallback((hole: FormulaHole, what: string) => {
    if (!draft) return;
    let replacement: FormulaWithHoles;
    
    switch (what) {
      case 'forall':
      case 'exists':
        if (!newVarName || !newVarSort) return;
        replacement = { kind: what, varName: newVarName, sortId: newVarSort, body: { kind: 'hole' } };
        break;
      case 'implies':
      case 'and':
      case 'or':
        replacement = { kind: what, left: { kind: 'hole' }, right: { kind: 'hole' } };
        break;
      case 'not':
        replacement = { kind: 'not', body: { kind: 'hole' } };
        break;
      case 'judgment':
        if (!selectedJudgment) return;
        const args = judgmentArgs.split(',').map(s => s.trim()).filter(Boolean);
        for (const arg of args) {
          if (!hole.boundVars.find(v => v.name === arg)) return;
        }
        replacement = { kind: 'judgment', judgmentId: selectedJudgment, args: args.map(name => ({ kind: 'var', name })) };
        break;
      case 'comparison':
        setCompError(null);
        const left = parseExpr(leftExpr, hole.boundVars);
        if (!left) { setCompError(`Cannot parse: ${leftExpr}`); return; }
        const right = parseExpr(rightExpr, hole.boundVars);
        if (!right) { setCompError(`Cannot parse: ${rightExpr}`); return; }
        const kinds = { '=': 'numEq', '≠': 'numNeq', '≤': 'numLeq', '<': 'numLt', '≥': 'numGeq', '>': 'numGt' } as const;
        replacement = { kind: kinds[compOp], left, right };
        break;
      case 'true':
        replacement = { kind: 'true' };
        break;
      case 'false':
        replacement = { kind: 'false' };
        break;
      default:
        return;
    }
    
    updateDraft(replaceHole(draft, hole.path, replacement));
    setEditingHole(null);
    setNewVarName('');
    setNewVarSort('');
    setLeftExpr('');
    setRightExpr('');
    setCompOp('≥');
    setCompError(null);
    setSelectedJudgment('');
    setJudgmentArgs('');
  }, [draft, newVarName, newVarSort, selectedJudgment, judgmentArgs, leftExpr, rightExpr, compOp, parseExpr, replaceHole, updateDraft]);

  const renderDraft = (f: FormulaWithHoles, path: number[], boundVars: BoundVar[]): React.ReactNode => {
    if (f.kind === 'hole') {
      const isEditing = editingHole && pathEquals(editingHole.path, path);
      return (
        <span 
          className={`hole ${isEditing ? 'editing' : ''}`}
          onClick={() => setEditingHole({ path, boundVars })}
        >
          ?
        </span>
      );
    }
    if (f.kind === 'forall' || f.kind === 'exists') {
      const newBoundVars = [...boundVars, { name: f.varName, sortId: f.sortId }];
      return (
        <span>
          <span className="q">{f.kind === 'forall' ? '∀' : '∃'}{f.varName}:{sorts.get(f.sortId)?.name}.</span>
          {renderDraft(f.body, [...path, 0], newBoundVars)}
        </span>
      );
    }
    if (f.kind === 'implies') return <span>({renderDraft(f.left, [...path, 0], boundVars)} → {renderDraft(f.right, [...path, 1], boundVars)})</span>;
    if (f.kind === 'and') return <span>({renderDraft(f.left, [...path, 0], boundVars)} ∧ {renderDraft(f.right, [...path, 1], boundVars)})</span>;
    if (f.kind === 'or') return <span>({renderDraft(f.left, [...path, 0], boundVars)} ∨ {renderDraft(f.right, [...path, 1], boundVars)})</span>;
    if (f.kind === 'not') return <span>¬{renderDraft(f.body, [...path, 0], boundVars)}</span>;
    if (f.kind === 'true') return <span>⊤</span>;
    if (f.kind === 'false') return <span>⊥</span>;
    if (f.kind === 'judgment') {
      const j = judgments.get(f.judgmentId);
      return <span>{f.args.map(a => a.kind === 'var' ? a.name : '?').join(', ')} {j?.symbol}</span>;
    }
    if ('left' in f && 'right' in f) {
      const ops = { numEq: '=', numNeq: '≠', numLeq: '≤', numLt: '<', numGeq: '≥', numGt: '>' };
      const op = ops[f.kind as keyof typeof ops];
      return <span>{renderExprSimple(f.left)} {op} {renderExprSimple(f.right)}</span>;
    }
    return <span>?</span>;
  };
  
  const renderExprSimple = (e: FormulaExpr): string => {
    switch (e.kind) {
      case 'var': return e.name;
      case 'int': return e.value.toString();
      case 'funcApp': {
        const fn = functions.get(e.funcId);
        return `${fn?.name || '?'}(${renderExprSimple(e.arg)})`;
      }
      case 'add': return `${renderExprSimple(e.left)} + ${renderExprSimple(e.right)}`;
      case 'sub': return `${renderExprSimple(e.left)} - ${renderExprSimple(e.right)}`;
      case 'mul': return `${renderExprSimple(e.left)} × ${renderExprSimple(e.right)}`;
      case 'max': return `max(${renderExprSimple(e.left)}, ${renderExprSimple(e.right)})`;
      case 'min': return `min(${renderExprSimple(e.left)}, ${renderExprSimple(e.right)})`;
      case 'constructor': return '?';
      case 'emptySet': return '∅';
    }
  };

  if (value) {
    return (
      <div className="builder-done">
        <button className="reset-btn" onClick={() => { onChange(null); setDraft(null); setEditingHole(null); }}>
          Reset
        </button>
      </div>
    );
  }

  if (!draft) {
    return (
      <button className="start-build-btn" onClick={() => { setDraft({ kind: 'hole' }); setEditingHole({ path: [], boundVars: [] }); }}>
        Build Formula
      </button>
    );
  }

  return (
    <div className="formula-builder">
      <div className="draft-display">{renderDraft(draft, [], [])}</div>
      
      {editingHole && (
        <div className="hole-options">
          <div className="option-group">
            <input placeholder="var" value={newVarName} onChange={e => setNewVarName(e.target.value)} className="small-input" />
            <select value={newVarSort} onChange={e => setNewVarSort(e.target.value)} className="small-select">
              <option value="">type</option>
              {inductiveSorts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button disabled={!newVarName || !newVarSort} onClick={() => fillHole(editingHole, 'forall')}>∀</button>
            <button disabled={!newVarName || !newVarSort} onClick={() => fillHole(editingHole, 'exists')}>∃</button>
          </div>
          
          <div className="option-group">
            <button onClick={() => fillHole(editingHole, 'implies')}>→</button>
            <button onClick={() => fillHole(editingHole, 'and')}>∧</button>
            <button onClick={() => fillHole(editingHole, 'or')}>∨</button>
            <button onClick={() => fillHole(editingHole, 'not')}>¬</button>
            <button onClick={() => fillHole(editingHole, 'true')}>⊤</button>
          </div>
          
          {editingHole.boundVars.length > 0 && (
            <>
              <div className="option-group comparison-group">
                {compError && <div className="comp-error">{compError}</div>}
                <input 
                  placeholder={functionsList[0] ? `${functionsList[0].name}(${editingHole.boundVars[0]?.name})` : 'left'}
                  value={leftExpr} 
                  onChange={e => { setLeftExpr(e.target.value); setCompError(null); }} 
                  className="expr-input" 
                />
                <div className="op-row">
                  {(['≥', '>', '≤', '<', '=', '≠'] as const).map(op => (
                    <button key={op} className={compOp === op ? 'active' : ''} onClick={() => setCompOp(op)}>{op}</button>
                  ))}
                </div>
                <input 
                  placeholder={functionsList[1] ? `${functionsList[1].name}(${editingHole.boundVars[0]?.name})` : 'right'}
                  value={rightExpr} 
                  onChange={e => { setRightExpr(e.target.value); setCompError(null); }} 
                  className="expr-input" 
                />
                <button disabled={!leftExpr || !rightExpr} onClick={() => fillHole(editingHole, 'comparison')}>✓</button>
              </div>
              <div className="vars-hint">
                vars: {editingHole.boundVars.map(v => v.name).join(', ')}
                {functionsList.length > 0 && ` | funcs: ${functionsList.map(f => f.name).join(', ')}`}
              </div>
              <div className="ops-hint">
                ops: + − × | max(a, b) min(a, b) | parentheses
              </div>
              
              {judgmentsList.length > 0 && (
                <div className="option-group">
                  <select value={selectedJudgment} onChange={e => setSelectedJudgment(e.target.value)} className="small-select">
                    <option value="">judgment</option>
                    {judgmentsList.map(j => <option key={j.id} value={j.id}>_ {j.symbol}</option>)}
                  </select>
                  <input placeholder="args" value={judgmentArgs} onChange={e => setJudgmentArgs(e.target.value)} className="small-input" />
                  <button disabled={!selectedJudgment} onClick={() => fillHole(editingHole, 'judgment')}>✓</button>
                </div>
              )}
            </>
          )}
          
          {editingHole.boundVars.length === 0 && (
            <div className="hint">Add ∀ or ∃ first to bind variables</div>
          )}
        </div>
      )}
    </div>
  );
}

function pathEquals(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
