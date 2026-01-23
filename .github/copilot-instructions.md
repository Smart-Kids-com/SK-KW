# GitHub Copilot Custom Instructions for Smart Kids Kuwait

## Project Overview
This is an Arabic (RTL) e-commerce order management system for Smart Kids Kuwait - نظام إدارة الطلبات المتقدم. The system is completely independent from Shopify for cart and checkout operations, using a local SQLite database for reliable order management.

## Technology Stack
- **Backend**: Node.js with SQLite database
- **Frontend**: HTML, CSS, JavaScript (Vanilla JS)
- **Language**: Arabic (Right-to-Left)
- **Database**: SQLite (orders.db)
- **Configuration**: TypeScript config available but primarily JavaScript codebase

## Coding Standards

### JavaScript
- Use ES2020 features as specified in tsconfig.json (target: ES2020)
- Prefer `const` and `let` over `var`
- Use arrow functions for callbacks and functional programming
- Follow the existing code style in the repository
- Use descriptive variable names in English (but UI text in Arabic)
- Add comments in Arabic for complex business logic
- Always handle errors appropriately with try-catch blocks

### HTML
- Use semantic HTML5 elements
- Maintain RTL (Right-to-Left) support with `dir="rtl"` and `lang="ar"`
- Follow accessibility best practices (ARIA labels where needed)
- Keep HTML structure clean and well-indented
- Use Arabic text for all user-facing content

### CSS
- Use CSS custom properties (variables) for theming
- Follow the existing color scheme defined in config/system.js:
  - Primary: #667eea
  - Secondary: #764ba2
  - Success: #10b981
  - Error: #ef4444
  - Warning: #f59e0b
- Ensure RTL compatibility in all styles using logical CSS properties:
  - Margins and padding: `margin-inline-start`, `margin-inline-end`, `padding-inline-start`, `padding-inline-end`
  - Borders: `border-inline-start`, `border-inline-end`
  - Positioning: `inset-inline-start`, `inset-inline-end`
  - Text alignment: `text-align: start` and `text-align: end` instead of left/right
  - Float: `float: inline-start` and `float: inline-end` instead of left/right
  - Flexbox: Consider `flex-direction: row-reverse` for RTL layouts
- Use flexbox and grid for layouts
- Mobile-first responsive design

### Arabic/RTL Considerations
- All user-facing text must be in Arabic
- Always set `dir="rtl"` on HTML elements containing Arabic text
- Use `text-align: start` as default for RTL layouts (automatically adjusts based on text direction)
- Be mindful of icon and button positioning in RTL context
- Test all UI changes for RTL compatibility

## Project Structure

### Key Files and Directories
- `server.js` - Main server launcher with auto-restart capability
- `simple-server.js` - Simple static file server
- `config/system.js` - Central system configuration (currency, order statuses, etc.)
- `orders.db` - SQLite database for order management
- `*.html` - Various page templates (admin, product, checkout, etc.)
- `*.js` - Client-side JavaScript modules
- `data/` - Product data files
- `public/` - Static assets
- `locales/` - Localization files

### Important Configuration
- Order prefix: `ORD-`
- Currency: KWD (Kuwaiti Dinar) with symbol `د.ك`
- Order statuses: pending, processing, shipped, completed, cancelled
- Free shipping threshold: 20 KWD
- Default shipping cost: 2 KWD

## Database Schema
The SQLite database (`orders.db`) contains:
- `orders` table - Main order information
- `order_items` table - Individual items in each order

Always use parameterized queries to prevent SQL injection.

## Build and Development

### Running the Application
```bash
npm run dev
```

### Building the Application
```bash
npm run build
```
Note: Currently returns "No build needed" as this is primarily static HTML/JS.

### Key URLs
- Main site: http://localhost:3000
- Admin panel: http://localhost:3000/admin
- Enhanced admin: http://localhost:3000/admin-enhanced
- Order tracking: http://localhost:3000/track

## API Endpoints
If creating new API endpoints:
- Follow RESTful conventions
- Return JSON responses
- Include proper error handling
- Use appropriate HTTP status codes
- Document the endpoint in relevant files

## Testing
- Manually test all changes in a browser
- Test RTL layout on different screen sizes
- Verify Arabic text displays correctly
- Test order flow from cart to checkout to tracking
- Validate database operations

## Security Considerations
- Always use parameterized SQL queries
- Validate all user inputs
- Sanitize data before displaying
- Don't expose sensitive information in client-side code
- Handle errors gracefully without exposing internal details

## Helper Functions
The project includes helper functions in `config/system.js`:
- `formatCurrency(amount)` - Format amounts in KWD
- `formatDate(dateString)` - Format dates in Arabic locale
- `formatDateTime(dateString)` - Format date and time
- `generateOrderNumber()` - Generate unique order numbers
- `getStatusColor(status)` - Get color for order status
- `getStatusLabel(status)` - Get Arabic label for status
- `calculateShipping(orderTotal)` - Calculate shipping costs
- `validateEmail(email)` - Validate email addresses
- `validateKuwaitiPhone(phone)` - Validate Kuwaiti phone numbers

Always use these helpers instead of creating duplicate functionality.

## Best Practices
1. **Consistency**: Follow existing patterns in the codebase
2. **Arabic First**: All user-facing text in Arabic
3. **RTL Support**: Always consider RTL layout implications
4. **Error Handling**: Comprehensive error handling and user feedback
5. **Performance**: Keep the system fast and lightweight
6. **Documentation**: Comment complex logic in Arabic
7. **Database Safety**: Use parameterized queries, backup before major changes
8. **Modularity**: Keep code modular and reusable
9. **Accessibility**: Maintain WCAG standards where possible
10. **Mobile Responsive**: Test on various screen sizes

## Common Tasks

### Adding a New Page
1. Create HTML file in root directory
2. Include RTL attributes: `<html dir="rtl" lang="ar">`
3. Link to shared styles if needed
4. Add navigation links in relevant pages
5. Test responsive design

### Modifying Order System
1. Review `config/system.js` for order configuration
2. Update database schema if needed
3. Maintain backward compatibility
4. Test complete order flow
5. Update documentation

### Working with Arabic Text
- Use UTF-8 encoding
- Test text rendering in different browsers
- Arabic text naturally breaks between words, not within them
- Rely on default text wrapping behavior for normal Arabic content
- Use `overflow-wrap: break-word` only for edge cases like very long URLs or unbreakable strings
- Avoid `word-break: keep-all` (designed for CJK languages, not appropriate for Arabic)
- Use appropriate fonts that support Arabic characters (e.g., 'Noto Sans Arabic', 'Cairo', 'Tajawal')
- Consider text direction in layouts

## Deployment
- The system is designed to run locally with SQLite
- For production, ensure Node.js environment is set up
- Database file (orders.db) should be backed up regularly
- Consider read/write permissions for the database file

## Support and Documentation
- Main README: README.md
- System documentation: SYSTEM_DOCUMENTATION.md
- Quick start: QUICK_START.md
- Deployment guide: DEPLOYMENT_GUIDE.md

## Notes for AI Assistants
- When generating code, maintain the existing style and patterns
- Prioritize Arabic language for all UI elements
- Always consider RTL layout in suggestions
- Suggest using existing helper functions from config/system.js
- Be mindful of the SQLite database operations
- Test suggestions for RTL compatibility before recommending
