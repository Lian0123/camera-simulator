import React from 'react';
import { createRoot } from 'react-dom/client';
import { Studio } from './components/Studio';
import { useStudioStore } from './camera/store';
import { setupI18n } from './i18n';
import './styles.css';
import './polish.css';
import './mobile.css';
import './noise.css';
import './cameraProfiles.css';

setupI18n(useStudioStore.getState().language);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Studio />
  </React.StrictMode>,
);
