# Typography Reference

## Font Families

| Usage | Font | Source |
|-------|------|--------|
| **Primary (body, headings, tables)** | "Public Sans", sans-serif | `$font-family-primary` in `_variables.scss` |
| **Secondary** | "Public Sans", sans-serif | `$font-family-secondary` |
| **Logo / Splash** | "Satoshi" | LogoBox.jsx, index.html (branding only) |
| **Code / Monospace** | SFMono-Regular, Menlo, Monaco, Consolas | `font-monospace` class |

**Note:** Public Sans is loaded via Google Fonts in `_variables.scss`. Satoshi is loaded in `index.html` for the logo/splash screen only.

## Dashboard Table Typography (Consistent)

| Element | Font Size | SCSS Variable |
|---------|-----------|---------------|
| **Table headers (th)** | 0.875rem (14px) | `$table-header-font-size` |
| **Table cells (td)** | 0.8125rem (13px) | `$table-cell-font-size` |
| **Badges within tables** | 0.75rem (12px) | — |

Add `className="table-dashboard"` to `<Table>` for consistent typography across all dashboard tables.

## Base Font Sizes (Bootstrap)

- `$font-size-base`: 0.875rem (~14px)
- `$font-size-sm`: smaller
- `$font-size-lg`: 1rem (16px)
- `$h4-font-size`: 1.125rem
- `$h6-font-size`: 0.75rem
