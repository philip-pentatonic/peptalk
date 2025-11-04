# @peptalk/ui

Shared React component library and design system for PepTalk.

## Purpose

This package provides:
- Reusable UI components built with Radix UI
- Tailwind CSS utilities and theme configuration
- Type-safe component APIs
- Storybook documentation
- Accessibility-first design

## Components

### Layout

- **Container** - Responsive content container
- **Stack** - Vertical spacing utility
- **Grid** - Responsive grid layout

### Typography

- **Heading** - Semantic headings (h1-h6)
- **Text** - Body text with variants
- **Code** - Inline code snippets

### Navigation

- **Button** - Primary, secondary, ghost variants
- **Link** - Styled Next.js Link wrapper
- **Tabs** - Radix UI tabs component

### Forms

- **Input** - Text input with validation states
- **Select** - Dropdown select (Radix UI)
- **Checkbox** - Checkbox input
- **Label** - Form label

### Feedback

- **Alert** - Success, error, warning, info alerts
- **Badge** - Small status indicators
- **Spinner** - Loading indicator

### Overlays

- **Dialog** - Modal dialog (Radix UI)
- **Dropdown** - Dropdown menu (Radix UI)
- **Tooltip** - Hover tooltip

### Data Display

- **Card** - Content card with header/body/footer
- **Table** - Responsive data table
- **PeptideCard** - Peptide list item card
- **StudyCard** - Research study card
- **EvidenceGradeBadge** - Evidence grade indicator

## Quick Start

### Installation

This package is automatically available in the monorepo:

```json
{
  "dependencies": {
    "@peptalk/ui": "workspace:*"
  }
}
```

### Basic Usage

```typescript
import { Button, Card, Heading } from '@peptalk/ui'

export default function Page() {
  return (
    <Card>
      <Heading level={2}>Welcome to PepTalk</Heading>
      <Button variant="primary" onClick={() => console.log('clicked')}>
        Get Started
      </Button>
    </Card>
  )
}
```

## Component API

### Button

```typescript
import { Button } from '@peptalk/ui'

<Button
  variant="primary" | "secondary" | "ghost" | "danger"
  size="sm" | "md" | "lg"
  disabled={false}
  loading={false}
  onClick={() => {}}
>
  Click Me
</Button>
```

**Variants:**
- `primary` - Blue background, white text
- `secondary` - Gray background, dark text
- `ghost` - Transparent, hover effect
- `danger` - Red background, white text

**Sizes:**
- `sm` - Small (32px height)
- `md` - Medium (40px height, default)
- `lg` - Large (48px height)

### Card

```typescript
import { Card } from '@peptalk/ui'

<Card>
  <Card.Header>
    <Heading level={3}>Card Title</Heading>
  </Card.Header>
  <Card.Body>
    <Text>Card content goes here</Text>
  </Card.Body>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

### Heading

```typescript
import { Heading } from '@peptalk/ui'

<Heading
  level={1 | 2 | 3 | 4 | 5 | 6}
  as="h1" | "h2" | "h3" | "h4" | "h5" | "h6"
>
  Heading Text
</Heading>
```

**Level** determines styling, **as** determines semantic HTML tag.

### Text

```typescript
import { Text } from '@peptalk/ui'

<Text
  size="xs" | "sm" | "base" | "lg" | "xl"
  weight="normal" | "medium" | "semibold" | "bold"
  color="default" | "muted" | "error" | "success"
>
  Body text
</Text>
```

### Input

```typescript
import { Input } from '@peptalk/ui'

<Input
  type="text" | "email" | "password" | "search"
  placeholder="Enter text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
  error={errorMessage}
  disabled={false}
/>
```

### Select

```typescript
import { Select } from '@peptalk/ui'

<Select
  value={value}
  onValueChange={setValue}
  placeholder="Select option..."
>
  <Select.Item value="option1">Option 1</Select.Item>
  <Select.Item value="option2">Option 2</Select.Item>
</Select>
```

### Dialog

```typescript
import { Dialog } from '@peptalk/ui'

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <Dialog.Trigger asChild>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Dialog Title</Dialog.Title>
      <Dialog.Description>Dialog description</Dialog.Description>
    </Dialog.Header>
    <div>Dialog body content</div>
    <Dialog.Footer>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

### Alert

```typescript
import { Alert } from '@peptalk/ui'

<Alert variant="success" | "error" | "warning" | "info">
  <Alert.Title>Alert Title</Alert.Title>
  <Alert.Description>Alert message text</Alert.Description>
</Alert>
```

### PeptideCard

