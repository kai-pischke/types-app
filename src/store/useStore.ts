import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Sort,
  SortId,
  Constructor,
  ConstructorId,
  ConstructorArg,
  Judgment,
  JudgmentId,
  InferenceRule,
  RuleId,
  MetaVariable,
  Pattern,
  JudgmentInstance,
  RecursiveFunc,
  RecFuncId,
  FuncReturnType,
  FuncCase,
  FuncExpr,
  SideCondition,
  RuleFuncPredicate,
  Property,
  PropertyId,
  Proof,
  ProofId,
  GoalId,
  Formula,
  Tactic,
  TacticResult,
} from '../types/syntax';
import {
  createSort,
  createConstructor,
  createJudgment,
  createMetaVariable,
  checkTermination,
  createProof,
  applyTacticToProof,
} from '../types/syntax';

interface StoreState {
  // Data
  sorts: Map<SortId, Sort>;
  constructors: Map<ConstructorId, Constructor>;
  judgments: Map<JudgmentId, Judgment>;
  rules: Map<RuleId, InferenceRule>;
  metaVariables: Map<string, MetaVariable>;
  recursiveFunctions: Map<RecFuncId, RecursiveFunc>;
  properties: Map<PropertyId, Property>;
  proofs: Map<ProofId, Proof>;

  // Selection state
  selectedSortId: SortId | null;
  selectedJudgmentId: JudgmentId | null;
  selectedRuleId: RuleId | null;
  selectedFuncId: RecFuncId | null;
  selectedPropertyId: PropertyId | null;
  selectedProofId: ProofId | null;
  selectedGoalId: GoalId | null;

  // Actions - Sorts
  addSort: (name: string, kind?: 'inductive' | 'atom', isBinderSort?: boolean, atomPrefix?: string) => Sort;
  updateSort: (id: SortId, updates: Partial<Sort>) => void;
  deleteSort: (id: SortId) => void;
  selectSort: (id: SortId | null) => void;

  // Actions - Constructors
  addConstructor: (sortId: SortId, name: string, args?: Omit<ConstructorArg, 'id'>[]) => Constructor;
  updateConstructor: (id: ConstructorId, updates: Partial<Constructor>) => void;
  deleteConstructor: (id: ConstructorId) => void;

  // Actions - Judgments
  addJudgment: (name: string, symbol: string, argSorts: { sortId: SortId; label: string }[], separators?: string[]) => Judgment;
  updateJudgment: (id: JudgmentId, updates: Partial<Judgment>) => void;
  deleteJudgment: (id: JudgmentId) => void;
  selectJudgment: (id: JudgmentId | null) => void;

  // Actions - Rules
  addRule: (name: string, judgmentId: JudgmentId) => InferenceRule;
  updateRule: (id: RuleId, updates: Partial<InferenceRule>) => void;
  deleteRule: (id: RuleId) => void;
  selectRule: (id: RuleId | null) => void;
  addPremiseToRule: (ruleId: RuleId, judgmentId: JudgmentId) => void;
  removePremiseFromRule: (ruleId: RuleId, premiseId: string) => void;
  updateRulePosition: (id: RuleId, position: { x: number; y: number }) => void;
  addSideCondition: (ruleId: RuleId, predicate: RuleFuncPredicate) => void;
  removeSideCondition: (ruleId: RuleId, conditionId: string) => void;
  updateSideCondition: (ruleId: RuleId, conditionId: string, predicate: RuleFuncPredicate) => void;

  // Actions - MetaVariables
  addMetaVariable: (name: string, sortId: SortId) => MetaVariable;
  deleteMetaVariable: (id: string) => void;

  // Actions - Recursive Functions
  addRecursiveFunc: (name: string, inputSortId: SortId, returnType: FuncReturnType) => RecursiveFunc;
  updateRecursiveFunc: (id: RecFuncId, updates: Partial<RecursiveFunc>) => void;
  deleteRecursiveFunc: (id: RecFuncId) => void;
  selectFunc: (id: RecFuncId | null) => void;
  updateFuncCase: (funcId: RecFuncId, constructorId: ConstructorId, caseUpdate: Partial<FuncCase>) => void;
  recheckTermination: (funcId: RecFuncId) => void;

  // Actions - Properties and Proofs
  addProperty: (name: string, formula: Formula, description?: string) => Property;
  updateProperty: (id: PropertyId, updates: Partial<Property>) => void;
  deleteProperty: (id: PropertyId) => void;
  selectProperty: (id: PropertyId | null) => void;
  
