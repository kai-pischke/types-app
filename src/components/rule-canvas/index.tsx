import { useRef, useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { generateDefaultSeparators, analyzesSyntaxDirected } from '../../types/syntax';
import type { Pattern, Term, Derivation, RuleFuncPredicate, FuncExpr } from '../../types/syntax';

import { DraggableRule } from './DraggableRule';
import { PatternEditor } from './PatternEditor';
import { DerivationTree } from './DerivationTree';
import { 
  isRuleComplete,
  isTermComplete,
  termsEqual, 
  matchPattern, 
  substitutePattern,
  renderTermString as renderTermStringHelper 
} from './helpers';
import { TermBuilder } from './TermBuilder';

import '../RuleCanvas.css';

export function RuleCanvas() {
  const sorts = useStore(state => state.sorts);
  const constructors = useStore(state => state.constructors);
  const judgments = useStore(state => state.judgments);
  const rules = useStore(state => state.rules);
  const metaVariables = useStore(state => state.metaVariables);
  const selectedJudgmentId = useStore(state => state.selectedJudgmentId);
  const updateRulePosition = useStore(state => state.updateRulePosition);
  const updateRule = useStore(state => state.updateRule);
  const addPremiseToRule = useStore(state => state.addPremiseToRule);
  const removePremiseFromRule = useStore(state => state.removePremiseFromRule);
  const recursiveFunctions = useStore(state => state.recursiveFunctions);
  const addSideCondition = useStore(state => state.addSideCondition);
  const removeSideCondition = useStore(state => state.removeSideCondition);
  const updateSideCondition = useStore(state => state.updateSideCondition);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [addingPremiseToRule, setAddingPremiseToRule] = useState<string | null>(null);
  const [addingSideConditionToRule, setAddingSideConditionToRule] = useState<string | null>(null);
  const [editingPattern, setEditingPattern] = useState<{
    ruleId: string;
    instanceId: string;
    argIndex: number;
    path: number[];
    pattern: Pattern;
    sortId: string;
  } | null>(null);
  const [editingSideConditionPattern, setEditingSideConditionPattern] = useState<{
    ruleId: string;
    conditionId: string;
    patternKey: 'arg' | 'element'; // Which pattern in the predicate
    pattern: Pattern;
    sortId: string;
  } | null>(null);
  
  const [activeTab, setActiveTab] = useState<'rules' | 'examples' | 'derivation'>('rules');
  const [derivationInputs, setDerivationInputs] = useState<(Term | null)[]>([]);
  const [derivationResult, setDerivationResult] = useState<{ success: boolean; derivation?: Derivation; error?: string } | null>(null);
  const [exampleSeed, setExampleSeed] = useState(0);
  
  // Available functions for side conditions
  const availableFunctions = Array.from(recursiveFunctions.values());

  const selectedJudgment = selectedJudgmentId ? judgments.get(selectedJudgmentId) : null;
  const allJudgments = Array.from(judgments.values());
  const selectedRules = selectedJudgmentId
    ? Array.from(rules.values()).filter(r => r.conclusion.judgmentId === selectedJudgmentId)
    : [];

  const syntaxAnalysis = useMemo(() => {
    if (!selectedJudgment || selectedRules.length === 0) return null;
    return analyzesSyntaxDirected(selectedJudgment, selectedRules, constructors);
  }, [selectedJudgment, selectedRules, constructors]);

  const isSyntaxDirected = syntaxAnalysis?.isSyntaxDirected ?? false;

  // Reset derivation inputs when judgment changes
  useMemo(() => {
    if (selectedJudgment) {
      setDerivationInputs(selectedJudgment.argSorts.map(() => null));
      setDerivationResult(null);
    }
  }, [selectedJudgmentId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const ruleId = active.id as string;
    const rule = rules.get(ruleId);
    
    if (rule) {
      const newX = Math.max(20, rule.position.x + delta.x);
      const newY = Math.max(20, rule.position.y + delta.y);
      updateRulePosition(ruleId, { x: newX, y: newY });
    }
  };

  // Pattern update logic
  const updateNestedPattern = (rootPattern: Pattern, path: number[], newPattern: Pattern): Pattern => {
    if (path.length === 0) return newPattern;
    const [index, ...restPath] = path;
    const newArgs = [...rootPattern.args];
    newArgs[index] = updateNestedPattern(newArgs[index], restPath, newPattern);
    return { ...rootPattern, args: newArgs };
  };

  const handlePatternUpdate = (newPattern: Pattern) => {
    if (!editingPattern) return;
    const rule = rules.get(editingPattern.ruleId);
    if (!rule) return;

    if (editingPattern.instanceId === 'conclusion') {
      const newArgs = [...rule.conclusion.args];
      const rootPattern = newArgs[editingPattern.argIndex];
      newArgs[editingPattern.argIndex] = updateNestedPattern(rootPattern, editingPattern.path, newPattern);
      updateRule(editingPattern.ruleId, {
        conclusion: { ...rule.conclusion, args: newArgs },
      });
    } else {
      const newPremises = rule.premises.map(p => {
        if (p.id === editingPattern.instanceId) {
          const newArgs = [...p.args];
          const rootPattern = newArgs[editingPattern.argIndex];
          newArgs[editingPattern.argIndex] = updateNestedPattern(rootPattern, editingPattern.path, newPattern);
          return { ...p, args: newArgs };
        }
        return p;
      });
      updateRule(editingPattern.ruleId, { premises: newPremises });
    }
  };

  // Term rendering
  const renderTermString = useCallback((term: Term): string => {
    return renderTermStringHelper(term, constructors);
  }, [constructors]);

  // Derivation logic
  const getRulesForJudgment = useCallback((judgmentId: string) => {
    return Array.from(rules.values()).filter(r => 
      r.conclusion.judgmentId === judgmentId && isRuleComplete(r)
    );
  }, [rules]);

  const canDerive = useCallback((judgmentId: string, terms: Term[], depth: number = 0): { derivable: boolean; ruleName?: string } => {
    if (depth > 5) return { derivable: false };
    
    const rulesForJudgment = getRulesForJudgment(judgmentId);
    
    for (const rule of rulesForJudgment) {
      const conclusion = rule.conclusion;
      if (conclusion.args.length !== terms.length) continue;
      
      let allMatch = true;
      const allBindings = new Map<string, Term>();
      
      for (let i = 0; i < terms.length; i++) {
        const bindings = matchPattern(terms[i], conclusion.args[i]);
        if (!bindings) {
          allMatch = false;
          break;
        }
        for (const [key, value] of bindings) {
          if (allBindings.has(key)) {
            const existing = allBindings.get(key)!;
            if (!termsEqual(existing, value)) {
              allMatch = false;
              break;
            }
          }
          allBindings.set(key, value);
        }
        if (!allMatch) break;
      }
      
      if (!allMatch) continue;
      
      let premisesSatisfied = true;
      for (const premise of rule.premises) {
        const premiseTerms: Term[] = [];
        for (const argPattern of premise.args) {
          const term = substitutePattern(argPattern, allBindings);
          if (!term) {
            premisesSatisfied = false;
            break;
          }
          premiseTerms.push(term);
        }
        
        if (!premisesSatisfied) break;
        
        const { derivable } = canDerive(premise.judgmentId, premiseTerms, depth + 1);
        if (!derivable) {
          premisesSatisfied = false;
          break;
        }
      }
      
      if (premisesSatisfied) {
        return { derivable: true, ruleName: rule.name };
      }
    }
    
    return { derivable: false };
  }, [getRulesForJudgment]);

  const buildDerivation = useCallback((judgmentId: string, terms: Term[], depth: number = 0): Derivation | null => {
    if (depth > 10) return null;
    
    const rulesForJudgment = getRulesForJudgment(judgmentId);
    
    for (const rule of rulesForJudgment) {
      const conclusion = rule.conclusion;
      if (conclusion.args.length !== terms.length) continue;
      
      let allMatch = true;
      const allBindings = new Map<string, Term>();
      
      for (let i = 0; i < terms.length; i++) {
        const bindings = matchPattern(terms[i], conclusion.args[i]);
        if (!bindings) {
          allMatch = false;
          break;
        }
        for (const [key, value] of bindings) {
          if (allBindings.has(key)) {
            const existing = allBindings.get(key)!;
            if (!termsEqual(existing, value)) {
              allMatch = false;
              break;
            }
          }
          allBindings.set(key, value);
        }
        if (!allMatch) break;
      }
      
      if (!allMatch) continue;
      
      const premiseDerivations: Derivation[] = [];
      let premisesSatisfied = true;
      
      for (const premise of rule.premises) {
        const premiseTerms: Term[] = [];
        for (const argPattern of premise.args) {
          const term = substitutePattern(argPattern, allBindings);
          if (!term) {
            premisesSatisfied = false;
            break;
          }
          premiseTerms.push(term);
        }
        
        if (!premisesSatisfied) break;
        
        const premiseDerivation = buildDerivation(premise.judgmentId, premiseTerms, depth + 1);
        if (!premiseDerivation) {
          premisesSatisfied = false;
          break;
        }
        premiseDerivations.push(premiseDerivation);
      }
      
      if (premisesSatisfied) {
        return {
          ruleName: rule.name,
          ruleId: rule.id,
          conclusion: { judgmentId, terms },
          premises: premiseDerivations,
        };
      }
    }
    
    return null;
  }, [getRulesForJudgment]);

  const tryDerive = useCallback(() => {
    if (!selectedJudgment || !selectedJudgmentId) return;
    
    if (derivationInputs.some(t => t === null)) {
      setDerivationResult({ success: false, error: 'Please fill in all terms' });
      return;
    }
    
    const terms = derivationInputs as Term[];
    const derivation = buildDerivation(selectedJudgmentId, terms);
    
    if (derivation) {
      setDerivationResult({ success: true, derivation });
    } else {
      setDerivationResult({ success: false, error: 'No derivation found' });
    }
  }, [selectedJudgment, selectedJudgmentId, derivationInputs, buildDerivation]);

  // Helper to convert number to subscript
  const toSubscript = (n: number): string => {
    const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return n.toString().split('').map(d => subscripts[parseInt(d)]).join('');
  };

  // Term enumeration
  const enumerateTerms = useCallback((sortId: string, maxDepth: number): Term[] => {
    const sort = sorts.get(sortId);
    
    // Handle atom sorts - generate a few atom instances
    if (sort?.kind === 'atom') {
      const prefix = sort.atomPrefix || sort.name.toLowerCase().charAt(0);
      const atoms: Term[] = [];
      for (let i = 1; i <= 5; i++) {
        atoms.push({
          id: crypto.randomUUID(),
          constructorId: '',
          args: [],
          isVariable: true,
          variableName: `${prefix}${toSubscript(i)}`,
        });
      }
      return atoms;
    }

    // Handle inductive sorts
    const sortConstructors = Array.from(constructors.values()).filter(c => c.sortId === sortId);
    if (sortConstructors.length === 0) return [];
    
    const seen = new Set<string>();
    const result: Term[] = [];
    const termsByDepth: Map<string, Term[][]> = new Map();
    
    const getTermsAtDepth = (sid: string, depth: number): Term[] => {
      const s = sorts.get(sid);
      
      // Handle atom sorts at any depth
      if (s?.kind === 'atom') {
        const prefix = s.atomPrefix || s.name.toLowerCase().charAt(0);
        const atoms: Term[] = [];
        // Generate fewer atoms for nested positions
        for (let i = 1; i <= 3; i++) {
          atoms.push({
            id: crypto.randomUUID(),
            constructorId: '',
            args: [],
            isVariable: true,
            variableName: `${prefix}${toSubscript(i)}`,
          });
        }
        return atoms;
      }

      if (!termsByDepth.has(sid)) termsByDepth.set(sid, []);
      const depthArray = termsByDepth.get(sid)!;
      if (depthArray[depth] !== undefined) return depthArray[depth];
      
      const terms: Term[] = [];
      const sConstructors = Array.from(constructors.values()).filter(c => c.sortId === sid);
      
      for (const constructor of sConstructors) {
        if (constructor.args.length === 0) {
          if (depth === 0) {
            terms.push({ id: crypto.randomUUID(), constructorId: constructor.id, args: [] });
          }
        } else if (depth > 0) {
          const argTermArrays: Term[][] = constructor.args.map(arg => {
            const subTerms: Term[] = [];
            for (let d = 0; d < depth; d++) {
              subTerms.push(...getTermsAtDepth(arg.sortId, d));
            }
            return subTerms;
          });
          
          const generateCombinations = (index: number, current: Term[]): void => {
            if (terms.length > 30) return;
            if (index === argTermArrays.length) {
              terms.push({ id: crypto.randomUUID(), constructorId: constructor.id, args: [...current] });
              return;
            }
            for (const term of argTermArrays[index].slice(0, 8)) {
              generateCombinations(index + 1, [...current, term]);
            }
          };
          
          if (argTermArrays.every(arr => arr.length > 0)) {
            generateCombinations(0, []);
          }
        }
      }
      
      depthArray[depth] = terms;
      return terms;
    };
    
    for (let d = 0; d <= maxDepth; d++) {
      for (const term of getTermsAtDepth(sortId, d)) {
        const str = renderTermString(term);
        if (!seen.has(str)) {
          seen.add(str);
          result.push(term);
        }
      }
    }
    
    return result;
  }, [constructors, renderTermString]);

  // Examples computation
  const getTermDepth = (term: Term): number => {
    if (term.args.length === 0) return 0;
    return 1 + Math.max(...term.args.map(getTermDepth));
  };

  const matchesAnyRule = useCallback((terms: Term[]): { matches: boolean; ruleName?: string } => {
    if (!selectedJudgmentId) return { matches: false };
    const { derivable, ruleName } = canDerive(selectedJudgmentId, terms);
    return { matches: derivable, ruleName };
  }, [selectedJudgmentId, canDerive]);

  const examples = useMemo(() => {
    if (!selectedJudgment || selectedRules.length === 0) return { positive: [], negative: [] };
    
    const positive: { terms: Term[]; termStrings: string[]; ruleName: string }[] = [];
    const negative: { terms: Term[]; termStrings: string[] }[] = [];
    const maxDepth = 3;
    const maxExamples = 4;
    
    const argTermArrays: Term[][] = selectedJudgment.argSorts.map(
      argSort => enumerateTerms(argSort.sortId, maxDepth)
    );
    
    if (argTermArrays.some(arr => arr.length === 0)) {
      return { positive, negative };
    }
    
    if (argTermArrays.length === 1) {
      for (const term of argTermArrays[0]) {
        if (positive.length >= maxExamples && negative.length >= maxExamples) break;
        const terms = [term];
        const { matches, ruleName } = matchesAnyRule(terms);
        const termStrings = terms.map(renderTermString);
        
        if (matches && positive.length < maxExamples) {
          positive.push({ terms, termStrings, ruleName: ruleName! });
        } else if (!matches && negative.length < maxExamples) {
          negative.push({ terms, termStrings });
        }
      }
    } else {
      const termSizes = argTermArrays.map(arr => arr.map(t => getTermDepth(t)));
      const seen = new Set<string>();
      
      for (let totalSize = 0; totalSize <= maxDepth * argTermArrays.length; totalSize++) {
        if (positive.length >= maxExamples && negative.length >= maxExamples) break;
        
        const generateCombos = (index: number, current: Term[], currentSize: number): void => {
          if (positive.length >= maxExamples && negative.length >= maxExamples) return;
          
          if (index === argTermArrays.length) {
            if (currentSize === totalSize) {
              const key = current.map(renderTermString).join('|||');
              if (seen.has(key)) return;
              seen.add(key);
              
              const { matches, ruleName } = matchesAnyRule(current);
              const termStrings = current.map(renderTermString);
              
              if (matches && positive.length < maxExamples) {
                positive.push({ terms: [...current], termStrings, ruleName: ruleName! });
              } else if (!matches && negative.length < maxExamples) {
                negative.push({ terms: [...current], termStrings });
              }
            }
            return;
          }
          
          for (let i = 0; i < argTermArrays[index].length && i < 20; i++) {
            const term = argTermArrays[index][i];
            const size = termSizes[index][i];
            if (currentSize + size <= totalSize) {
              generateCombos(index + 1, [...current, term], currentSize + size);
            }
          }
        };
        
        generateCombos(0, [], 0);
      }
    }
    
    return { positive, negative };
  }, [selectedJudgment, selectedRules, enumerateTerms, matchesAnyRule, renderTermString, exampleSeed]);

  const satisfyingExamples = examples.positive;
  const nonSatisfyingExamples = examples.negative;

  // Render helpers
  const renderExample = (termStrings: string[], separators: string[]) => (
    <span className="example-judgment font-mono">
      {termStrings.map((str, i) => (
        <span key={i}>
          {separators[i] && <span className="example-sep">{separators[i]}</span>}
          <span className="example-term">{str}</span>
        </span>
      ))}
      {separators[termStrings.length] && <span className="example-sep">{separators[termStrings.length]}</span>}
    </span>
  );

  const renderPatternSlot = (
    ruleId: string,
    instanceId: string,
    argIndex: number,
    pattern: Pattern,
    sortId: string,
    path: number[] = []
  ) => {
    const isThisEditing = editingPattern?.ruleId === ruleId &&
                          editingPattern?.instanceId === instanceId &&
                          editingPattern?.argIndex === argIndex &&
                          JSON.stringify(editingPattern?.path) === JSON.stringify(path);

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingPattern({ ruleId, instanceId, argIndex, path, pattern, sortId });
    };

    // Meta-variable pattern
    if (pattern.metaVariableId) {
      const mv = metaVariables.get(pattern.metaVariableId);
      return (
        <span className="pattern-slot-wrapper">
          <span
            className={`pattern-slot inline ${isThisEditing ? 'editing' : ''}`}
            onClick={handleClick}
            onPointerDown={(e) => e.stopPropagation()}
            title="Click to edit"
          >
            <span className="pattern-metavar">{mv?.name || '?'}</span>
          </span>
          {isThisEditing && (
            <PatternEditor
              pattern={pattern}
              sortId={sortId}
              onUpdate={(newPattern) => {
                handlePatternUpdate(newPattern);
                setEditingPattern(null);
              }}
              onClose={() => setEditingPattern(null)}
            />
          )}
        </span>
      );
    }

    // Constructor pattern
    if (pattern.constructorId) {
      const constructor = constructors.get(pattern.constructorId);
      if (!constructor) return <span className="pattern-unknown">?</span>;

      if (constructor.args.length === 0) {
        return (
          <span className="pattern-slot-wrapper">
            <span
              className={`pattern-slot inline ${isThisEditing ? 'editing' : ''}`}
              onClick={handleClick}
              onPointerDown={(e) => e.stopPropagation()}
              title="Click to edit"
            >
              <span className={`pattern-constructor ${constructor.isTerminal ? 'terminal' : ''}`}>
                {constructor.name}
              </span>
            </span>
            {isThisEditing && (
              <PatternEditor
                pattern={pattern}
                sortId={sortId}
                onUpdate={(newPattern) => {
                  handlePatternUpdate(newPattern);
                  setEditingPattern(null);
                }}
                onClose={() => setEditingPattern(null)}
              />
            )}
          </span>
        );
      }

      // Constructor with arguments
      return (
        <span className="pattern-constructor-app">
          <span className="pattern-slot-wrapper">
            <span
              className={`pattern-slot inline constructor-head ${isThisEditing ? 'editing' : ''}`}
              onClick={handleClick}
              onPointerDown={(e) => e.stopPropagation()}
              title="Click to edit constructor"
            >
              <span className={`pattern-constructor ${constructor.isTerminal ? 'terminal' : ''}`}>
                {constructor.name}
              </span>
            </span>
            {isThisEditing && (
              <PatternEditor
                pattern={pattern}
                sortId={sortId}
                onUpdate={(newPattern) => {
                  handlePatternUpdate(newPattern);
                  setEditingPattern(null);
                }}
                onClose={() => setEditingPattern(null)}
              />
            )}
          </span>
          <span className="pattern-args">
            ({pattern.args.map((arg, i) => (
              <span key={i}>
                {i > 0 && <span className="pattern-comma">, </span>}
                {renderPatternSlot(ruleId, instanceId, argIndex, arg, constructor.args[i]?.sortId || sortId, [...path, i])}
              </span>
            ))})
          </span>
        </span>
      );
    }

    // Empty placeholder
    const sort = sorts.get(sortId);
    return (
      <span className="pattern-slot-wrapper">
        <span
          className={`pattern-slot empty ${isThisEditing ? 'editing' : ''}`}
          onClick={handleClick}
          onPointerDown={(e) => e.stopPropagation()}
          title="Click to set pattern"
        >
          {sort?.name || '?'}
        </span>
        {isThisEditing && (
          <PatternEditor
            pattern={pattern}
            sortId={sortId}
            onUpdate={(newPattern) => {
              handlePatternUpdate(newPattern);
              setEditingPattern(null);
            }}
            onClose={() => setEditingPattern(null)}
          />
        )}
      </span>
    );
  };

  const renderJudgmentDisplay = (
    judgment: { separators?: string[]; symbol: string; argSorts: { sortId: string; label: string }[] },
    ruleId: string,
    instanceId: string,
    args: Pattern[]
  ) => {
    const separators = judgment.separators || generateDefaultSeparators(judgment.argSorts.length, judgment.symbol);
    
    return (
      <span className="judgment-display">
        {args.map((arg, i) => (
          <span key={i}>
            {separators[i] && <span className="judgment-sep">{separators[i]}</span>}
            {renderPatternSlot(ruleId, instanceId, i, arg, judgment.argSorts[i]?.sortId || '')}
          </span>
        ))}
        {separators[args.length] && <span className="judgment-sep">{separators[args.length]}</span>}
      </span>
    );
  };

  const renderInferenceRule = (rule: typeof selectedRules[0]) => {
    const judgment = judgments.get(rule.conclusion.judgmentId);
    if (!judgment) return null;

    const complete = isRuleComplete(rule);

    return (
      <div className={`inference-rule ${complete ? 'complete' : 'incomplete'}`}>
        <div className="rule-header">
          <span className="rule-name">{rule.name}</span>
          {complete ? (
            <span className="rule-status complete" title="Rule is complete">✓</span>
          ) : (
            <span className="rule-status incomplete" title="Rule has empty patterns">⚠</span>
          )}
        </div>

        {/* Premises */}
        {rule.premises.length > 0 && (
          <div className="rule-premises">
            {rule.premises.map((premise) => {
              const premiseJudgment = judgments.get(premise.judgmentId);
              if (!premiseJudgment) return null;
              return (
                <div key={premise.id} className="premise">
                  {renderJudgmentDisplay(premiseJudgment, rule.id, premise.id, premise.args)}
                  <button
                    className="remove-premise-btn"
                    onClick={() => removePremiseFromRule(rule.id, premise.id)}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Remove premise"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Side Conditions */}
        {rule.sideConditions && rule.sideConditions.length > 0 && (
          <div className="rule-side-conditions">
            {rule.sideConditions.map((cond) => {
              const func = recursiveFunctions.get(cond.predicate.funcId);
              const funcName = func?.name || '?';
              const inputSortId = func?.inputSortId || '';
              
              // Get element sort for 'in' predicates (if the function returns Set<Sort>)
              const elementSortId = func?.returnType.kind === 'set' ? func.returnType.elementSortId : '';
              
              // Helper to render an editable pattern slot
              const renderEditablePattern = (pattern: Pattern, sortId: string, patternKey: 'arg' | 'element') => {
                const isEditing = editingSideConditionPattern?.ruleId === rule.id && 
                                  editingSideConditionPattern?.conditionId === cond.id &&
                                  editingSideConditionPattern?.patternKey === patternKey;
                
                const handlePatternClick = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  setEditingSideConditionPattern({
                    ruleId: rule.id,
                    conditionId: cond.id,
                    patternKey,
                    pattern,
                    sortId,
                  });
                };
                
                const handlePatternUpdate = (newPattern: Pattern) => {
                  const pred = cond.predicate;
                  let newPredicate: RuleFuncPredicate;
                  
                  if (patternKey === 'arg') {
                    // Update the 'arg' pattern
                    if ('arg' in pred) {
                      newPredicate = { ...pred, arg: newPattern } as RuleFuncPredicate;
                    } else {
                      return;
                    }
                  } else {
                    // Update the 'element' pattern (for 'in' predicates)
                    if ('element' in pred) {
                      newPredicate = { ...pred, element: newPattern } as RuleFuncPredicate;
                    } else {
                      return;
                    }
                  }
                  
                  updateSideCondition(rule.id, cond.id, newPredicate);
                  setEditingSideConditionPattern(null);
                };
                
                // Render the pattern
                let patternDisplay: React.ReactNode;
                if (pattern.metaVariableId) {
                  const mv = metaVariables.get(pattern.metaVariableId);
                  patternDisplay = <span className="pattern-metavar">{mv?.name || '?'}</span>;
                } else if (pattern.constructorId) {
                  const c = constructors.get(pattern.constructorId);
                  if (c && pattern.args.length === 0) {
                    patternDisplay = <span className="pattern-constructor">{c.name}</span>;
                  } else if (c) {
                    patternDisplay = (
                      <span>
                        <span className="pattern-constructor">{c.name}</span>
                        ({pattern.args.map((arg, i) => {
                          const argMv = arg.metaVariableId ? metaVariables.get(arg.metaVariableId) : null;
                          return (
                            <span key={i}>
                              {i > 0 && ', '}
                              {argMv ? <span className="pattern-metavar">{argMv.name}</span> : '_'}
                            </span>
                          );
                        })})
                      </span>
                    );
                  } else {
                    patternDisplay = '?';
                  }
                } else {
                  const sort = sorts.get(sortId);
                  patternDisplay = <span className="pattern-placeholder">{sort?.name || '?'}</span>;
                }
                
                return (
                  <span className="side-condition-pattern-wrapper">
                    <span
                      className={`side-condition-pattern ${isEditing ? 'editing' : ''}`}
                      onClick={handlePatternClick}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Click to edit pattern"
                    >
                      {patternDisplay}
                    </span>
                    {isEditing && (
                      <PatternEditor
                        pattern={pattern}
                        sortId={sortId}
                        onUpdate={handlePatternUpdate}
                        onClose={() => setEditingSideConditionPattern(null)}
                      />
                    )}
                  </span>
                );
              };
              
              // Render the full predicate with editable patterns
              const renderConditionPredicate = () => {
                const pred = cond.predicate;
                
                switch (pred.kind) {
                  case 'eq':
                    return <>{funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')}) = {pred.value.kind === 'int' ? pred.value.value : '?'}</>;
                  case 'neq':
                    return <>{funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')}) ≠ {pred.value.kind === 'int' ? pred.value.value : '?'}</>;
                  case 'lt':
                    return <>{funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')}) {'<'} {pred.value.kind === 'int' ? pred.value.value : pred.value.kind === 'var' ? pred.value.name : '?'}</>;
                  case 'leq':
                    return <>{funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')}) ≤ {pred.value.kind === 'int' ? pred.value.value : pred.value.kind === 'var' ? pred.value.name : '?'}</>;
                  case 'gt':
                    return <>{funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')}) {'>'} {pred.value.kind === 'int' ? pred.value.value : pred.value.kind === 'var' ? pred.value.name : '?'}</>;
                  case 'geq':
                    return <>{funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')}) ≥ {pred.value.kind === 'int' ? pred.value.value : pred.value.kind === 'var' ? pred.value.name : '?'}</>;
                  case 'isEmpty':
                    return <>{funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')}) = ∅</>;
                  case 'notEmpty':
                    return <>{funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')}) ≠ ∅</>;
                  case 'in':
                    return <>{renderEditablePattern(pred.element, elementSortId, 'element')} ∈ {funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')})</>;
                  case 'notIn':
                    return <>{renderEditablePattern(pred.element, elementSortId, 'element')} ∉ {funcName}({renderEditablePattern(pred.arg, inputSortId, 'arg')})</>;
                }
              };
              
              return (
                <div key={cond.id} className="side-condition">
                  <span className="side-condition-text">
                    {renderConditionPredicate()}
                  </span>
                  <button
                    className="remove-condition-btn"
                    onClick={() => removeSideCondition(rule.id, cond.id)}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Remove side condition"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="rule-line" />

        {/* Conclusion */}
        <div className="rule-conclusion">
          {renderJudgmentDisplay(judgment, rule.id, 'conclusion', rule.conclusion.args)}
        </div>

        {/* Add premise button */}
        {addingPremiseToRule === rule.id ? (
          <div className="add-premise-menu" onPointerDown={(e) => e.stopPropagation()}>
            <div className="premise-menu-header">
              <span>Add premise:</span>
              <button className="cancel-btn" onClick={() => setAddingPremiseToRule(null)} title="Cancel">×</button>
            </div>
            <div className="premise-menu-options">
              {allJudgments.map(j => (
                <button
                  key={j.id}
                  className="premise-option"
                  onClick={() => {
                    addPremiseToRule(rule.id, j.id);
                    setAddingPremiseToRule(null);
                  }}
                >
                  <span className="premise-option-name">{j.name}</span>
                  <span className="premise-option-symbol">{j.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            className="add-premise-btn"
            onClick={() => setAddingPremiseToRule(rule.id)}
            onPointerDown={(e) => e.stopPropagation()}
            title="Add premise"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}

        {/* Add side condition button */}
        {availableFunctions.length > 0 && (
          addingSideConditionToRule === rule.id ? (
            <div className="add-side-condition-menu" onPointerDown={(e) => e.stopPropagation()}>
              <div className="premise-menu-header">
                <span>Add side condition:</span>
                <button className="cancel-btn" onClick={() => setAddingSideConditionToRule(null)} title="Cancel">×</button>
              </div>
              <div className="side-condition-options">
                {availableFunctions.map(func => {
                  const returnType = func.returnType;
                  const predicateOptions: { label: string; predicate: RuleFuncPredicate }[] = [];
                  
                  // Create a placeholder pattern (meta-variable placeholder)
                  const placeholderPattern: Pattern = { id: crypto.randomUUID(), args: [] };
                  
                  if (returnType.kind === 'int') {
                    // Integer predicates
                    const zeroExpr: FuncExpr = { kind: 'int', value: 0 };
                    predicateOptions.push(
                      { label: `${func.name}(…) = 0`, predicate: { kind: 'eq', funcId: func.id, arg: placeholderPattern, value: zeroExpr } },
                      { label: `${func.name}(…) ≠ 0`, predicate: { kind: 'neq', funcId: func.id, arg: placeholderPattern, value: zeroExpr } },
                      { label: `${func.name}(…) ≤ n`, predicate: { kind: 'leq', funcId: func.id, arg: placeholderPattern, value: { kind: 'var', name: 'n' } } },
                    );
                  } else {
                    // Set predicates
                    predicateOptions.push(
                      { label: `${func.name}(…) = ∅`, predicate: { kind: 'isEmpty', funcId: func.id, arg: placeholderPattern } },
                      { label: `${func.name}(…) ≠ ∅`, predicate: { kind: 'notEmpty', funcId: func.id, arg: placeholderPattern } },
                      { label: `x ∈ ${func.name}(…)`, predicate: { kind: 'in', funcId: func.id, arg: placeholderPattern, element: { id: crypto.randomUUID(), args: [] } } },
                      { label: `x ∉ ${func.name}(…)`, predicate: { kind: 'notIn', funcId: func.id, arg: placeholderPattern, element: { id: crypto.randomUUID(), args: [] } } },
                    );
                  }
                  
                  return (
                    <div key={func.id} className="func-condition-group">
                      <div className="func-condition-label">{func.name}:</div>
                      {predicateOptions.map((opt, i) => (
                        <button
                          key={i}
                          className="condition-option"
                          onClick={() => {
                            addSideCondition(rule.id, opt.predicate);
                            setAddingSideConditionToRule(null);
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              className="add-condition-btn"
              onClick={() => setAddingSideConditionToRule(rule.id)}
              onPointerDown={(e) => e.stopPropagation()}
              title="Add side condition (function predicate)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <text x="4" y="16" fontSize="12" fontFamily="serif" fontStyle="italic">f</text>
              </svg>
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="rule-canvas">
      {/* Header */}
      <div className="canvas-header">
        <h3>
          {selectedJudgment ? (
            <>
              <span className="text-judgment">{selectedJudgment.name}</span>
              <span className="judgment-symbol">{selectedJudgment.symbol}</span>
            </>
          ) : (
            'Select a Judgment'
          )}
        </h3>
        {selectedJudgment && (
          <div className="header-badges">
            {isSyntaxDirected ? (
              <span className="badge badge-success">Syntax-Directed</span>
            ) : selectedRules.length > 0 ? (
              <span className="badge badge-warning">Not Syntax-Directed</span>
            ) : null}
            <span className="badge badge-info">{selectedRules.length} rules</span>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      {selectedJudgment && (
        <div className="main-tabs">
          <button 
            className={`main-tab ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            Rules
          </button>
          <button 
            className={`main-tab ${activeTab === 'examples' ? 'active' : ''}`}
            onClick={() => setActiveTab('examples')}
            disabled={!selectedRules.some(r => isRuleComplete(r))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Examples
          </button>
          <button 
            className={`main-tab ${activeTab === 'derivation' ? 'active' : ''}`}
            onClick={() => setActiveTab('derivation')}
            disabled={!selectedRules.some(r => isRuleComplete(r))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Derivation
            {isSyntaxDirected && <span className="tab-check">✓</span>}
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="tab-content-area">
        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="canvas-area" ref={canvasRef}>
            {!selectedJudgmentId ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <line x1="4" y1="9" x2="20" y2="9" />
                  <line x1="4" y1="15" x2="20" y2="15" />
                  <line x1="10" y1="3" x2="8" y2="21" />
                  <line x1="16" y1="3" x2="14" y2="21" />
                </svg>
                <p>Select a judgment to view and edit its inference rules</p>
              </div>
            ) : selectedRules.length === 0 ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p>No rules defined yet. Add rules from the sidebar.</p>
              </div>
            ) : (
              <DndContext onDragEnd={handleDragEnd}>
                {selectedRules.map((rule, index) => (
                  <DraggableRule key={rule.id} rule={rule}>
                    <div className="rule-card animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                      {renderInferenceRule(rule)}
                    </div>
                  </DraggableRule>
                ))}
              </DndContext>
            )}
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === 'examples' && selectedJudgment && (
          <div className="examples-tab-content">
            <div className="examples-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setExampleSeed(s => s + 10)} title="Generate new examples">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh Examples
              </button>
            </div>
            
            <div className="examples-grid">
              {satisfyingExamples.length > 0 && (
                <div className="examples-section satisfying">
                  <span className="examples-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Derivable ({satisfyingExamples.length}):
                  </span>
                  <div className="examples-list">
                    {satisfyingExamples.map((ex, i) => (
                      <div key={i} className="example-item satisfying">
                        {renderExample(ex.termStrings, selectedJudgment.separators || generateDefaultSeparators(selectedJudgment.argSorts.length, selectedJudgment.symbol))}
                        <span className="example-rule">{ex.ruleName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {nonSatisfyingExamples.length > 0 && (
                <div className="examples-section non-satisfying">
                  <span className="examples-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Not derivable ({nonSatisfyingExamples.length}):
                  </span>
                  <div className="examples-list">
                    {nonSatisfyingExamples.map((ex, i) => (
                      <div key={i} className="example-item non-satisfying">
                        {renderExample(ex.termStrings, selectedJudgment.separators || generateDefaultSeparators(selectedJudgment.argSorts.length, selectedJudgment.symbol))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {satisfyingExamples.length === 0 && nonSatisfyingExamples.length === 0 && (
                <div className="examples-empty">
                  <span>No examples could be generated</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Derivation Tab */}
        {activeTab === 'derivation' && selectedJudgment && (
          <div className="derivation-tab-content">
            {!isSyntaxDirected ? (
              <div className="derivation-unavailable">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h4>Derivation Unavailable</h4>
                <p>Derivation mode requires syntax-directed rules.</p>
                <span className="hint">Rules have overlapping patterns - multiple rules can match the same input.</span>
              </div>
            ) : (
              <div className="derivation-form">
                <div className="derivation-inputs">
                  <label>Build terms by clicking constructors:</label>
                  <div className="derivation-judgment-builder">
                    {selectedJudgment.argSorts.map((argSort, i) => {
                      const isComplete = derivationInputs[i] !== null && isTermComplete(derivationInputs[i]);
                      
                      return (
                        <div key={i} className="derivation-arg-slot">
                          {selectedJudgment.separators?.[i] && (
                            <span className="derivation-sep">{selectedJudgment.separators[i]}</span>
                          )}
                          <div className={`derivation-term-slot ${isComplete ? 'complete' : ''}`}>
                            <TermBuilder
                              sortId={argSort.sortId}
                              value={derivationInputs[i]}
                              onChange={(term) => {
                                const newInputs = [...derivationInputs];
                                newInputs[i] = term;
                                setDerivationInputs(newInputs);
                                setDerivationResult(null);
                              }}
                            />
                          </div>
                          {i === selectedJudgment.argSorts.length - 1 && selectedJudgment.separators?.[i + 1] && (
                            <span className="derivation-sep">{selectedJudgment.separators[i + 1]}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button 
                    className="btn btn-primary derive-btn"
                    onClick={tryDerive}
                    disabled={derivationInputs.some(t => t === null || !isTermComplete(t))}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                    Build Derivation
                  </button>
                </div>

                {derivationResult && (
                  <div className={`derivation-result ${derivationResult.success ? 'success' : 'failure'}`}>
                    {derivationResult.success && derivationResult.derivation ? (
                      <div className="derivation-tree">
                        <DerivationTree 
                          derivation={derivationResult.derivation} 
                          judgments={judgments}
                          constructors={constructors}
                          renderTermString={renderTermString}
                        />
                      </div>
                    ) : (
                      <div className="derivation-error">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span>{derivationResult.error || 'Cannot derive this judgment'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RuleCanvas;

