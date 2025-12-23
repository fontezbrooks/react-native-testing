# React Native Testing Patterns

## Overview

This guide provides comprehensive testing patterns for common React Native component types and scenarios.

## Component Testing Patterns

### Pattern 1: Basic Component Testing

**Description:**
Testing simple components that render UI based on props.

**When to Use:**
- Presentational components
- Components with minimal logic
- Stateless functional components

**Implementation:**

```typescript
// Component: Greeting.tsx
function Greeting({ name = 'World' }: { name?: string }) {
  return (
    <View>
      <Text role="heading">Hello, {name}!</Text>
    </View>
  );
}

// Test: Greeting.test.tsx
import { render, screen } from '@testing-library/react-native';

describe('Greeting', () => {
  it('renders with default name', () => {
    render(<Greeting />);
    expect(screen.getByRole('heading', { name: 'Hello, World!' })).toBeOnTheScreen();
  });

  it('renders with custom name', () => {
    render(<Greeting name="John" />);
    expect(screen.getByRole('heading', { name: 'Hello, John!' })).toBeOnTheScreen();
  });
});
```

### Pattern 2: Interactive Component Testing

**Description:**
Testing components that respond to user interactions.

**When to Use:**
- Buttons, forms, toggles
- Components with click handlers
- Interactive UI elements

**Implementation:**

```typescript
// Component: Counter.tsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Pressable role="button" onPress={() => setCount(c => c + 1)}>
        <Text>Increment</Text>
      </Pressable>
      <Pressable role="button" onPress={() => setCount(c => c - 1)}>
        <Text>Decrement</Text>
      </Pressable>
    </View>
  );
}

// Test: Counter.test.tsx
import { render, screen, userEvent } from '@testing-library/react-native';

describe('Counter', () => {
  it('starts at zero', () => {
    render(<Counter />);
    expect(screen.getByText('Count: 0')).toBeOnTheScreen();
  });

  it('increments when button pressed', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.press(screen.getByRole('button', { name: 'Increment' }));

    expect(screen.getByText('Count: 1')).toBeOnTheScreen();
  });

  it('decrements when button pressed', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    await user.press(screen.getByRole('button', { name: 'Decrement' }));

    expect(screen.getByText('Count: -1')).toBeOnTheScreen();
  });
});
```

### Pattern 3: Form Component Testing

**Description:**
Testing form inputs, validation, and submission.

**When to Use:**
- Login/registration forms
- Search inputs
- Data entry components

**Implementation:**

```typescript
// Component: LoginForm.tsx
function LoginForm({ onSubmit }: { onSubmit: (data: { email: string; password: string }) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!email || !password) {
      setError('All fields are required');
      return;
    }
    if (!email.includes('@')) {
      setError('Invalid email format');
      return;
    }
    onSubmit({ email, password });
  };

  return (
    <View>
      {error && <Text role="alert">{error}</Text>}

      <TextInput
        aria-label="Email"
        placeholder="Enter email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <TextInput
        aria-label="Password"
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable role="button" onPress={handleSubmit}>
        <Text>Login</Text>
      </Pressable>
    </View>
  );
}

// Test: LoginForm.test.tsx
describe('LoginForm', () => {
  const mockSubmit = jest.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it('shows error when submitting empty form', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockSubmit} />);

    await user.press(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByRole('alert')).toHaveTextContent('All fields are required');
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('shows error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'invalid-email');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.press(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email format');
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.press(screen.getByRole('button', { name: 'Login' }));

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('displays current input values', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');

    expect(screen.getByLabelText('Email')).toHaveDisplayValue('test@example.com');
  });
});
```

### Pattern 4: Async Data Fetching

**Description:**
Testing components that fetch data asynchronously.

**When to Use:**
- API-driven components
- Data loading scenarios
- Components with loading states

**Implementation:**

```typescript
// Component: UserProfile.tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text role="alert">Error: {error}</Text>;

  return (
    <View>
      <Text role="heading">{user.name}</Text>
      <Text>Email: {user.email}</Text>
    </View>
  );
}

// Test: UserProfile.test.tsx
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react-native';

// Mock the API
jest.mock('./api', () => ({
  fetchUser: jest.fn(),
}));

describe('UserProfile', () => {
  it('shows loading state initially', () => {
    (fetchUser as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<UserProfile userId="123" />);

    expect(screen.getByText('Loading...')).toBeOnTheScreen();
  });

  it('displays user data after loading', async () => {
    (fetchUser as jest.Mock).mockResolvedValue({
      name: 'John Doe',
      email: 'john@example.com',
    });

    render(<UserProfile userId="123" />);

    await waitForElementToBeRemoved(() => screen.getByText('Loading...'));

    expect(screen.getByRole('heading', { name: 'John Doe' })).toBeOnTheScreen();
    expect(screen.getByText('Email: john@example.com')).toBeOnTheScreen();
  });

  it('displays error on fetch failure', async () => {
    (fetchUser as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<UserProfile userId="123" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Error: Network error');
  });
});
```