  startProof: (propertyId: PropertyId) => Proof;
  selectProof: (id: ProofId | null) => void;
  selectGoal: (id: GoalId | null) => void;
  applyTactic: (proofId: ProofId, goalId: GoalId, tactic: Tactic) => TacticResult;
  deleteProof: (id: ProofId) => void;

  // Getters
  getConstructorsForSort: (sortId: SortId) => Constructor[];
  getRulesForJudgment: (judgmentId: JudgmentId) => InferenceRule[];
  getFunctionsForSort: (sortId: SortId) => RecursiveFunc[];
  getProofForProperty: (propertyId: PropertyId) => Proof | undefined;

  // Initialize with examples
  initializeWithExamples: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  sorts: new Map(),
  constructors: new Map(),
  judgments: new Map(),
  rules: new Map(),
  metaVariables: new Map(),
  recursiveFunctions: new Map(),
  properties: new Map(),
  proofs: new Map(),

  selectedSortId: null,
  selectedJudgmentId: null,
  selectedRuleId: null,
  selectedFuncId: null,
  selectedPropertyId: null,
  selectedProofId: null,
  selectedGoalId: null,

  // Sort actions
  addSort: (name, kind = 'inductive', isBinderSort = false, atomPrefix) => {
    const sort = createSort(name, kind, isBinderSort, atomPrefix);
    set(state => {
      const newSorts = new Map(state.sorts);
      newSorts.set(sort.id, sort);
      return { sorts: newSorts };
    });
    return sort;
  },

  updateSort: (id, updates) => {
    set(state => {
      const newSorts = new Map(state.sorts);
      const existing = newSorts.get(id);
      if (existing) {
        newSorts.set(id, { ...existing, ...updates });
      }
      return { sorts: newSorts };
    });
  },

  deleteSort: (id) => {
    set(state => {
      const newSorts = new Map(state.sorts);
      newSorts.delete(id);
      // Also delete constructors for this sort
      const newConstructors = new Map(state.constructors);
      for (const [cid, c] of newConstructors) {
        if (c.sortId === id) {
          newConstructors.delete(cid);
        }
      }
      return {
        sorts: newSorts,
        constructors: newConstructors,
        selectedSortId: state.selectedSortId === id ? null : state.selectedSortId,
      };
    });
  },

  selectSort: (id) => {
    set({ selectedSortId: id });
  },

  // Constructor actions
  addConstructor: (sortId, name, args = []) => {
    const constructor = createConstructor(sortId, name, args);
    set(state => {
      const newConstructors = new Map(state.constructors);
      newConstructors.set(constructor.id, constructor);
      return { constructors: newConstructors };
    });
    return constructor;
  },

  updateConstructor: (id, updates) => {
    set(state => {
      const newConstructors = new Map(state.constructors);
      const existing = newConstructors.get(id);
      if (existing) {
        const updated = { ...existing, ...updates };
        // Recalculate isTerminal
        updated.isTerminal = !updated.args.some(arg => arg.sortId === updated.sortId);
        newConstructors.set(id, updated);
      }
      return { constructors: newConstructors };
    });
  },

  deleteConstructor: (id) => {
    set(state => {
      const newConstructors = new Map(state.constructors);
      newConstructors.delete(id);
      return { constructors: newConstructors };
    });
  },

  // Judgment actions
  addJudgment: (name, symbol, argSorts, separators) => {
    const judgment = createJudgment(name, symbol, argSorts, separators);
    set(state => {
      const newJudgments = new Map(state.judgments);
      newJudgments.set(judgment.id, judgment);
      return { judgments: newJudgments };
    });
    return judgment;
  },

  updateJudgment: (id, updates) => {
    set(state => {
      const newJudgments = new Map(state.judgments);
      const existing = newJudgments.get(id);
      if (existing) {
        newJudgments.set(id, { ...existing, ...updates });
      }
      return { judgments: newJudgments };
    });
  },

