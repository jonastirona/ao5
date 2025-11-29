# ao5
monkeytype-inspired speedcubing timer

## Setup

### Environment Variables

Create `apps/web/.env` with your Supabase project credentials:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Configuration

1. **Enable Google OAuth Provider**:
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add your Google OAuth credentials
   - Set redirect URL to your app origin (e.g., `http://localhost:3000` for local dev)

2. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy add-solve
   supabase functions deploy get-solves
   ```

3. **Apply Database Migrations**:
   ```bash
   supabase db push
   ```

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm -C apps/web dev
```

## Features

- **Timer**: Spacebar to start/stop, with inspection time
- **Scrambles**: Auto-generated 3x3 scrambles
- **Statistics**: AO5, AO12, AO100 calculations
- **Authentication**: Email/password and Google OAuth
- **Cloud Sync**: Solves automatically sync to Supabase when logged in
- **Offline Support**: Works without internet, syncs when reconnected
