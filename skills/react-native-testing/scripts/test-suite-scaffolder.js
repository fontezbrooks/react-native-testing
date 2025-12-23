#!/usr/bin/env node
/**
 * React Native Test Suite Scaffolder
 *
 * Sets up a complete testing infrastructure for React Native projects
 * including Jest configuration, test utilities, and mock setup.
 *
 * Usage:
 *   node test-suite-scaffolder.js <project-path> [options]
 *
 * Options:
 *   --with-msw        Include MSW for API mocking
 *   --with-providers  Include custom render with providers
 *   --dry-run         Preview changes without writing files
 *   --force           Overwrite existing files
 *   --verbose, -v     Enable verbose output
 */

const fs = require('fs');
const path = require('path');

class TestSuiteScaffolder {
  constructor(projectPath, options = {}) {
    this.projectPath = path.resolve(projectPath);
    this.options = {
      withMsw: false,
      withProviders: false,
      dryRun: false,
      force: false,
      verbose: false,
      ...options,
    };
    this.files = [];
    this.packageJson = null;
  }

  run() {
    console.log('🏗️  React Native Test Suite Scaffolder');
    console.log('='.repeat(50));

    try {
      this.validateProject();
      this.analyzeProject();
      this.prepareFiles();
      this.writeFiles();
      this.updatePackageJson();
      this.printInstructions();

      console.log('\n✅ Test suite scaffolding completed!');
      return { success: true, files: this.files };
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  validateProject() {
    if (!fs.existsSync(this.projectPath)) {
      throw new Error(`Project path not found: ${this.projectPath}`);
    }

    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('Not a valid npm project (missing package.json)');
    }

    this.packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Verify it's a React Native project
    const deps = { ...this.packageJson.dependencies, ...this.packageJson.devDependencies };
    if (!deps['react-native']) {
      throw new Error('Not a React Native project (react-native not found in dependencies)');
    }

    if (this.options.verbose) {
      console.log(`📁 Project: ${this.packageJson.name || this.projectPath}`);
      console.log(`📦 React Native: ${deps['react-native']}`);
    }
  }

  analyzeProject() {
    console.log('\n📊 Analyzing project structure...');

    // Check for existing test setup
    const existingFiles = {
      jestConfig: this.fileExists('jest.config.js') || this.fileExists('jest.config.ts'),
      jestSetup: this.fileExists('jest-setup.ts') || this.fileExists('jest-setup.js') ||
                 this.fileExists('jest.setup.ts') || this.fileExists('jest.setup.js'),
      testUtils: this.fileExists('src/test-utils.tsx') || this.fileExists('test-utils.tsx'),
      mswHandlers: this.fileExists('src/mocks/handlers.ts') || this.fileExists('mocks/handlers.ts'),
    };

    if (this.options.verbose) {
      console.log('\n📋 Existing configuration:');
      Object.entries(existingFiles).forEach(([key, exists]) => {
        console.log(`  ${key}: ${exists ? '✓ exists' : '✗ missing'}`);
      });
    }

    // Detect TypeScript
    this.useTypeScript = this.fileExists('tsconfig.json');

    // Detect src directory
    this.hasSrcDir = fs.existsSync(path.join(this.projectPath, 'src'));

    this.existingFiles = existingFiles;
  }

  fileExists(relativePath) {
    return fs.existsSync(path.join(this.projectPath, relativePath));
  }

  prepareFiles() {
    console.log('\n📝 Preparing test files...');

    const ext = this.useTypeScript ? 'ts' : 'js';
    const extx = this.useTypeScript ? 'tsx' : 'jsx';

    // Jest configuration
    if (!this.existingFiles.jestConfig || this.options.force) {
      this.files.push({
        path: `jest.config.${ext}`,
        content: this.generateJestConfig(),
      });
    }

    // Jest setup file
    if (!this.existingFiles.jestSetup || this.options.force) {
      this.files.push({
        path: `jest-setup.${ext}`,
        content: this.generateJestSetup(),
      });
    }

    // Test utilities with custom render
    if (this.options.withProviders && (!this.existingFiles.testUtils || this.options.force)) {
      const testsDir = this.hasSrcDir ? 'src' : '.';
      this.files.push({
        path: `${testsDir}/test-utils.${extx}`,
        content: this.generateTestUtils(),
      });
    }

    // MSW handlers
    if (this.options.withMsw && (!this.existingFiles.mswHandlers || this.options.force)) {
      const mocksDir = this.hasSrcDir ? 'src/mocks' : 'mocks';

      this.files.push({
        path: `${mocksDir}/handlers.${ext}`,
        content: this.generateMswHandlers(),
      });

      this.files.push({
        path: `${mocksDir}/server.${ext}`,
        content: this.generateMswServer(),
      });
    }

    // Example test file
    const exampleTestPath = this.hasSrcDir ? 'src/__tests__/example.test.tsx' : '__tests__/example.test.tsx';
    if (!this.fileExists(exampleTestPath) || this.options.force) {
      this.files.push({
        path: exampleTestPath,
        content: this.generateExampleTest(),
      });
    }

    if (this.options.verbose) {
      console.log('\n📄 Files to create:');
      this.files.forEach(f => console.log(`  • ${f.path}`));
    }
  }

  generateJestConfig() {
    const isTs = this.useTypeScript;

    return `${isTs ? "import type { Config } from 'jest';\n\nconst config: Config = " : 'module.exports = '}{
  preset: 'react-native',

  // Setup files run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/jest-setup.${isTs ? 'ts' : 'js'}'],

  // Transform configuration for React Native
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library|react-native-.*)/)',
  ],

  // Module path aliases (match your tsconfig paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).{ts,tsx,js,jsx}',
    '**/*.(test|spec).{ts,tsx,js,jsx}',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx,js,jsx}',
    '!src/**/*.spec.{ts,tsx,js,jsx}',
    '!src/**/*.stories.{ts,tsx,js,jsx}',
    '!src/**/index.{ts,tsx,js,jsx}',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Test environment
  testEnvironment: 'node',

  // Test timeout (ms)
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
}${isTs ? ';\n\nexport default config;' : ';'}
`;
  }

  generateJestSetup() {
    const isTs = this.useTypeScript;
    let content = `// Jest setup file - runs before each test file
import '@testing-library/react-native/extend-expect';

`;

    // Add console warning suppression
    content += `// Suppress specific warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args${isTs ? ': unknown[]' : ''}) => {
  // Suppress act() warnings if you're getting false positives
  if (typeof args[0] === 'string' && args[0].includes('act()')) {
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args${isTs ? ': unknown[]' : ''}) => {
  // Suppress known React Native warnings
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
    return;
  }
  originalError.apply(console, args);
};

`;

    // Add native module mocks
    content += `// Mock native animated module
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

`;

    // Add navigation mock
    content += `// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
  };
});

`;

    // Add gesture handler mock
    content += `// Mock Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    BaseButton: View,
    Directions: {},
    TouchableOpacity: View,
    TouchableHighlight: View,
    TouchableNativeFeedback: View,
    TouchableWithoutFeedback: View,
  };
});

`;

    // Add safe area mock
    content += `// Mock Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }${isTs ? ': { children: React.ReactNode }' : ''}) => children,
  SafeAreaView: ({ children }${isTs ? ': { children: React.ReactNode }' : ''}) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
}));

`;

    // Add MSW setup if enabled
    if (this.options.withMsw) {
      content += `// MSW Server Setup
import { server } from '${this.hasSrcDir ? './src' : '.'}/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

`;
    }

    // Add global timeout
    content += `// Global test timeout
jest.setTimeout(10000);
`;

    return content;
  }

  generateTestUtils() {
    const isTs = this.useTypeScript;

    return `${isTs ? `import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
` : `import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
`}
// Import your providers here
// import { ThemeProvider } from './providers/ThemeProvider';
// import { AuthProvider } from './providers/AuthProvider';

${isTs ? `interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom options for your providers
  // theme?: 'light' | 'dark';
  // user?: User | null;
  initialRoute?: string;
}` : ''}

/**
 * Custom render function that wraps components in required providers.
 * Use this instead of render() from @testing-library/react-native
 * when your components need access to context providers.
 */
function customRender(
  ui${isTs ? ': ReactElement' : ''},
  {
    // Destructure custom options here
    // theme = 'light',
    // user = null,
    initialRoute = '/',
    ...options
  }${isTs ? ': CustomRenderOptions' : ''} = {}
) {
  function Wrapper({ children }${isTs ? ': { children: ReactNode }' : ''}) {
    return (
      <NavigationContainer>
        {/* Wrap with your providers */}
        {/* <ThemeProvider theme={theme}> */}
        {/*   <AuthProvider initialUser={user}> */}
              {children}
        {/*   </AuthProvider> */}
        {/* </ThemeProvider> */}
      </NavigationContainer>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from testing library
export * from '@testing-library/react-native';

// Export custom render as the default render
export { customRender as render };

// Export additional test utilities
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(() => true),
});

export const createMockRoute = (params = {}) => ({
  key: 'test-route',
  name: 'TestScreen',
  params,
});
`;
  }

