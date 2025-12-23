# React Native Testing Best Practices

## Overview

This guide covers best practices for testing React Native applications, including project setup, test organization, mocking strategies, and CI/CD integration.

## Project Setup

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',

  // Setup files run before each test file
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },

  // Transform configuration
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library|react-native-.*)/)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
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

  // Test timeout
  testTimeout: 10000,

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/*.test.{ts,tsx}',
  ],
};
```

### Jest Setup File

```typescript
// jest-setup.ts
import '@testing-library/react-native/extend-expect';

// Suppress specific warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes('act() warning')) return;
  originalWarn.apply(console, args);
};

// Mock native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Global test timeout
jest.setTimeout(10000);
```

### Test Utilities File

```typescript
// test-utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './providers/ThemeProvider';
import { AuthProvider } from './providers/AuthProvider';

// Create a new QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark';
  user?: User | null;
  initialRoute?: string;
}

function customRender(
  ui: ReactElement,
  {
    theme = 'light',
    user = null,
    initialRoute = '/',
    ...options
  }: CustomRenderOptions = {}
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <AuthProvider initialUser={user}>
            <NavigationContainer>
              {children}
            </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

// Re-export everything from testing library
export * from '@testing-library/react-native';
export { customRender as render };
```

## Test Organization

### Directory Structure

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   └── Form/
│       ├── Form.tsx
│       ├── Form.test.tsx
│       └── index.ts
├── screens/
│   ├── Home/
│   │   ├── HomeScreen.tsx
│   │   ├── HomeScreen.test.tsx
│   │   └── index.ts
│   └── Profile/
│       ├── ProfileScreen.tsx
│       ├── ProfileScreen.test.tsx
│       └── index.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useAuth.test.ts
│   └── index.ts
├── utils/
│   ├── validation.ts
│   ├── validation.test.ts
│   └── index.ts
└── __tests__/
    ├── integration/
    │   └── auth-flow.test.tsx
    └── e2e/
        └── user-journey.test.tsx
```

### Test File Naming

```
# Component tests - co-located
Button.test.tsx
Button.spec.tsx

# Integration tests - in __tests__ folder
__tests__/integration/auth-flow.test.tsx

# Snapshot tests
Button.snapshot.test.tsx

# Type: unit, integration, e2e
user.unit.test.ts
auth.integration.test.tsx
checkout.e2e.test.tsx
```

### Test Structure Template

```typescript
// ComponentName.test.tsx
import { render, screen, userEvent } from '@/test-utils';
import { ComponentName } from './ComponentName';

// Mock dependencies at top
jest.mock('@/hooks/useAuth');

describe('ComponentName', () => {
  // Shared setup
  const defaultProps = {
    prop1: 'value1',
    prop2: 'value2',
  };

  const mockCallback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Group: Rendering tests
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<ComponentName {...defaultProps} />);
      // assertions
    });

    it('renders with specific condition', () => {
      // test specific render state
    });
  });

  // Group: Interaction tests
  describe('user interactions', () => {
    it('handles button click', async () => {
      const user = userEvent.setup();
      render(<ComponentName {...defaultProps} onPress={mockCallback} />);
      // interaction test
    });
  });

  // Group: Edge cases
  describe('edge cases', () => {
    it('handles empty data', () => {
      // edge case test
    });
  });
});
```

## Mocking Strategies

### Mocking API Calls with MSW

```typescript
// mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        id,
        name: 'John Doe',
        email: 'john@example.com',
      })
    );
  }),

  rest.post('/api/auth/login', async (req, res, ctx) => {
    const { email, password } = await req.json();

    if (email === 'test@example.com' && password === 'password') {
      return res(
        ctx.json({
          token: 'mock-jwt-token',
          user: { id: '1', email },
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    );
  }),
];

// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// jest-setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Mocking Modules

```typescript
// Mock entire module
jest.mock('@/api/userService');

import { fetchUser } from '@/api/userService';

test('uses mocked service', () => {
  (fetchUser as jest.Mock).mockResolvedValue({ name: 'John' });
  // test code
});

// Mock specific functions
jest.mock('@/utils/analytics', () => ({
  ...jest.requireActual('@/utils/analytics'),
  trackEvent: jest.fn(),
}));

// Mock with factory function
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: '1', name: 'Test User' },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
  })),
}));
```

### Mocking Native Modules

```typescript
// jest-setup.ts

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
  Swipeable: 'Swipeable',
  DrawerLayout: 'DrawerLayout',
  State: {},
  PanGestureHandler: 'PanGestureHandler',
  BaseButton: 'BaseButton',
  Directions: {},
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
```

### Mocking Hooks

```typescript
// Testing hook with renderHook
import { renderHook, waitFor } from '@testing-library/react-native';
import { useCounter } from './useCounter';

test('useCounter increments', () => {
  const { result } = renderHook(() => useCounter());

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

// Mocking custom hook for component tests
jest.mock('./useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    login: jest.fn(),
  }),
}));
```

## Debugging Techniques

### Using screen.debug()

```typescript
test('debugging render output', () => {
  render(<ComplexComponent />);

  // Print entire tree
  screen.debug();

  // Print specific element
  screen.debug(screen.getByTestId('my-element'));

  // Print with depth limit
  screen.debug(undefined, { depth: 10 });

  // Print max characters
  screen.debug(undefined, { maxLength: 50000 });
});
```

### Using jest-native Matchers

```typescript
// Check element state
expect(element).toBeEnabled();
expect(element).toBeDisabled();
expect(element).toBeVisible();

// Check text content
expect(element).toHaveTextContent('Hello');
expect(element).toHaveTextContent(/hello/i);

// Check styles
expect(element).toHaveStyle({ backgroundColor: 'red' });

// Check accessibility
expect(element).toHaveAccessibilityState({ checked: true });
expect(element).toHaveAccessibilityValue({ now: 50 });
```

### Handling Flaky Tests

```typescript
// Increase timeout for slow tests
test('slow async operation', async () => {
  // ...
}, 30000);

// Use waitFor with custom timeout
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeOnTheScreen();
}, { timeout: 5000 });

// Retry flaky assertions
await waitFor(
  () => expect(screen.getByText('Data')).toBeOnTheScreen(),
  { timeout: 5000, interval: 100 }
);
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run typecheck

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test -- --coverage --ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
```

### Pre-commit Hooks

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "jest --bail --findRelatedTests"
    ]
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  }
}
```

## Coverage Guidelines

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Per-file thresholds
    './src/utils/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/types/**',
  ],
};
```

### What to Cover

**High Priority (90%+):**
- Business logic
- Utility functions
- Custom hooks
- API service functions

**Medium Priority (70-80%):**
- Complex components
- Forms with validation
- Interactive components

**Lower Priority (50-70%):**
- Simple presentational components
- Layout components
- Wrappers/HOCs

## Resources

- [React Native Testing Library Docs](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles)
