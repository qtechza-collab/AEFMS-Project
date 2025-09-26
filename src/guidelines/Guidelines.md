# Logan Freights Production Guidelines

## System Overview
Logan Freights Expense Management System - Production deployment guidelines for Vercel + Supabase architecture.

## Core Principles

### Production First
- All code must be production-ready
- No development artifacts in builds
- Environment variables must have fallbacks
- Error handling must be comprehensive

### Security & Compliance
- Follow IFRS compliance requirements
- Implement proper authentication flows
- Use row-level security in Supabase
- Validate all user inputs

### Performance
- Optimize for South African internet connections
- Use proper caching strategies
- Minimize bundle sizes
- Implement lazy loading where appropriate

## Design System

### Brand Colors (Logan Freights)
- **Primary**: Navy (`#030213`) - Logan Freights corporate
- **Secondary**: White (`#ffffff`) - Clean backgrounds
- **Accent**: Gray tones for secondary information
- **Success**: Green for approvals
- **Warning**: Amber for pending items
- **Error**: Red for rejections/errors

### Typography
- Base font size: 16px (accessible)
- Use semantic heading hierarchy (h1-h4)
- No custom font sizes unless specifically needed
- Maintain 1.5 line height for readability

### Component Standards

#### Buttons
- **Primary**: Main actions (Submit, Approve, Save)
- **Secondary**: Alternative actions (Cancel, Edit)
- **Destructive**: Delete operations (Remove, Reject)

#### Forms
- Always include proper labels
- Use validation with clear error messages
- Implement proper loading states
- Provide success feedback

#### Data Tables
- Include search and filtering
- Support pagination for large datasets
- Show loading states during data fetching
- Export functionality where needed

### Responsive Design
- Mobile-first approach
- Support for tablets and desktop
- Proper touch targets (minimum 44px)
- Readable text on all screen sizes

## Role-Based Features

### Employee Dashboard
- Expense submission forms
- Receipt upload with validation
- Personal expense history
- Status tracking

### Manager Dashboard  
- Expense approval workflows
- Team expense analytics
- Budget monitoring
- Financial reporting

### HR Dashboard
- Employee management
- Compliance reporting
- System administration
- Department analytics

### Administrator Dashboard
- Full system access
- User role management
- System configuration
- Advanced analytics

## Technical Standards

### File Organization
- Components in `/components/`
- Utilities in `/utils/`
- Styles in `/styles/`
- Types and interfaces clearly defined

### Data Management
- Use Supabase for all data operations
- Implement proper error handling
- Cache frequently accessed data
- Validate data integrity

### State Management
- Use React state for local component state
- Implement proper loading states
- Handle error states gracefully
- Provide user feedback for all actions

## Deployment Requirements

### Environment Variables
- `VITE_SUPABASE_URL` - Required
- `VITE_SUPABASE_ANON_KEY` - Required
- Proper fallbacks for development

### Build Process
- TypeScript compilation must pass
- All tests must pass (when implemented)
- Bundle size optimization
- Health checks before deployment

### Monitoring
- Error tracking in production
- Performance monitoring
- User session tracking
- System health checks

## Compliance

### IFRS Standards
- Proper expense categorization
- Accurate financial reporting
- Audit trail maintenance
- Currency handling (ZAR)

### Data Protection
- Secure file storage
- Encrypted data transmission
- User privacy protection
- GDPR compliance considerations