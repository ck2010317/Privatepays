# CARD DESIGN SPECIFICATION

## 1. CARD IN DASHBOARD (Grid View)
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [Gradient Dark Background]      │   │
│  │ ╲                           ╱   │   │
│  │  ╲ (Violet/Purple Glow)    ╱    │   │
│  │   ╲                        ╱     │   │
│  │    ╲                      ╱      │   │
│  │                                   │   │
│  │  My Shopping Card          💳    │   │
│  │  ● ACTIVE                         │   │
│  │                                   │   │
│  │                                   │   │
│  │  CARD NUMBER                      │   │
│  │  •••• •••• •••• 4206              │   │
│  │                                   │   │
│  │  EXPIRY      CVV      BALANCE     │   │
│  │  ••/••       •••      $500.00     │   │
│  │                                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [View Full Details]  [Freeze]  [TopUp]│
└─────────────────────────────────────────┘
```

### Colors:
- Background: Dark gradient (gray-800 → gray-900 → black)
- Border: gray-700, hover turns violet-500/50
- Glow Effect: Violet & purple blur gradients
- Text: White (#ffffff)
- Labels: Gray (#9ca3af)
- Status Badge: Green (active), Blue (frozen)
- Icons: Violet (#a78bfa)

---

## 2. CARD DETAILS MODAL (Full Screen View)

### Header Section:
```
╔════════════════════════════════════════╗
║  My Shopping Card              [X]    ║
╚════════════════════════════════════════╝
```

### Large Card Display (in Modal):
```
┌──────────────────────────────────────────────────────────┐
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ [GRADIENT DARK BACKGROUND WITH GLOWS]              │ │
│  │  ◐╱                                            ╲◑  │ │
│  │   (Violet Glow Top-Right)            (Purple Glow) │ │
│  │                                                     │ │
│  │  My Shopping Card            ● ACTIVE              │ │
│  │                                                     │ │
│  │                                                     │ │
│  │  CARD NUMBER                                        │ │
│  │  4206 5678 9012 3456    [📋]                       │ │
│  │  (Monospace, Large, Bold)                          │ │
│  │                                                     │ │
│  │                                                     │ │
│  │     EXPIRY DATE              CVV                    │ │
│  │     12/28  [📋]              456  [📋]             │ │
│  │                                   BALANCE          │ │
│  │                                   $500.00          │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Card Design Details:
- **Aspect Ratio**: 1.586:1 (Standard credit card proportion)
- **Padding**: Large (32px inside)
- **Border Radius**: Rounded 3xl (very rounded corners)
- **Glows**:
  - Top-right: 384×384px violet glow (opacity 20%, blur 48px)
  - Bottom-left: 288×288px purple glow (opacity 20%, blur 48px)

### Card Content Layout:

