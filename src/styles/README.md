# CSS architecture

All application styles are loaded once from `index.css`. Do not import page CSS from React components.

## Cascade order

1. `foundation` — tokens, theme variables, reset, and HTML element defaults (`global.css`).
2. `components` — reusable UI primitives such as buttons, search inputs, modals, and toasts (`common.css`).
3. `layout` — application shell, sidebar, navigation, and global overlays (`layout.css`).
4. `pages` — route/domain-specific composition (`pages/*.css`).
5. `utilities` — small single-purpose helpers (`utilities.css`).

The order is declared with CSS cascade layers, so it does not depend on JavaScript module or route loading order.

## Rules for new styles

- Reusable visual behavior belongs in `common.css` and should use a component class.
- A page stylesheet may position or size a shared component, but should not restyle its internal `input`, `button`, or icon.
- Avoid broad selectors such as `.page button` or `.modal input`; target a component class or a direct child class.
- Prefer one class of specificity. Use modifier classes for variants and state classes for behavior.
- Do not use `!important`. Resolve ownership or layer placement instead.
- Use variables from `global.css` for color, spacing, radii, control heights, shadows, and z-index values.
- Put responsive rules beside the domain they modify, at the end of that stylesheet.