  generateMswHandlers() {
    return `import { rest } from 'msw';

// Define your API base URL
const API_URL = process.env.API_URL || 'https://api.example.com';

/**
 * Default handlers for your API endpoints.
 * These handlers will be used for all tests unless overridden.
 */
export const handlers = [
  // Example: GET user by ID
  rest.get(\`\${API_URL}/users/:id\`, (req, res, ctx) => {
    const { id } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        id,
        name: 'Test User',
        email: 'test@example.com',
      })
    );
  }),

  // Example: POST login
  rest.post(\`\${API_URL}/auth/login\`, async (req, res, ctx) => {
    const { email, password } = await req.json();

    if (email === 'test@example.com' && password === 'password') {
      return res(
        ctx.status(200),
        ctx.json({
          token: 'mock-jwt-token',
          user: {
            id: '1',
            email,
            name: 'Test User',
          },
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    );
  }),

  // Example: GET list of items
  rest.get(\`\${API_URL}/items\`, (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || '1';
    const limit = req.url.searchParams.get('limit') || '10';

    return res(
      ctx.status(200),
      ctx.json({
        items: [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
          { id: '3', name: 'Item 3' },
        ],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 3,
        },
      })
    );
  }),

  // Add more handlers as needed...
];

/**
 * Error handlers - use these in specific tests to simulate errors
 */
export const errorHandlers = {
  serverError: rest.get(\`\${API_URL}/*\`, (req, res, ctx) =>
    res(ctx.status(500), ctx.json({ error: 'Internal server error' }))
  ),

  networkError: rest.get(\`\${API_URL}/*\`, (req, res) =>
    res.networkError('Failed to connect')
  ),

  unauthorized: rest.get(\`\${API_URL}/*\`, (req, res, ctx) =>
    res(ctx.status(401), ctx.json({ error: 'Unauthorized' }))
  ),
};
`;
  }