  deleteJudgment: (id) => {
    set(state => {
      const newJudgments = new Map(state.judgments);
      newJudgments.delete(id);
      // Also delete rules for this judgment and clean up premises referencing it
      const newRules = new Map(state.rules);
      for (const [rid, r] of newRules) {
        if (r.conclusion.judgmentId === id) {
          // Delete rules that have this judgment as conclusion
          newRules.delete(rid);
        } else {
          // Remove premises that reference the deleted judgment
          const filteredPremises = r.premises.filter(p => p.judgmentId !== id);
          if (filteredPremises.length !== r.premises.length) {
            newRules.set(rid, { ...r, premises: filteredPremises });
          }
        }
      }
      return {
        judgments: newJudgments,
        rules: newRules,
        selectedJudgmentId: state.selectedJudgmentId === id ? null : state.selectedJudgmentId,
      };
    });
  },

  selectJudgment: (id) => {
    set({ selectedJudgmentId: id });
  },

  // Rule actions
  addRule: (name, judgmentId) => {
    const judgment = get().judgments.get(judgmentId);
    if (!judgment) throw new Error('Judgment not found');

    const conclusionArgs: Pattern[] = judgment.argSorts.map(() => ({
      id: uuidv4(),
      args: [],
    }));

    // Count existing rules for this judgment to position new ones
    const existingRulesCount = Array.from(get().rules.values())
      .filter(r => r.conclusion.judgmentId === judgmentId).length;
    
    const rule: InferenceRule = {
      id: uuidv4(),
      name,
      premises: [],
      sideConditions: [],
      conclusion: {
        id: uuidv4(),
        judgmentId,
        args: conclusionArgs,
      },
      position: { 
        x: 50 + (existingRulesCount % 3) * 220, 
        y: 50 + Math.floor(existingRulesCount / 3) * 180 
      },
    };

    set(state => {
      const newRules = new Map(state.rules);
      newRules.set(rule.id, rule);
      return { rules: newRules };
    });

    return rule;
  },

  updateRule: (id, updates) => {
    set(state => {
      const newRules = new Map(state.rules);
      const existing = newRules.get(id);
      if (existing) {
        newRules.set(id, { ...existing, ...updates });
      }
      return { rules: newRules };
    });
  },

  deleteRule: (id) => {
    set(state => {
      const newRules = new Map(state.rules);
      newRules.delete(id);
      return {
        rules: newRules,
        selectedRuleId: state.selectedRuleId === id ? null : state.selectedRuleId,
      };
    });
  },

  selectRule: (id) => {
    set({ selectedRuleId: id });
  },

  addPremiseToRule: (ruleId, judgmentId) => {
    const judgment = get().judgments.get(judgmentId);
    if (!judgment) return;

    const premiseArgs: Pattern[] = judgment.argSorts.map(() => ({
      id: uuidv4(),
      args: [],
    }));

    const premise: JudgmentInstance = {
      id: uuidv4(),
      judgmentId,
      args: premiseArgs,
    };

    set(state => {
      const newRules = new Map(state.rules);
      const rule = newRules.get(ruleId);
      if (rule) {
        newRules.set(ruleId, {
          ...rule,
          premises: [...rule.premises, premise],
        });
      }
      return { rules: newRules };
    });
  },

  removePremiseFromRule: (ruleId, premiseId) => {
    set(state => {
      const newRules = new Map(state.rules);
      const rule = newRules.get(ruleId);
      if (rule) {
        newRules.set(ruleId, {
          ...rule,
          premises: rule.premises.filter(p => p.id !== premiseId),
        });
      }
      return { rules: newRules };
    });
  },

  updateRulePosition: (id, position) => {
    set(state => {
      const newRules = new Map(state.rules);
      const rule = newRules.get(id);
      if (rule) {
        newRules.set(id, { ...rule, position });
      }
      return { rules: newRules };
    });
  },

  addSideCondition: (ruleId, predicate) => {
    const condition: SideCondition = {
      id: uuidv4(),
      predicate,
    };
    
    set(state => {
      const newRules = new Map(state.rules);
      const rule = newRules.get(ruleId);
      if (rule) {
        newRules.set(ruleId, {
          ...rule,
          sideConditions: [...(rule.sideConditions || []), condition],
        });
      }
      return { rules: newRules };
    });
  },

  removeSideCondition: (ruleId, conditionId) => {
    set(state => {
      const newRules = new Map(state.rules);
      const rule = newRules.get(ruleId);
      if (rule) {
        newRules.set(ruleId, {
          ...rule,
          sideConditions: (rule.sideConditions || []).filter(c => c.id !== conditionId),
        });
      }
      return { rules: newRules };
    });
  },

