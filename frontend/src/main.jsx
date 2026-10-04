import React from 'react';
import { createRoot } from 'react-dom/client';
import { withStreamlitConnection } from 'streamlit-component-lib';
import App from './App.jsx';

const ConnectedApp = withStreamlitConnection(App);
createRoot(document.getElementById('root')).render(<ConnectedApp />);