  generateMswServer() {
    return `import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW Server instance for testing.
 * Import this in your jest-setup file to enable API mocking.
 *
 * In jest-setup.ts:
 *   import { server } from './mocks/server';
 *   beforeAll(() => server.listen());
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 */
export const server = setupServer(...handlers);
`;
  }

  generateExampleTest() {
    const renderImport = this.options.withProviders
      ? `import { render, screen, userEvent } from '${this.hasSrcDir ? '@/' : './'}test-utils';`
      : `import { render, screen, userEvent } from '@testing-library/react-native';`;

    return `/**
 * Example Test File
 *
 * This demonstrates React Native Testing Library best practices:
 * - Using semantic queries (getByRole, getByLabelText)
 * - Testing user interactions with userEvent
 * - Async testing with findBy queries
 * - Asserting element presence and content
 */

import * as React from 'react';
import { Text, View, Pressable } from 'react-native';
${renderImport}

// Example component to test
function ExampleComponent({ onPress }: { onPress?: () => void }) {
  const [count, setCount] = React.useState(0);

  return (
    <View>
      <Text role="heading">Example Component</Text>
      <Text>Count: {count}</Text>
      <Pressable
        role="button"
        accessibilityLabel="Increment"
        onPress={() => {
          setCount(c => c + 1);
          onPress?.();
        }}
      >
        <Text>Increment</Text>
      </Pressable>
    </View>
  );
}

describe('ExampleComponent', () => {
  it('renders the heading', () => {
    render(<ExampleComponent />);

    // Use semantic query for heading
    expect(screen.getByRole('heading', { name: 'Example Component' })).toBeOnTheScreen();
  });

  it('displays initial count of 0', () => {
    render(<ExampleComponent />);

    expect(screen.getByText('Count: 0')).toBeOnTheScreen();
  });

  it('increments count when button is pressed', async () => {
    const user = userEvent.setup();
    render(<ExampleComponent />);

    // Use semantic query for button
    await user.press(screen.getByRole('button', { name: 'Increment' }));

    expect(screen.getByText('Count: 1')).toBeOnTheScreen();
  });

  it('calls onPress callback when pressed', async () => {
    const mockOnPress = jest.fn();
    const user = userEvent.setup();

    render(<ExampleComponent onPress={mockOnPress} />);

    await user.press(screen.getByRole('button', { name: 'Increment' }));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('can increment multiple times', async () => {
    const user = userEvent.setup();
    render(<ExampleComponent />);

    const button = screen.getByRole('button', { name: 'Increment' });

    await user.press(button);
    await user.press(button);
    await user.press(button);

    expect(screen.getByText('Count: 3')).toBeOnTheScreen();
  });
});

/**
 * Test Pattern: Using queryBy for absence assertions
 */
describe('Absence Testing Pattern', () => {
  it('demonstrates queryBy for element absence', () => {
    render(<ExampleComponent />);

    // queryBy returns null if not found (doesn't throw)
    expect(screen.queryByText('Not Present')).not.toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
`;
  }

