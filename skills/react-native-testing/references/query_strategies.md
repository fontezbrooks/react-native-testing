# Query Strategies for React Native Testing Library

## Overview

This guide provides comprehensive strategies for selecting and using queries in React Native Testing Library. The right query choice improves test reliability, accessibility compliance, and maintainability.

## Query Selection Framework

### Priority Order (Accessibility-First)

| Priority | Query Type | Use Case | Example |
|----------|------------|----------|---------|
| 1 | `*ByRole` | Interactive elements with semantic roles | Buttons, headers, switches |
| 2 | `*ByLabelText` | Form inputs with labels | TextInput with aria-label |
| 3 | `*ByPlaceholderText` | Inputs with descriptive placeholders | Search inputs |
| 4 | `*ByText` | Visible text content | Labels, descriptions |
| 5 | `*ByDisplayValue` | Current input values | Filled form fields |
| 6 | `*ByHintText` | Accessibility hints | Additional context |
| 7 | `*ByTestId` | Last resort escape hatch | Complex third-party components |

### Query Variant Selection

```
Is the element currently on screen?
├── YES, and it MUST exist → getBy*
├── YES, but it MIGHT not exist → queryBy*
├── NO, but it WILL appear after async operation → findBy*
└── MULTIPLE elements expected → getAllBy*, queryAllBy*, findAllBy*
```

## Detailed Query Patterns

### Pattern 1: Role-Based Queries (Recommended)

**When to Use:**
- Testing buttons, links, headings, switches
- Elements with semantic meaning
- Accessibility-critical components

**Implementation:**

```typescript
// Button with text content provides accessible name
<Pressable role="button">
  <Text>Submit</Text>
</Pressable>

// Query by role and accessible name
screen.getByRole('button', { name: 'Submit' })

// Switch with aria-label
<Switch value={true} aria-label="Enable notifications" />

screen.getByRole('switch', { name: 'Enable notifications' })

// Heading with explicit role
<Text role="heading">Welcome</Text>

screen.getByRole('heading', { name: 'Welcome' })
```

**Available Roles:**
- `button`, `link`, `checkbox`, `radio`
- `switch`, `slider`, `spinbutton`
- `textbox`, `searchbox`, `combobox`
- `heading`, `img`, `menu`, `menuitem`
- `tab`, `tablist`, `tabpanel`
- `alert`, `alertdialog`, `dialog`
- `list`, `listitem`, `tree`, `treeitem`
- `progressbar`, `scrollbar`, `separator`

### Pattern 2: Label-Based Queries

**When to Use:**
- Form inputs with associated labels
- Accessibility-labeled elements
- Screen reader compatible components

**Implementation:**

```typescript
// Using aria-label (web standard)
<TextInput aria-label="Email address" />

screen.getByLabelText('Email address')

// Using accessibilityLabel (React Native specific)
<TextInput accessibilityLabel="Email address" />

screen.getByLabelText('Email address')

// Both work with the same query
screen.getByLabelText('Email address')
```

### Pattern 3: Text-Based Queries

**When to Use:**
- Static text content
- Labels and descriptions
- Non-interactive text elements

**Implementation:**

```typescript
// Exact text match
screen.getByText('Welcome to the app')

// Case-insensitive regex
screen.getByText(/welcome/i)

// Partial match with regex
screen.getByText(/welcome to/i)

// Using function matcher for complex cases
screen.getByText((text, element) => {
  return text.startsWith('Price:') && text.includes('$');
})
```

### Pattern 4: Placeholder Queries

**When to Use:**
- Inputs with descriptive placeholder text
- Search fields
- Empty state inputs

**Implementation:**

```typescript
<TextInput placeholder="Enter your email" />

screen.getByPlaceholderText('Enter your email')

// Partial match
screen.getByPlaceholderText(/email/i)
```

### Pattern 5: Display Value Queries

**When to Use:**
- Testing current input values
- Verifying form state
- Asserting input content

**Implementation:**

```typescript
<TextInput value="john@example.com" />

// Find by current value
screen.getByDisplayValue('john@example.com')

// Useful for assertions
expect(screen.getByDisplayValue('john@example.com')).toBeOnTheScreen()
```

### Pattern 6: Test ID Queries (Last Resort)

**When to Use:**
- Third-party components without accessibility
- Complex nested structures
- Fallback when other queries fail

**Implementation:**

```typescript
// Only use when no accessible query works
<View testID="custom-component">
  <ThirdPartyWidget />
</View>

screen.getByTestId('custom-component')
```

**When to Avoid:**
- When role queries work
- When text/label queries work
- For standard React Native components

## Advanced Query Techniques

