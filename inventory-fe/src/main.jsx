import { Fragment, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { basePath } from './context/constants';
import { setupAxiosAuth } from './lib/jwt';

setupAxiosAuth();

// LocatorJS runtime (DEV only)
// if (import.meta.env.DEV) {
//   import('@locator/runtime')
//     .then((runtime) => {
//       runtime.default({ projectPath: '' });
//     })
//     .catch(() => {});
// }

// StrictMode double-invokes some lifecycles/effects in development.
// Keep it in dev, disable in production to avoid confusing double logs.
const RootWrapper = import.meta.env.DEV ? StrictMode : Fragment;

createRoot(document.getElementById('root')).render(
  <RootWrapper>
    <BrowserRouter basename={basePath}>
      <App />
    </BrowserRouter>
  </RootWrapper>
);