  updateSideCondition: (ruleId, conditionId, predicate) => {
    set(state => {
      const newRules = new Map(state.rules);
      const rule = newRules.get(ruleId);
      if (rule) {
        newRules.set(ruleId, {
          ...rule,
          sideConditions: (rule.sideConditions || []).map(c =>
            c.id === conditionId ? { ...c, predicate } : c
          ),
        });
      }
      return { rules: newRules };
    });
  },

  // MetaVariable actions
  addMetaVariable: (name, sortId) => {
    const mv = createMetaVariable(name, sortId);
    set(state => {
      const newMVs = new Map(state.metaVariables);
      newMVs.set(mv.id, mv);
      return { metaVariables: newMVs };
    });
    return mv;
  },

  deleteMetaVariable: (id) => {
    set(state => {
      const newMVs = new Map(state.metaVariables);
      newMVs.delete(id);
      return { metaVariables: newMVs };
    });
  },

  // Recursive Function actions
  addRecursiveFunc: (name, inputSortId, returnType) => {
    const state = get();
    const sortConstructors = Array.from(state.constructors.values()).filter(c => c.sortId === inputSortId);
    
    // Create empty cases for each constructor
    // Find a default body based on return type
    let defaultBody: FuncExpr;
    if (returnType.kind === 'int') {
      defaultBody = { kind: 'int', value: 0 };
    } else if (returnType.kind === 'set') {
      defaultBody = { kind: 'empty' };
    } else {
      // Inductive return type - use first terminal constructor or placeholder
      const returnConstructors = Array.from(state.constructors.values())
        .filter(c => c.sortId === returnType.sortId);
      const terminalConstr = returnConstructors.find(c => c.args.length === 0);
      if (terminalConstr) {
        defaultBody = { kind: 'construct', constructorId: terminalConstr.id, args: [] };
      } else {
        // Use first constructor with placeholder args
        const firstConstr = returnConstructors[0];
        defaultBody = firstConstr 
          ? { kind: 'construct', constructorId: firstConstr.id, args: firstConstr.args.map(() => ({ kind: 'var' as const, name: '_' })) }
          : { kind: 'var', name: '_' }; // Fallback
      }
    }
    
    const cases: FuncCase[] = sortConstructors.map(c => ({
      constructorId: c.id,
      boundVars: c.args.map((arg, i) => arg.label || `x${i}`),
      body: defaultBody,
    }));
    
    const func: RecursiveFunc = {
      id: uuidv4(),
      name,
      inputSortId,
      extraArgs: [], // No extra args by default
      returnType,
      cases,
      terminates: true, // Will be checked
    };
    
    // Check termination
    const result = checkTermination(func, state.constructors, state.recursiveFunctions);
    func.terminates = result.terminates;
    func.terminationError = result.error;
    
    set(state => {
      const newFuncs = new Map(state.recursiveFunctions);
      newFuncs.set(func.id, func);
      return { recursiveFunctions: newFuncs };
    });
    
    return func;
  },

  updateRecursiveFunc: (id, updates) => {
    set(state => {
      const newFuncs = new Map(state.recursiveFunctions);
      const existing = newFuncs.get(id);
      if (existing) {
        const updated = { ...existing, ...updates };
        // Recheck termination if cases changed
        if (updates.cases) {
          const result = checkTermination(updated, state.constructors, newFuncs);
          updated.terminates = result.terminates;
          updated.terminationError = result.error;
        }
        newFuncs.set(id, updated);
      }
      return { recursiveFunctions: newFuncs };
    });
  },

  deleteRecursiveFunc: (id) => {
    set(state => {
      const newFuncs = new Map(state.recursiveFunctions);
      newFuncs.delete(id);
      return { 
        recursiveFunctions: newFuncs,
        selectedFuncId: state.selectedFuncId === id ? null : state.selectedFuncId,
      };
    });
  },

  selectFunc: (id) => {
    set({ selectedFuncId: id });
  },

  updateFuncCase: (funcId, constructorId, caseUpdate) => {
    set(state => {
      const newFuncs = new Map(state.recursiveFunctions);
      const func = newFuncs.get(funcId);
      if (func) {
        const newCases = func.cases.map(c => 
          c.constructorId === constructorId ? { ...c, ...caseUpdate } : c
        );
        const updated = { ...func, cases: newCases };
        // Recheck termination
        const result = checkTermination(updated, state.constructors, newFuncs);
        updated.terminates = result.terminates;
        updated.terminationError = result.error;
        newFuncs.set(funcId, updated);
      }
      return { recursiveFunctions: newFuncs };
    });
  },