  writeFiles() {
    if (this.options.dryRun) {
      console.log('\n📋 Dry run - no files written');
      return;
    }

    console.log('\n✍️  Writing files...');

    this.files.forEach(file => {
      const fullPath = path.join(this.projectPath, file.path);
      const dir = path.dirname(fullPath);

      // Create directory if needed
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, file.content, 'utf-8');
      console.log(`  ✓ ${file.path}`);
    });
  }

  updatePackageJson() {
    if (this.options.dryRun) return;

    console.log('\n📦 Checking dependencies...');

    const requiredDeps = {
      '@testing-library/react-native': '^12.0.0',
      '@testing-library/jest-native': '^5.0.0',
      jest: '^29.0.0',
    };

    if (this.options.withMsw) {
      requiredDeps['msw'] = '^2.0.0';
    }

    const devDeps = this.packageJson.devDependencies || {};
    const missingDeps = Object.entries(requiredDeps).filter(([dep]) => !devDeps[dep]);

    if (missingDeps.length > 0) {
      console.log('\n⚠️  Missing dependencies detected. Run:');
      console.log(`  npm install --save-dev ${missingDeps.map(([d]) => d).join(' ')}`);
    } else {
      console.log('  ✓ All required dependencies present');
    }

    // Update scripts
    const scripts = this.packageJson.scripts || {};
    const suggestedScripts = {
      test: 'jest',
      'test:watch': 'jest --watch',
      'test:coverage': 'jest --coverage',
      'test:ci': 'jest --ci --coverage --maxWorkers=2',
    };

    const missingScripts = Object.entries(suggestedScripts).filter(([name]) => !scripts[name]);

    if (missingScripts.length > 0) {
      console.log('\n💡 Suggested scripts to add to package.json:');
      missingScripts.forEach(([name, cmd]) => {
        console.log(`  "${name}": "${cmd}"`);
      });
    }
  }

  printInstructions() {
    console.log('\n' + '='.repeat(50));
    console.log('NEXT STEPS');
    console.log('='.repeat(50));

    console.log(`
1. Install dependencies:
   npm install --save-dev @testing-library/react-native @testing-library/jest-native${this.options.withMsw ? ' msw' : ''}

2. Run the example test:
   npm test

3. Generate tests for your components:
   node scripts/component-test-generator.js src/components/YourComponent.tsx

4. Check test coverage:
   npm run test:coverage

5. Review and customize:
   - jest.config.${this.useTypeScript ? 'ts' : 'js'}: Adjust module paths, coverage thresholds
   - jest-setup.${this.useTypeScript ? 'ts' : 'js'}: Add more native module mocks as needed
${this.options.withProviders ? `   - src/test-utils.tsx: Configure your providers` : ''}
${this.options.withMsw ? `   - src/mocks/handlers.ts: Add your API mock handlers` : ''}
`);
  }
}

// CLI Entry Point
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
React Native Test Suite Scaffolder

Usage:
  node test-suite-scaffolder.js <project-path> [options]

Options:
  --with-msw         Include MSW for API mocking
  --with-providers   Include custom render with providers
  --dry-run          Preview changes without writing files
  --force            Overwrite existing files
  --verbose, -v      Enable verbose output
  --help, -h         Show this help message

Examples:
  node test-suite-scaffolder.js .
  node test-suite-scaffolder.js ./my-app --with-msw --with-providers
  node test-suite-scaffolder.js . --dry-run --verbose
`);
    process.exit(0);
  }

  const projectPath = args[0];
  const options = {
    withMsw: args.includes('--with-msw'),
    withProviders: args.includes('--with-providers'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  const scaffolder = new TestSuiteScaffolder(projectPath, options);
  scaffolder.run();
}

main();