#### Top Section:
```
┌─────────────────────────────────┐
│ Card Title           Status      │
│ "My Shopping Card"   ● ACTIVE    │
└─────────────────────────────────┘
```
- Left: Card title (2xl bold white)
- Right: Status badge
  - Active: Green (#10b981) with border
  - Frozen: Blue (#3b82f6) with border
  - Inactive: Gray (#6b7280) with border

#### Middle Section:
```
┌─────────────────────────────────┐
│ CARD NUMBER                      │
│ 4206 5678 9012 3456   [📋]     │
└─────────────────────────────────┘
```
- Monospace font, 3xl size, tracking-widest
- Full card number displayed
- Copy button (changes to ✓ when clicked)

#### Bottom Section:
```
┌──────────────────────────────────────┐
│  EXPIRY DATE          CVV   BALANCE  │
│  12/28 [📋]           456   $500.00  │
│                       [📋]           │
└──────────────────────────────────────┘
```
- Three columns:
  - **Expiry**: MM/YY format with copy button
  - **CVV**: 3-4 digits with copy button
  - **Balance**: Large green text, formatted currency

---

## 3. DETAILED INFO SECTION (Below Card)

### Show/Hide Sensitive Data Button:
```
┌─────────────────────────────────────────────┐
│  [👁️ Show Sensitive Data (Full Card Details)]│  
│  Gradient: Violet → Purple                  │
│  Hover: Darker violet                       │
└─────────────────────────────────────────────┘
```

### When HIDDEN:
Just shows the large card with masked numbers

### When VISIBLE - 4 Column Grid:

```
┌──────────────────┬──────────────────┐
│ FULL CARD NUMBER │ EXPIRY MONTH     │
│ 4206567890123456 │ 12               │
│ [📋]             │                  │
└──────────────────┴──────────────────┘
┌──────────────────┬──────────────────┐
│ EXPIRY YEAR      │ CVV/CVC          │
│ 2028             │ 456              │
│                  │ [📋]             │
└──────────────────┴──────────────────┘
```

Each field in a gray-800/50 box with border

---

## 4. CARD INFO SECTION (Bottom Grid)

### 4 Column Info Display:
```
┌────────────────┬────────────────┐
│ CARD ID        │ STATUS         │
│ cuid_abc123... │ ACTIVE (green) │
└────────────────┴────────────────┘
┌────────────────┬────────────────┐
│ CURRENT BALANCE│ CURRENCY       │
│ $500.00        │ USD            │
└────────────────┴────────────────┘
```

---

## 5. DASHBOARD CARD BUTTONS (Below Preview)

```
┌──────────────────────────────────────────┐
│ [View Full Details] [Freeze] [Top Up]   │
└──────────────────────────────────────────┘
```

### Button Specifications:

**View Full Details** (Primary Button):
- Width: flex-1 (takes remaining space)
- Height: 40px (h-10)
- Color: Gradient (violet-500 → purple-600)
- Hover: Darker gradient
- Icon: 📱 (Maximize2)
- Text: "View Full Details"
- Font Weight: Bold

**Freeze/Unfreeze** (Secondary Button):
- When Active (unfrozen):
  - Background: Blue 10% with border
  - Text: Blue-400
  - Icon: ❄️ Snowflake
  - Label: "Freeze"
- When Frozen:
  - Background: Green 10% with border
  - Text: Green-400
  - Icon: ☀️ Sun
  - Label: "Unfreeze"

**Top Up** (Tertiary Button):
- Background: Violet 10% with border
- Text: Violet-400
- Icon: 📈 TrendingUp
- Label: "Top Up"

---

## 6. COLOR PALETTE

### Primary Colors:
- **Violet**: #a78bfa (rgb(167, 139, 250))
- **Purple**: #9333ea (rgb(147, 51, 234))
- **Dark Background**: #111827 (gray-900)

### Status Colors:
- **Active**: #10b981 (emerald-500) - Green
- **Frozen**: #3b82f6 (blue-500) - Blue
- **Inactive**: #6b7280 (gray-500) - Gray

### Text Colors:
- **Primary**: #ffffff (white)
- **Secondary**: #d1d5db (gray-300)
- **Tertiary**: #9ca3af (gray-400)
- **Muted**: #6b7280 (gray-500)

### Copy Button:
- Default: Gray icon
- Copied: Green checkmark ✓

---

## 7. RESPONSIVE DESIGN

### Desktop (Large Screens):
- Modal centered, max-width 900px
- 2-column grid for detailed info
- Large card display

### Tablet:
- Modal takes 90% width
- 2-column grid adapts

### Mobile:
- Full screen modal
- 1-column grid for details
- Adjusted font sizes
- Touch-friendly buttons (larger)

---

## 8. ANIMATIONS & INTERACTIONS

### Hover Effects:
- **Card Border**: Gray → Violet (500/50)
- **Card Shadow**: Increases, Violet glow
- **Buttons**: Opacity changes, color shift

### Click Interactions:
- **Copy Button**: Icon changes to ✓, auto-resets after 2s
- **Show Details**: Reveals sensitive data with smooth transition
- **Modal**: Backdrop blur, slide in animation

### Loading States:
- "Loading..." spinner while fetching sensitive data

---

## 9. TYPOGRAPHY

### Font Family:
- Body: System font stack (Tailwind default)
- Numbers: Monospace (font-mono)

### Font Sizes & Weights:
- **Card Title**: 2xl (24px), bold
- **Card Number**: 3xl (30px), bold, monospace
- **Expiry/CVV**: 2xl (24px), monospace
- **Balance**: lg (18px), semibold
- **Labels**: xs (12px), uppercase, tracking-wider, gray
- **Buttons**: sm (14px), medium weight

---

## 10. SPACING & DIMENSIONS

### Card Display:
- Aspect Ratio: 1.586:1 (standard card)
- Padding: 32px (p-8)
- Border Radius: 24px (rounded-3xl)

### Modal:
- Padding: 24px (p-6)
- Max Height: 80vh
- Scrollable content

### Buttons:
- Height: 40px (h-10)
- Padding: 16px (px-4)
- Border Radius: 12px (rounded-xl)
- Gap: 8px

---

## 11. COPY FEATURE

Each sensitive field has a copy button:
- **Icon**: 📋 (Copy) → ✓ (Check)
- **Location**: Right side of value
- **Duration**: Shows ✓ for 2 seconds
- **Sound**: Optional click feedback
- **Toast**: Optional "Copied!" notification

---

## 12. EXAMPLE CARD DATA DISPLAY

### Before Clicking "Show Details":
```
CARD NUMBER: •••• •••• •••• 4206
EXPIRY: ••/••
CVV: •••
```

### After Clicking "Show Details":
```
CARD NUMBER: 4206 5678 9012 3456
EXPIRY: 12/28
CVV: 456

FULL CARD NUMBER: 4206567890123456
EXPIRY MONTH: 12
EXPIRY YEAR: 2028
CVV/CVC: 456

CARD ID: cuid_abc123xyz789
STATUS: ACTIVE (Green)
BALANCE: $500.00
CURRENCY: USD
```

---

## KEY FEATURES

✅ Beautiful gradient background with glow effects
✅ Large card template (realistic credit card size)
✅ All sensitive data visible when revealed
✅ One-click copy for each field
✅ Status indicator (active/frozen/inactive)
✅ Balance displayed prominently
✅ Card ID for reference
✅ Freeze/Unfreeze functionality
✅ Top Up button
✅ Responsive design
✅ Dark theme (modern, professional)
✅ Smooth animations
✅ Clear visual hierarchy