### Pattern 5: List Component Testing

**Description:**
Testing FlatList, SectionList, and other list components.

**When to Use:**
- FlatList components
- SectionList components
- Scrollable lists

**Implementation:**

```typescript
// Component: TodoList.tsx
function TodoList({ items, onToggle, onDelete }) {
  return (
    <FlatList
      testID="todo-list"
      data={items}
      keyExtractor={item => item.id}
      ListEmptyComponent={<Text>No todos yet</Text>}
      renderItem={({ item }) => (
        <View testID="todo-item">
          <Pressable role="checkbox" onPress={() => onToggle(item.id)}>
            <Text>{item.completed ? '✓' : '○'}</Text>
          </Pressable>
          <Text>{item.title}</Text>
          <Pressable role="button" onPress={() => onDelete(item.id)}>
            <Text>Delete</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

// Test: TodoList.test.tsx
describe('TodoList', () => {
  const mockItems = [
    { id: '1', title: 'Buy groceries', completed: false },
    { id: '2', title: 'Clean house', completed: true },
  ];
  const mockToggle = jest.fn();
  const mockDelete = jest.fn();

  beforeEach(() => {
    mockToggle.mockClear();
    mockDelete.mockClear();
  });

  it('shows empty state when no items', () => {
    render(<TodoList items={[]} onToggle={mockToggle} onDelete={mockDelete} />);

    expect(screen.getByText('No todos yet')).toBeOnTheScreen();
  });

  it('renders all items', () => {
    render(<TodoList items={mockItems} onToggle={mockToggle} onDelete={mockDelete} />);

    expect(screen.getAllByTestId('todo-item')).toHaveLength(2);
    expect(screen.getByText('Buy groceries')).toBeOnTheScreen();
    expect(screen.getByText('Clean house')).toBeOnTheScreen();
  });

  it('calls onToggle when checkbox pressed', async () => {
    const user = userEvent.setup();
    render(<TodoList items={mockItems} onToggle={mockToggle} onDelete={mockDelete} />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.press(checkboxes[0]);

    expect(mockToggle).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete pressed', async () => {
    const user = userEvent.setup();
    render(<TodoList items={mockItems} onToggle={mockToggle} onDelete={mockDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.press(deleteButtons[0]);

    expect(mockDelete).toHaveBeenCalledWith('1');
  });
});
```

### Pattern 6: Modal/Dialog Testing

**Description:**
Testing modal components with open/close behavior.

**When to Use:**
- Modal dialogs
- Bottom sheets
- Confirmation dialogs

**Implementation:**

```typescript
// Component: ConfirmDialog.tsx
function ConfirmDialog({ visible, title, message, onConfirm, onCancel }) {
  if (!visible) return null;

  return (
    <View role="dialog" aria-label={title}>
      <Text role="heading">{title}</Text>
      <Text>{message}</Text>
      <Pressable role="button" onPress={onCancel}>
        <Text>Cancel</Text>
      </Pressable>
      <Pressable role="button" onPress={onConfirm}>
        <Text>Confirm</Text>
      </Pressable>
    </View>
  );
}

// Test: ConfirmDialog.test.tsx
describe('ConfirmDialog', () => {
  const mockConfirm = jest.fn();
  const mockCancel = jest.fn();

  beforeEach(() => {
    mockConfirm.mockClear();
    mockCancel.mockClear();
  });

  it('renders nothing when not visible', () => {
    render(
      <ConfirmDialog
        visible={false}
        title="Delete?"
        message="Are you sure?"
        onConfirm={mockConfirm}
        onCancel={mockCancel}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeOnTheScreen();
  });

  it('renders dialog when visible', () => {
    render(
      <ConfirmDialog
        visible={true}
        title="Delete?"
        message="Are you sure?"
        onConfirm={mockConfirm}
        onCancel={mockCancel}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Delete?' })).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Delete?' })).toBeOnTheScreen();
    expect(screen.getByText('Are you sure?')).toBeOnTheScreen();
  });

  it('calls onConfirm when confirm button pressed', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        visible={true}
        title="Delete?"
        message="Are you sure?"
        onConfirm={mockConfirm}
        onCancel={mockCancel}
      />
    );

    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(mockConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button pressed', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        visible={true}
        title="Delete?"
        message="Are you sure?"
        onConfirm={mockConfirm}
        onCancel={mockCancel}
      />
    );

    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockCancel).toHaveBeenCalled();
  });
});
```

