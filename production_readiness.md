## Completed Items (Pre-Alpha)
- [x] **Code Quality**: Resolve all lint errors.
- [x] **Environment Config**: Create `.env.example`.
- [x] **SEO & Metadata**: Update `index.html` title and meta description.
- [x] **Data Import/Export**: Verified support for **csTimer** backup files.
- [x] **User Engagement**: Donations (Ko-fi) and Feedback mechanism.
- [x] **Growth**: PWA Support, Social Sharing, Onboarding.
- [x] **Polish & UX**: Scramble Visualization (3D/2D), Accessibility (Focus Management, Keyboard Navigation, ARIA).
- [x] **Security**: Supabase Row Level Security (RLS) enabled.
- [x] **Basic Auth**: Login, Signup, Forgot Password, Profile Management.
- [x] **Core Features**: Timer, Scrambles, Sessions, Stats.



# Roadmap to MVP Release (Alpha)

## Phase 1: Legal & Compliance (Completed)
- [x] **Privacy Policy**: Create a Privacy Policy page/modal (Required for Google OAuth verification).
- [x] **Terms of Service**: Create a standard Terms of Service.
- [x] **Contact/Support**: Add a clear way for users to contact support (e.g., email or GitHub Issues link).

## Phase 2: Release Preparation
- [ ] **Version Display**: Automate version number display from `package.json` (currently hardcoded).
- [ ] **Changelog**: Initialize `CHANGELOG.md` to track user-facing changes.
- [ ] **Build Optimization**: Investigate code splitting for large chunks (e.g., 3D visualizer) if needed.

## Phase 3: Infrastructure & Deployment
- [ ] **CI/CD**: Set up GitHub Actions for automated testing and deployment.
- [ ] **Deployment**: Deploy application (e.g., to Google Cloud Platform or Vercel/Netlify).
- [ ] **Domain & Monetization**:
    - [ ] Configure custom domain.
    - [ ] **AdSense**: Integrate Google AdSense (must be done *after* domain configuration).
- [ ] **Monitoring**: Integrate Sentry (for error tracking) and PostHog (for analytics).

## Phase 4: Open Source & Community
- [ ] **Open Source Setup**:
    - [x] Prepare repository for public access (LICENSE present).
    - [ ] Create `CONTRIBUTING.md`.
    - [ ] Create a Ko-fi post announcing the open source launch.

## Phase 5: Testing
- [ ] **Unit Tests**: Add tests for `store.ts` (timer logic, session management) and critical components.