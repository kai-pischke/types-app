import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Header } from './components/Header';
import { SortPanel } from './components/SortPanel';
import { TermDisplay } from './components/TermDisplay';
import { JudgmentPanel } from './components/JudgmentPanel';
import { RuleCanvas } from './components/RuleCanvas';
import { FunctionPanel } from './components/FunctionPanel';
import { ProofPanel } from './components/ProofPanel';
import './App.css';

export type TabType = 'syntax' | 'functions' | 'relations' | 'proofs';

function App() {
  const initializeWithExamples = useStore(state => state.initializeWithExamples);
  const [activeTab, setActiveTab] = useState<TabType>('syntax');

  useEffect(() => {
    // Initialize with example syntax if empty
    initializeWithExamples();
  }, [initializeWithExamples]);

  return (
    <div className="app">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {activeTab === 'syntax' && (
          <>
            <aside className="sidebar">
              <SortPanel />
            </aside>
            <section className="content-area">
              <TermDisplay />
            </section>
          </>
        )}
        {activeTab === 'functions' && (
          <>
            <aside className="sidebar function-sidebar">
              <FunctionPanel />
            </aside>
            <section className="content-area">
              <div className="function-preview">
                <h2>Recursive Functions</h2>
                <p className="hint">Define terminating recursive functions over your syntax, like <code>size</code>, <code>depth</code>, or <code>fv</code> (free variables).</p>
                <div className="feature-list">
                  <div className="feature">
                    <span className="feature-icon">ℤ</span>
                    <span>Return integers with <code>+</code>, <code>-</code>, <code>max</code>, <code>min</code></span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">∅</span>
                    <span>Return sets with <code>∪</code>, <code>∩</code>, <code>\</code>, <code>{'{x}'}</code></span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">✓</span>
                    <span>Automatic termination checking (structural recursion)</span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
        {activeTab === 'relations' && (
          <>
            <aside className="sidebar">
              <JudgmentPanel />
            </aside>
            <section className="content-area">
              <RuleCanvas />
            </section>
          </>
        )}
        {activeTab === 'proofs' && (
          <section className="content-area full-width">
            <ProofPanel />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