  recheckTermination: (funcId) => {
    set(state => {
      const newFuncs = new Map(state.recursiveFunctions);
      const func = newFuncs.get(funcId);
      if (func) {
        const result = checkTermination(func, state.constructors, newFuncs);
        newFuncs.set(funcId, { ...func, terminates: result.terminates, terminationError: result.error });
      }
      return { recursiveFunctions: newFuncs };
    });
  },

  // Property actions
  addProperty: (name, formula, description) => {
    const property: Property = {
      id: uuidv4(),
      name,
      formula,
      description,
    };
    set(state => {
      const newProps = new Map(state.properties);
      newProps.set(property.id, property);
      return { properties: newProps };
    });
    return property;
  },

  updateProperty: (id, updates) => {
    set(state => {
      const newProps = new Map(state.properties);
      const existing = newProps.get(id);
      if (existing) {
        newProps.set(id, { ...existing, ...updates });
      }
      return { properties: newProps };
    });
  },

  deleteProperty: (id) => {
    set(state => {
      const newProps = new Map(state.properties);
      newProps.delete(id);
      // Also delete associated proofs
      const newProofs = new Map(state.proofs);
      for (const [proofId, proof] of newProofs) {
        if (proof.propertyId === id) {
          newProofs.delete(proofId);
        }
      }
      return { 
        properties: newProps,
        proofs: newProofs,
        selectedPropertyId: state.selectedPropertyId === id ? null : state.selectedPropertyId,
      };
    });
  },

  selectProperty: (id) => {
    set({ selectedPropertyId: id });
  },

  startProof: (propertyId) => {
    const property = get().properties.get(propertyId);
    if (!property) throw new Error('Property not found');
    
    const proof = createProof(property);
    
    set(state => {
      const newProofs = new Map(state.proofs);
      newProofs.set(proof.id, proof);
      return { 
        proofs: newProofs, 
        selectedProofId: proof.id,
        selectedGoalId: proof.rootGoalId,
      };
    });
    
    return proof;
  },

  selectProof: (id) => {
    set({ selectedProofId: id });
  },

  selectGoal: (id) => {
    set({ selectedGoalId: id });
  },

  applyTactic: (proofId, goalId, tactic) => {
    const state = get();
    const proof = state.proofs.get(proofId);
    if (!proof) return { success: false, error: 'Proof not found' };
    
    const { proof: newProof, result } = applyTacticToProof(
      proof,
      goalId,
      tactic,
      state.constructors,
      state.sorts,
      state.recursiveFunctions,
      state.rules
    );
    
    if (result.success) {
      set(state => {
        const newProofs = new Map(state.proofs);
        newProofs.set(proofId, newProof);
        // Select first open goal if available
        const newSelectedGoal = newProof.openGoals.length > 0 ? newProof.openGoals[0] : null;
        return { 
          proofs: newProofs,
          selectedGoalId: newSelectedGoal,
        };
      });
    }
    
    return result;
  },

  deleteProof: (id) => {
    set(state => {
      const newProofs = new Map(state.proofs);
      newProofs.delete(id);
      return { 
        proofs: newProofs,
        selectedProofId: state.selectedProofId === id ? null : state.selectedProofId,
        selectedGoalId: state.selectedProofId === id ? null : state.selectedGoalId,
      };
    });
  },

  // Getters
  getConstructorsForSort: (sortId) => {
    return Array.from(get().constructors.values()).filter(c => c.sortId === sortId);
  },

  getRulesForJudgment: (judgmentId) => {
    return Array.from(get().rules.values()).filter(r => r.conclusion.judgmentId === judgmentId);
  },

  getFunctionsForSort: (sortId) => {
    return Array.from(get().recursiveFunctions.values()).filter(f => f.inputSortId === sortId);
  },

  getProofForProperty: (propertyId) => {
    return Array.from(get().proofs.values()).find(p => p.propertyId === propertyId);
  },

