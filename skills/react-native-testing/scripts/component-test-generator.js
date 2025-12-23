#!/usr/bin/env node
/**
 * React Native Component Test Generator
 *
 * Analyzes React Native components and generates test scaffolds following
 * React Native Testing Library best practices.
 *
 * Usage:
 *   node component-test-generator.js <component-path> [options]
 *
 * Options:
 *   --output, -o     Output file path (default: <component>.test.tsx)
 *   --verbose, -v    Enable verbose output
 *   --dry-run        Print generated test without writing file
 *   --force, -f      Overwrite existing test file
 *   --with-msw       Include MSW mock setup for async components
 */

const fs = require('fs');
const path = require('path');

class ComponentTestGenerator {
  constructor(componentPath, options = {}) {
    this.componentPath = path.resolve(componentPath);
    this.options = options;
    this.componentName = '';
    this.componentContent = '';
    this.analysis = {};
  }

  run() {
    console.log('🧪 React Native Component Test Generator');
    console.log('=' .repeat(50));

    try {
      this.validatePath();
      this.readComponent();
      this.analyzeComponent();
      this.generateTest();

      console.log('✅ Test generation completed!');
      return { success: true, ...this.analysis };
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  validatePath() {
    if (!fs.existsSync(this.componentPath)) {
      throw new Error(`Component file not found: ${this.componentPath}`);
    }

    const ext = path.extname(this.componentPath);
    if (!['.tsx', '.jsx', '.ts', '.js'].includes(ext)) {
      throw new Error('Component must be a TypeScript or JavaScript file');
    }

    this.componentName = path.basename(this.componentPath, ext);

    if (this.options.verbose) {
      console.log(`📁 Component: ${this.componentName}`);
      console.log(`📂 Path: ${this.componentPath}`);
    }
  }

  readComponent() {
    this.componentContent = fs.readFileSync(this.componentPath, 'utf-8');

    if (this.options.verbose) {
      console.log(`📄 Read ${this.componentContent.length} characters`);
    }
  }

  analyzeComponent() {
    console.log('\n📊 Analyzing component...');

    this.analysis = {
      componentName: this.componentName,
      hasProps: this.detectProps(),
      hasState: this.detectState(),
      hasEffects: this.detectEffects(),
      hasAsyncOperations: this.detectAsyncOperations(),
      hasUserInteractions: this.detectUserInteractions(),
      hasNavigation: this.detectNavigation(),
      hasForms: this.detectForms(),
      hasLists: this.detectLists(),
      hasModals: this.detectModals(),
      accessibleElements: this.detectAccessibleElements(),
      eventHandlers: this.extractEventHandlers(),
    };

    if (this.options.verbose) {
      console.log('\n📋 Analysis Results:');
      Object.entries(this.analysis).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          console.log(`  ${key}: ${value ? '✓' : '✗'}`);
        } else if (Array.isArray(value)) {
          console.log(`  ${key}: [${value.join(', ')}]`);
        }
      });
    }
  }

  detectProps() {
    return /props\s*[:\)]|:\s*\{[^}]*\}\s*\)|Props\s*[=<]|interface\s+\w*Props/i.test(this.componentContent);
  }

  detectState() {
    return /useState\s*[<(]|this\.state/i.test(this.componentContent);
  }

  detectEffects() {
    return /useEffect\s*\(|componentDidMount|componentDidUpdate/i.test(this.componentContent);
  }

  detectAsyncOperations() {
    return /async\s+|await\s+|\.then\s*\(|fetch\s*\(|axios|useMutation|useQuery/i.test(this.componentContent);
  }

  detectUserInteractions() {
    return /onPress|onClick|onSubmit|onChangeText|onFocus|onBlur|onLongPress/i.test(this.componentContent);
  }

  detectNavigation() {
    return /useNavigation|navigation\.navigate|navigation\.goBack|@react-navigation/i.test(this.componentContent);
  }

  detectForms() {
    return /TextInput|<form|onSubmit|useForm|Formik/i.test(this.componentContent);
  }

  detectLists() {
    return /FlatList|SectionList|VirtualizedList|ScrollView/i.test(this.componentContent);
  }

  detectModals() {
    return /Modal|role="dialog"|BottomSheet|ActionSheet/i.test(this.componentContent);
  }

  detectAccessibleElements() {
    const elements = [];

    if (/role="button"/i.test(this.componentContent)) elements.push('button');
    if (/role="heading"/i.test(this.componentContent)) elements.push('heading');
    if (/role="link"/i.test(this.componentContent)) elements.push('link');
    if (/role="checkbox"/i.test(this.componentContent)) elements.push('checkbox');
    if (/role="switch"/i.test(this.componentContent)) elements.push('switch');
    if (/role="alert"/i.test(this.componentContent)) elements.push('alert');
    if (/role="dialog"/i.test(this.componentContent)) elements.push('dialog');
    if (/aria-label|accessibilityLabel/i.test(this.componentContent)) elements.push('labeled');
    if (/TextInput/i.test(this.componentContent)) elements.push('textbox');

    return elements;
  }

  extractEventHandlers() {
    const handlers = [];
    const handlerRegex = /on([A-Z]\w+)\s*=\s*\{/g;
    let match;

    while ((match = handlerRegex.exec(this.componentContent)) !== null) {
      handlers.push(`on${match[1]}`);
    }

    return [...new Set(handlers)];
  }

  generateTest() {
    const testContent = this.buildTestContent();
    const outputPath = this.getOutputPath();

    if (this.options.dryRun) {
      console.log('\n📝 Generated Test (dry-run):\n');
      console.log(testContent);
      return;
    }

    if (fs.existsSync(outputPath) && !this.options.force) {
      throw new Error(`Test file already exists: ${outputPath}. Use --force to overwrite.`);
    }

    fs.writeFileSync(outputPath, testContent, 'utf-8');
    console.log(`\n📝 Test written to: ${outputPath}`);
  }

  getOutputPath() {
    if (this.options.output) {
      return path.resolve(this.options.output);
    }

    const dir = path.dirname(this.componentPath);
    const ext = path.extname(this.componentPath);
    return path.join(dir, `${this.componentName}.test${ext}`);
  }

  buildTestContent() {
    const { analysis } = this;
    const imports = this.buildImports();
    const mocks = this.buildMocks();
    const testCases = this.buildTestCases();

    return `${imports}

${mocks}

describe('${analysis.componentName}', () => {
  ${analysis.hasUserInteractions ? 'const user = userEvent.setup();\n  ' : ''}${this.buildDefaultProps()}

  beforeEach(() => {
    jest.clearAllMocks();
  });

${testCases}
});
`;
  }

  buildImports() {
    const imports = ["import { render, screen"];

    if (this.analysis.hasUserInteractions) {
      imports[0] += ', userEvent';
    }

    if (this.analysis.hasAsyncOperations) {
      imports[0] += ', waitFor, waitForElementToBeRemoved';
    }

    imports[0] += " } from '@testing-library/react-native';";
    imports.push(`import { ${this.analysis.componentName} } from './${this.analysis.componentName}';`);

    if (this.options.withMsw && this.analysis.hasAsyncOperations) {
      imports.push("import { server } from '@/mocks/server';");
      imports.push("import { rest } from 'msw';");
    }

    return imports.join('\n');
  }

  buildMocks() {
    const mocks = [];

    if (this.analysis.hasNavigation) {
      mocks.push(`// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));`);
    }

    return mocks.join('\n\n');
  }

  buildDefaultProps() {
    if (!this.analysis.hasProps) {
      return '';
    }

    return `const defaultProps = {
    // Add required props here
  };

  const mockCallback = jest.fn();

  `;
  }

  buildTestCases() {
    const testCases = [];

    // Basic rendering test
    testCases.push(this.buildRenderingTest());

    // Props-based tests
    if (this.analysis.hasProps) {
      testCases.push(this.buildPropsTest());
    }

    // User interaction tests
    if (this.analysis.hasUserInteractions) {
      testCases.push(this.buildInteractionTests());
    }

    // Async operation tests
    if (this.analysis.hasAsyncOperations) {
      testCases.push(this.buildAsyncTests());
    }

    // Form tests
    if (this.analysis.hasForms) {
      testCases.push(this.buildFormTests());
    }

    // List tests
    if (this.analysis.hasLists) {
      testCases.push(this.buildListTests());
    }

    // Modal tests
    if (this.analysis.hasModals) {
      testCases.push(this.buildModalTests());
    }

    // Accessibility test
    testCases.push(this.buildAccessibilityTest());

    return testCases.join('\n\n');
  }

  buildRenderingTest() {
    const propsArg = this.analysis.hasProps ? '{...defaultProps}' : '';
    return `  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<${this.analysis.componentName} ${propsArg} />);

      // TODO: Add assertions for expected elements
      // expect(screen.getByRole('...', { name: '...' })).toBeOnTheScreen();
    });
  });`;
  }

  buildPropsTest() {
    return `  describe('props', () => {
    it('renders with custom props', () => {
      const customProps = {
        ...defaultProps,
        // TODO: Override props for this test
      };

      render(<${this.analysis.componentName} {...customProps} />);

      // TODO: Assert props affect rendering
    });
  });`;
  }

  buildInteractionTests() {
    const handlers = this.analysis.eventHandlers;
    let tests = `  describe('user interactions', () => {`;

    if (handlers.includes('onPress')) {
      tests += `
    it('handles press events', async () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps} onPress={mockCallback}' : 'onPress={mockCallback}'} />);

      // TODO: Query the pressable element
      // await user.press(screen.getByRole('button', { name: '...' }));

      // expect(mockCallback).toHaveBeenCalled();
    });
`;
    }

    if (handlers.includes('onChangeText')) {
      tests += `
    it('handles text input', async () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps}' : ''} />);

      // TODO: Query the text input
      // await user.type(screen.getByLabelText('...'), 'test value');

      // expect(screen.getByLabelText('...')).toHaveDisplayValue('test value');
    });
`;
    }

    tests += `  });`;
    return tests;
  }

  buildAsyncTests() {
    return `  describe('async operations', () => {
    it('shows loading state initially', () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps}' : ''} />);

      // TODO: Assert loading state
      // expect(screen.getByText(/loading/i)).toBeOnTheScreen();
    });

    it('displays data after loading', async () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps}' : ''} />);

      // TODO: Wait for loading to complete
      // await waitForElementToBeRemoved(() => screen.getByText(/loading/i));

      // expect(await screen.findByText('...')).toBeOnTheScreen();
    });

    it('handles errors gracefully', async () => {
      // TODO: Mock error response
      // server.use(rest.get('...', (req, res, ctx) => res(ctx.status(500))));

      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps}' : ''} />);

      // expect(await screen.findByRole('alert')).toHaveTextContent(/error/i);
    });
  });`;
  }

  buildFormTests() {
    return `  describe('form behavior', () => {
    it('validates required fields', async () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps}' : ''} />);

      // TODO: Submit empty form
      // await user.press(screen.getByRole('button', { name: /submit/i }));

      // expect(screen.getByRole('alert')).toHaveTextContent(/required/i);
    });

    it('submits with valid data', async () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps} onSubmit={mockCallback}' : 'onSubmit={mockCallback}'} />);

      // TODO: Fill form fields
      // await user.type(screen.getByLabelText('...'), 'valid value');
      // await user.press(screen.getByRole('button', { name: /submit/i }));

      // expect(mockCallback).toHaveBeenCalledWith({ ... });
    });
  });`;
  }

  buildListTests() {
    return `  describe('list behavior', () => {
    it('renders list items', () => {
      const items = [/* TODO: Add test data */];
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps} items={items}' : 'items={items}'} />);

      // expect(screen.getAllByTestId('list-item')).toHaveLength(items.length);
    });

    it('shows empty state when no items', () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps} items={[]}' : 'items={[]}'} />);

      // expect(screen.getByText(/no items/i)).toBeOnTheScreen();
    });
  });`;
  }

  buildModalTests() {
    return `  describe('modal behavior', () => {
    it('opens when triggered', async () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps}' : ''} />);

      // TODO: Trigger modal open
      // await user.press(screen.getByRole('button', { name: /open/i }));

      // expect(screen.getByRole('dialog')).toBeOnTheScreen();
    });

    it('closes when dismissed', async () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps}' : ''} />);

      // TODO: Open then close modal
      // await user.press(screen.getByRole('button', { name: /open/i }));
      // await user.press(screen.getByRole('button', { name: /close/i }));

      // expect(screen.queryByRole('dialog')).not.toBeOnTheScreen();
    });
  });`;
  }

  buildAccessibilityTest() {
    return `  describe('accessibility', () => {
    it('has accessible elements', () => {
      render(<${this.analysis.componentName} ${this.analysis.hasProps ? '{...defaultProps}' : ''} />);

      // TODO: Verify accessible elements exist
      // Prefer *ByRole queries over *ByTestId
${this.analysis.accessibleElements.map(el => `      // expect(screen.getByRole('${el}', { name: '...' })).toBeOnTheScreen();`).join('\n')}
    });
  });`;
  }
}

// CLI Entry Point
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
React Native Component Test Generator

Usage:
  node component-test-generator.js <component-path> [options]

Options:
  --output, -o <path>   Output file path (default: <component>.test.tsx)
  --verbose, -v         Enable verbose output
  --dry-run             Print generated test without writing file
  --force, -f           Overwrite existing test file
  --with-msw            Include MSW mock setup for async components
  --help, -h            Show this help message

Examples:
  node component-test-generator.js src/components/Button.tsx
  node component-test-generator.js src/screens/Home.tsx --verbose --with-msw
  node component-test-generator.js src/forms/LoginForm.tsx --dry-run
`);
    process.exit(0);
  }

  const componentPath = args[0];
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force') || args.includes('-f'),
    withMsw: args.includes('--with-msw'),
    output: null,
  };

  // Parse --output flag
  const outputIndex = args.findIndex(a => a === '--output' || a === '-o');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.output = args[outputIndex + 1];
  }

  const generator = new ComponentTestGenerator(componentPath, options);
  generator.run();
}

main();
