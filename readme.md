<!-- ⚠️ This README has been generated from the file(s) "blueprint.md" ⚠️-->
[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#react-native-testing)

# ➤ React Native Testing

A focused AI skill for writing, generating, and improving **high-quality React Native tests** using React Native Testing Library, Jest, and userEvent-driven patterns.

This skill acts like a senior testing engineer embedded in your workflow: it guides test authoring, generates realistic test scaffolds, analyzes coverage gaps, and enforces accessibility-first, user-centric testing practices.

---

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#what-this-skill-provides)

## ➤ What This Skill Provides

### Test Authoring Intelligence

- Accessibility-first query recommendations (`getByRole`, `getByLabelText`)
- User-focused assertions over implementation details
- Modern RNTL and jest-native matcher conventions
- Clear guidance on async behavior, interactions, and edge cases

### Automated Tooling

#### **Component Test Generator**

- Analyzes a React Native component’s structure
- Detects props, state, effects, async logic, navigation, forms, lists, and modals
- Generates a tailored `.test.tsx` scaffold with sensible defaults

#### **Coverage Analyzer**

- Reads Jest coverage reports
- Identifies untested or under-tested files
- Classifies files by type and complexity
- Produces prioritized, actionable recommendations

### Built-in Knowledge Base

- React Native testing best practices
- Query selection decision frameworks
- Canonical testing patterns for:
  - Components
  - Forms
  - Lists
  - Modals
  - Async data flows
  - Navigation
  - Context and providers

---

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#repository-layout)

## ➤ Repository Layout

    - skills/
      - react-native-testing/
          - references/
          - best_practices.md
          - query_strategies.md
          - testing_patterns.md
        - scripts/
          - component-test-generator.js
          - coverage-analyzer.js
          - test-suite-scaffolder.js
        - SKILL.md

- `references/` – Authoritative testing guidance used by the skill
- `scripts/` – Executable generators and analyzers
- `SKILL.md` – Claude-facing behavioral and instruction definitions

---

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#component-test-generator)

## ➤ Component Test Generator

Generate realistic test scaffolds that match how your component actually behaves.

`node component-test-generator.js src/components/Button.tsx`

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#automatically-detects)

## ➤ **Automatically detects**

- Props and callbacks
- State and effects
- User interactions
- Async logic
- Navigation usage
- Forms, lists, and modals
- Accessible roles and labels

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#generated-output-includes)

## ➤ **Generated output includes**

- Correct testing-library imports
- Navigation mocks when required
- Structured `describe` blocks
- Minimal TODOs where human intent matters

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#options)

## ➤ **Options**

- `--dry-run`
- `--verbose`
- `--with-msw`
- `--force`

---

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#coverage-analyzer)

## ➤ Coverage Analyzer

Turn raw coverage data into clear testing priorities.

`node coverage-analyzer.js .`

### **Capabilities**

- Finds untested files
- Classifies components, hooks, utils, and screens
- Assigns priority from critical to low
- Validates coverage thresholds
- Outputs readable summaries or JSON

Focused analysis example:

`node coverage-analyzer.js . –focus hooks`

---

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#testing-philosophy)

## ➤ Testing Philosophy

This skill follows Testing Library’s core principles:

- Test what users see and do
- Prefer roles and labels over test IDs
- Avoid testing internal state
- Assert observable outcomes, not implementation

If a test breaks after a refactor that didn’t change behavior, the skill treats that as a signal to improve the test.

---

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#supported-stack)

## ➤ Supported Stack

- React Native
- React Native Testing Library
- Jest and jest-native matchers
- userEvent
- MSW (for async and API mocking)
- React Navigation
- React Query / TanStack Query

---

[![-----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/colored.png)](#ideal-use-cases)

## ➤ Ideal Use Cases

- Scaling test coverage in production React Native apps
- Standardizing testing practices across teams
- Generating tests for legacy components
- Improving accessibility through better queries
- CI-friendly coverage analysis and enforcement