```typescript
import { PeptideCard } from '@peptalk/ui'

<PeptideCard
  slug="bpc-157"
  name="BPC-157"
  aliases={['Body Protection Compound']}
  evidenceGrade="moderate"
  humanRctCount={5}
  animalCount={23}
  excerpt="BPC-157 is a synthetic peptide derived from..."
  onClick={() => router.push('/peptides/bpc-157')}
/>
```

### EvidenceGradeBadge

```typescript
import { EvidenceGradeBadge } from '@peptalk/ui'

<EvidenceGradeBadge grade="very_low" | "low" | "moderate" | "high" />
```

**Visual Mapping:**
- `very_low` - Gray badge
- `low` - Yellow badge
- `moderate` - Blue badge
- `high` - Green badge

## Design Tokens

### Colors

```typescript
// Tailwind classes available:
'bg-primary-500'    // Primary blue
'bg-secondary-500'  // Secondary gray
'bg-success-500'    // Green
'bg-error-500'      // Red
'bg-warning-500'    // Yellow
'bg-info-500'       // Blue
```

### Spacing

```typescript
// Tailwind spacing scale (4px base):
'p-1'  // 4px
'p-2'  // 8px
'p-4'  // 16px
'p-6'  // 24px
'p-8'  // 32px
```

### Typography

```typescript
// Font sizes:
'text-xs'    // 12px
'text-sm'    // 14px
'text-base'  // 16px
'text-lg'    // 18px
'text-xl'    // 20px
'text-2xl'   // 24px
'text-3xl'   // 30px
'text-4xl'   // 36px
```

## Theming

### Dark Mode

All components support dark mode via Tailwind's `dark:` prefix:

```typescript
<div className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-gray-100">
    Adapts to theme
  </Text>
</div>
```

### Custom Theme

Extend Tailwind config in your app:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#0066cc',
          // ... other shades
        }
      }
    }
  }
}
```

## Storybook

View all components in Storybook:

```bash
pnpm storybook
```

Access at http://localhost:6006

### Writing Stories

```typescript
// src/components/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs']
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button'
  }
}
```

## Testing

### Component Tests

```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    screen.getByText('Click me').click()
    expect(onClick).toHaveBeenCalled()
  })
})
```

## Accessibility

All components follow WAI-ARIA guidelines:

- **Keyboard navigation** - Full keyboard support
- **Screen reader** - Proper ARIA labels and roles
- **Focus management** - Visible focus indicators
- **Color contrast** - WCAG AA compliant

### Example: Dialog

```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <Dialog.Content
    aria-labelledby="dialog-title"
    aria-describedby="dialog-description"
  >
    <Dialog.Title id="dialog-title">Accessible Dialog</Dialog.Title>
    <Dialog.Description id="dialog-description">
      Screen readers will announce this description
    </Dialog.Description>
  </Dialog.Content>
</Dialog>
```

## Performance

### Code Splitting

Import components individually to enable tree-shaking:

```typescript
// Good (tree-shakeable)
import { Button } from '@peptalk/ui'

// Avoid (imports entire library)
import * as UI from '@peptalk/ui'
```

### Server Components

Most components are client components. Mark with `'use client'` when needed:

```typescript
'use client'

import { Button } from '@peptalk/ui'

export default function ClientComponent() {
  return <Button onClick={() => console.log('clicked')}>Click</Button>
}
```

## File Structure

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Button.stories.tsx
│   │   ├── Button.test.tsx
│   │   ├── Card.tsx
│   │   ├── Heading.tsx
│   │   ├── Input.tsx
│   │   ├── PeptideCard.tsx
│   │   └── EvidenceGradeBadge.tsx
│   ├── utils/
│   │   └── cn.ts              # Tailwind class merging utility
│   └── index.ts               # Main exports
├── .storybook/
│   ├── main.ts                # Storybook config
│   └── preview.ts             # Global decorators
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Development

### Adding New Components

1. Create component in `src/components/`
2. Export from `src/index.ts`
3. Write Storybook story
4. Write tests
5. Update this README

Example:

```typescript
// src/components/NewComponent.tsx
import { cn } from '../utils/cn'

interface NewComponentProps {
  children: React.ReactNode
  className?: string
}

export function NewComponent({ children, className }: NewComponentProps) {
  return (
    <div className={cn('base-classes', className)}>
      {children}
    </div>
  )
}
```

## Utilities

### cn (Class Name Merger)

Utility for merging Tailwind classes:

```typescript
import { cn } from '@peptalk/ui'

const className = cn(
  'base-class',
  conditional && 'conditional-class',
  props.className // User-provided classes override defaults
)
```

Uses `clsx` + `tailwind-merge` to prevent conflicts.

## Related Documentation

- [docs/code-standards.md](../../docs/code-standards.md) - Component standards
- [Radix UI Docs](https://www.radix-ui.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Storybook Docs](https://storybook.js.org/)