  // Initialize with examples - Even/Odd relations on Peano numerals
  initializeWithExamples: () => {
    const state = get();
    
    // Prevent double initialization (React StrictMode calls effects twice)
    if (state.sorts.size > 0) {
      return;
    }

    // ============================================
    // SYNTAX: Peano Numerals
    // ============================================
    
    // Natural numbers: Zero | Succ(n)
    const nat = state.addSort('ℕ');
    const zeroC = state.addConstructor(nat.id, 'Z');
    const succC = state.addConstructor(nat.id, 'S', [{ sortId: nat.id, label: 'n' }]);

    // ============================================
    // JUDGMENTS: Even and Odd
    // ============================================
    
    // n even (unary judgment with suffix)
    const evenJudgment = state.addJudgment('even', 'even', [
      { sortId: nat.id, label: 'n' },
    ]);
    
    // n odd (unary judgment with suffix)
    const oddJudgment = state.addJudgment('odd', 'odd', [
      { sortId: nat.id, label: 'n' },
    ]);

    // ============================================
    // RULES: Even/Odd
    // ============================================

    // Create meta-variable first
    const nVar = state.addMetaVariable('n', nat.id);

    // E-Zero: Z even (axiom - zero is even)
    const zeroEvenRule = state.addRule('E-Zero', evenJudgment.id);
    state.updateRule(zeroEvenRule.id, { position: { x: 50, y: 50 } });
    
    // Get fresh state after addRule
    let ruleData = get().rules.get(zeroEvenRule.id);
    if (ruleData) {
      state.updateRule(zeroEvenRule.id, {
        conclusion: {
          ...ruleData.conclusion,
          args: [
            { id: crypto.randomUUID(), constructorId: zeroC.id, args: [] },
          ],
        },
      });
    }

    // E-Succ: n odd ⟹ S(n) even
    const succEvenRule = state.addRule('E-Succ', evenJudgment.id);
    state.updateRule(succEvenRule.id, { position: { x: 300, y: 50 } });
    
    // Add premise: n odd
    state.addPremiseToRule(succEvenRule.id, oddJudgment.id);
    
    // Get fresh state
    ruleData = get().rules.get(succEvenRule.id);
    if (ruleData && ruleData.premises.length > 0) {
      state.updateRule(succEvenRule.id, {
        premises: [{
          ...ruleData.premises[0],
          args: [
            { id: crypto.randomUUID(), metaVariableId: nVar.id, args: [] },
          ],
        }],
        conclusion: {
          ...ruleData.conclusion,
          args: [
            { id: crypto.randomUUID(), constructorId: succC.id, args: [
              { id: crypto.randomUUID(), metaVariableId: nVar.id, args: [] }
            ]},
          ],
        },
      });
    }

    // O-Succ: n even ⟹ S(n) odd
    const succOddRule = state.addRule('O-Succ', oddJudgment.id);
    state.updateRule(succOddRule.id, { position: { x: 50, y: 50 } });
    
    // Add premise: n even
    state.addPremiseToRule(succOddRule.id, evenJudgment.id);
    
    // Get fresh state
    ruleData = get().rules.get(succOddRule.id);
    if (ruleData && ruleData.premises.length > 0) {
      state.updateRule(succOddRule.id, {
        premises: [{
          ...ruleData.premises[0],
          args: [
            { id: crypto.randomUUID(), metaVariableId: nVar.id, args: [] },
          ],
        }],
        conclusion: {
          ...ruleData.conclusion,
          args: [
            { id: crypto.randomUUID(), constructorId: succC.id, args: [
              { id: crypto.randomUUID(), metaVariableId: nVar.id, args: [] }
            ]},
          ],
        },
      });
    }

    // ============================================
    // RECURSIVE FUNCTIONS: Examples
    // ============================================
    
    // size : ℕ → ℤ (counts the number of Succ constructors)
    const sizeFunc = state.addRecursiveFunc('size', nat.id, { kind: 'int' });
    
    // Update the cases with proper expressions:
    // size(Z) = 0
    // size(S(n)) = 1 + size(n)
    state.updateFuncCase(sizeFunc.id, zeroC.id, {
      boundVars: [],
      body: { kind: 'int', value: 0 },
    });
    
    state.updateFuncCase(sizeFunc.id, succC.id, {
      boundVars: ['n'],
      body: {
        kind: 'add',
        left: { kind: 'int', value: 1 },
        right: { kind: 'call', funcId: sizeFunc.id, arg: { kind: 'var', name: 'n' } },
      },
    });

    // Select defaults
    state.selectSort(nat.id);
    state.selectJudgment(evenJudgment.id);
  },
}));

