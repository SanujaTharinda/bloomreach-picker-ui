# DAM Asset Picker for Bloomreach

A Digital Asset Management (DAM) Asset Picker UI Extension for Bloomreach Custom Integrations.

## Features

- 🔐 API key authentication
- 📁 Hierarchical collections tree
- 🖼️ Image asset grid with selection
- 🎨 Modern UI with Ant Design
- 🔄 Bloomreach UI Extension integration

## Configuration

### Environment Variables

Create a `.env` file in the root directory to configure the API URL:

```env
# ResourceSpace API Configuration
VITE_API_URL=/api
```

**Note:** In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client.

**Examples:**
- Local development: `VITE_API_URL=http://localhost:3000/api`
- Production: `VITE_API_URL=https://your-resourcespace-instance.com/api`
- Relative path (same origin): `VITE_API_URL=/api`

If `VITE_API_URL` is not set, it defaults to `/api`.

## Local Development

You can test the application locally without connecting to Bloomreach by using the mock mode.

### Running Locally

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Access with mock mode:**
   The application automatically detects local development mode when:
   - Not running in an iframe (Bloomreach loads extensions in iframes)
   - Or when `?localDev=true` is in the URL
   - Or when `localStorage.setItem('bloomreach:localDev', 'true')` is set

3. **Configure mock settings via URL parameters:**
   ```
   http://localhost:5173/?apiKey=your-api-key&mode=edit&value=initial-value&dialog=false
   ```

### URL Parameters for Local Testing

- `apiKey` - Mock API key (default: `mock-api-key-12345`)
- `mode` - Document editor mode: `view`, `edit`, or `compare` (default: `edit`)
- `value` - Initial field value (default: empty)
- `dialog` - Set to `true` to simulate dialog mode (default: `false`)
- `dialogValue` - Initial dialog value (only used when `dialog=true`)

### Examples

**Basic local testing:**
```
http://localhost:5173/
```

**With custom API key:**
```
http://localhost:5173/?apiKey=test-key-123
```

**Dialog mode:**
```
http://localhost:5173/?dialog=true&dialogValue=some-value
```

**View mode:**
```
http://localhost:5173/?mode=view
```

### Testing Authentication

- Valid API keys: Any key except `invalid-key` or `test-invalid`
- Invalid API keys: `invalid-key` or `test-invalid` (will show unauthorized screen)

## Project Structure

```
src/
├── components/       # React components
├── contexts/         # React contexts
├── hooks/            # Custom React hooks
├── services/         # API services
├── styles/           # SCSS stylesheets
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready to be deployed to your Bloomreach Custom Integration.

## Technologies

- React 19
- TypeScript
- Ant Design 6
- SCSS
- Vite
- Bloomreach UI Extension SDK
