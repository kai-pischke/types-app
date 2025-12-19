# TypeForge

An elegant, interactive web application for Programming Languages researchers to define and explore inductive syntax, inference rules, and type systems.

## Features

### Inductive Syntax Definitions
- Define syntactic sorts (e.g., `ℕ`, `Tree`, `Expr`, `Type`)
- Create constructors with recursive arguments
- Support for **binder sorts** (names/variables) with automatic free variable analysis
- Visual distinction between **terminals** (green) and **non-terminals** (blue)

### Term Visualization
- Generate random term instances for any sort
- Inline and tree view modes
- Configurable depth and count
- Color-coded constructors by type

### Inference Rules
- Define judgment forms with custom symbols (↓, ⊢, →, ⇒, etc.)
- Create inference rules with premises and conclusions
- **Drag-and-drop** rule positioning on canvas
- Add/remove premises dynamically

### Syntax-Directed Analysis
- Automatic detection of whether rules are **syntax-directed**
- Highlights overlapping rules that may cause ambiguity
- Real-time analysis as you add/modify rules

### Binder Support
- Mark sorts as binder sorts for names/variables
- Specify which constructor arguments are binders
- Configure binding scope (which arguments are bound)
- Automatic free variable computation
- Closed expression checking

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Usage

1. **Define Sorts**: Start by creating syntactic categories in the left panel
2. **Add Constructors**: Define constructors for each sort with typed arguments
3. **Generate Terms**: Click "Generate" to see random instances of your syntax
4. **Create Judgments**: Define judgment forms with their argument sorts
5. **Add Rules**: Create inference rules and arrange them on the canvas
6. **Analyze**: The system automatically determines if your rules are syntax-directed

## Example Sorts

The app comes pre-loaded with examples:
- **ℕ** (Natural numbers): `Zero` | `Succ(n: ℕ)`
- **Tree**: `Leaf` | `Branch(left: Tree, right: Tree)`
- **Expr**: `Var(x: Var)` | `App(fn: Expr, arg: Expr)` | `Lam(x: Var, body: Expr)`

## Tech Stack

- React 19 + TypeScript
- Vite
- Zustand (state management)
- @dnd-kit (drag and drop)
- Framer Motion (animations)

## Design Philosophy

TypeForge is designed with PL researchers in mind, featuring:
- A dark, academic aesthetic inspired by mathematical notation
- Clear visual hierarchy for syntax trees
- Intuitive drag-and-drop rule construction
- Real-time feedback on rule properties

---

Built with λ for the PL community