### Pattern 7: Context/Provider Testing

**Description:**
Testing components that consume React Context.

**When to Use:**
- Theme-aware components
- Auth-dependent components
- Components using global state

**Implementation:**

```typescript
// Context: ThemeContext.tsx
const ThemeContext = createContext({ theme: 'light' });

function ThemeProvider({ children, theme = 'light' }) {
  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Component: ThemedButton.tsx
function ThemedButton({ children }) {
  const { theme } = useContext(ThemeContext);
  return (
    <Pressable
      role="button"
      style={{ backgroundColor: theme === 'dark' ? '#333' : '#fff' }}
    >
      <Text>{children}</Text>
    </Pressable>
  );
}

// Test Utils: test-utils.tsx
function renderWithProviders(ui, { theme = 'light', ...options } = {}) {
  function Wrapper({ children }) {
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

// Test: ThemedButton.test.tsx
describe('ThemedButton', () => {
  it('renders with light theme styles', () => {
    renderWithProviders(<ThemedButton>Click Me</ThemedButton>, { theme: 'light' });

    expect(screen.getByRole('button', { name: 'Click Me' })).toHaveStyle({
      backgroundColor: '#fff',
    });
  });

  it('renders with dark theme styles', () => {
    renderWithProviders(<ThemedButton>Click Me</ThemedButton>, { theme: 'dark' });

    expect(screen.getByRole('button', { name: 'Click Me' })).toHaveStyle({
      backgroundColor: '#333',
    });
  });
});
```

### Pattern 8: Navigation Testing

**Description:**
Testing components with navigation behavior.

**When to Use:**
- Screen components
- Navigation flows
- Deep linking scenarios

**Implementation:**

```typescript
// Setup navigation for testing
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function TestNavigator({ initialRouteName = 'Home' }) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRouteName}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Test: Navigation.test.tsx
describe('Navigation', () => {
  it('navigates from Home to Details', async () => {
    const user = userEvent.setup();
    render(<TestNavigator />);

    expect(screen.getByRole('heading', { name: 'Home' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Go to Details' }));

    expect(await screen.findByRole('heading', { name: 'Details' })).toBeOnTheScreen();
  });

  it('can navigate back', async () => {
    const user = userEvent.setup();
    render(<TestNavigator initialRouteName="Details" />);

    expect(screen.getByRole('heading', { name: 'Details' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Go Back' }));

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeOnTheScreen();
  });
});
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Testing Implementation Details

```typescript
// Bad - Testing internal state
expect(component.instance().state.isLoading).toBe(false);

// Good - Testing user-visible behavior
expect(screen.queryByText('Loading...')).not.toBeOnTheScreen();
```

### Anti-Pattern 2: Using Timeouts Instead of Proper Waiting

```typescript
// Bad - Arbitrary timeout
await new Promise(resolve => setTimeout(resolve, 1000));
expect(screen.getByText('Loaded')).toBeOnTheScreen();

// Good - Wait for specific element
expect(await screen.findByText('Loaded')).toBeOnTheScreen();
```

### Anti-Pattern 3: Not Cleaning Up After Tests

```typescript
// Bad - State leaks between tests
let component;
beforeEach(() => {
  component = render(<MyComponent />);
});
// Missing cleanup!

// Good - Cleanup happens automatically with render()
// Or explicitly with cleanup() if needed
import { cleanup } from '@testing-library/react-native';
afterEach(cleanup);
```

## Performance Tips

### Tip 1: Minimize Re-renders in Tests

```typescript
// Good - Single render, multiple assertions
render(<Component />);
expect(screen.getByText('A')).toBeOnTheScreen();
expect(screen.getByText('B')).toBeOnTheScreen();
expect(screen.getByText('C')).toBeOnTheScreen();

// Avoid - Multiple renders for same component
render(<Component />);
expect(screen.getByText('A')).toBeOnTheScreen();
cleanup();
render(<Component />);
expect(screen.getByText('B')).toBeOnTheScreen();
```

### Tip 2: Use findBy* for Async Instead of waitFor + getBy*

```typescript
// Good - findBy handles waiting internally
expect(await screen.findByText('Loaded')).toBeOnTheScreen();

// Less efficient - manual waitFor
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeOnTheScreen();
});
```

## Resources

- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