### Combining Queries with Predicates

```typescript
// Role with name predicate
screen.getByRole('button', { name: 'Submit' })

// Role with multiple predicates
screen.getByRole('checkbox', { name: 'Remember me', checked: true })

// Role with disabled state
screen.getByRole('button', { name: 'Submit', disabled: true })
```

### Querying Within Containers

```typescript
import { within } from '@testing-library/react-native';

// Get a container element
const form = screen.getByTestId('login-form');

// Query within that container
const submitButton = within(form).getByRole('button', { name: 'Submit' });
const emailInput = within(form).getByLabelText('Email');
```

### Handling Multiple Elements

```typescript
// Get all items in a list
const items = screen.getAllByRole('listitem');
expect(items).toHaveLength(5);

// Query specific item from array
const firstItem = items[0];
const lastItem = items[items.length - 1];

// Query all then filter
const buttons = screen.getAllByRole('button');
const submitButtons = buttons.filter(btn =>
  btn.props.accessibilityLabel?.includes('submit')
);
```

## Query Variant Deep Dive

### getBy* - Synchronous, Must Exist

```typescript
// Throws if not found
const button = screen.getByRole('button', { name: 'Submit' });

// Throws if multiple found
// Use getAllBy* for multiple elements

// Best for: Elements that must exist at render time
test('renders submit button', () => {
  render(<Form />);
  expect(screen.getByRole('button', { name: 'Submit' })).toBeOnTheScreen();
});
```

### queryBy* - Synchronous, May Not Exist

```typescript
// Returns null if not found (no error)
const modal = screen.queryByRole('dialog');

// Perfect for asserting absence
expect(screen.queryByText('Error')).not.toBeOnTheScreen();
expect(screen.queryByRole('alert')).toBeNull();

// Best for: Testing element absence
test('does not show error initially', () => {
  render(<Form />);
  expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
});
```

### findBy* - Asynchronous, Waits for Element

```typescript
// Returns Promise, waits for element to appear
const successMessage = await screen.findByText('Success!');

// With custom timeout
const result = await screen.findByText('Loaded', { timeout: 5000 });

// Best for: Elements appearing after async operations
test('shows success after submission', async () => {
  const user = userEvent.setup();
  render(<Form />);

  await user.press(screen.getByRole('button', { name: 'Submit' }));

  expect(await screen.findByText('Success!')).toBeOnTheScreen();
});
```

## Decision Matrix

| Scenario | Query | Variant |
|----------|-------|---------|
| Button on screen | `getByRole('button', { name: 'X' })` | getBy |
| Header text | `getByRole('heading', { name: 'X' })` | getBy |
| Form input | `getByLabelText('X')` | getBy |
| Search field | `getByPlaceholderText('X')` | getBy |
| Element that may not exist | `queryByText('X')` | queryBy |
| Element after async action | `findByText('X')` | findBy |
| Multiple list items | `getAllByRole('listitem')` | getAllBy |
| Modal after button press | `findByRole('dialog')` | findBy |
| Error message absence | `queryByRole('alert')` | queryBy |

## Performance Considerations

### Efficient Query Patterns

```typescript
// Good - Query once, reuse reference
const button = screen.getByRole('button', { name: 'Submit' });
expect(button).toBeEnabled();
expect(button).toHaveStyle({ backgroundColor: 'blue' });

// Avoid - Multiple queries for same element
expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
expect(screen.getByRole('button', { name: 'Submit' })).toHaveStyle({ backgroundColor: 'blue' });
```

### Reducing Query Scope

```typescript
// Good - Narrow scope first
const form = screen.getByTestId('login-form');
const submitButton = within(form).getByRole('button', { name: 'Submit' });

// Slower - Searching entire document
const submitButton = screen.getByRole('button', { name: 'Submit' });
```

## Debugging Queries

### Using screen.debug()

```typescript
// Print entire rendered output
screen.debug();

// Print specific element
screen.debug(screen.getByTestId('my-component'));

// Log to specific depth
screen.debug(undefined, { depth: 10 });
```

### Understanding Query Errors

```typescript
// Error: Unable to find element
// → Element doesn't exist, check render output with screen.debug()

// Error: Found multiple elements
// → Make query more specific or use getAllBy*

// Error: Timeout waiting for element
// → Check async operations complete, increase timeout
```

## Resources

- [RNTL Query Documentation](https://callstack.github.io/react-native-testing-library/docs/api/queries)
- [Accessibility Roles Reference](https://reactnative.dev/docs/accessibility#accessibilityrole)
- [Testing Library Query Priority](https://testing-library.com/docs/queries/about#priority)
