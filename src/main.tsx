import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// Enhanced error handling for production
const handleStartupError = (error: any) => {
  console.error('[Logan Freights] Critical startup error:', error);
  
  // Show error in the DOM if React fails to mount
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fee; font-family: system-ui;">
        <div style="text-align: center; max-width: 500px; padding: 20px;">
          <h1 style="color: #dc2626; margin-bottom: 16px;">Logan Freights System Error</h1>
          <p style="color: #991b1b; margin-bottom: 16px;">Failed to start the application. This is likely a configuration issue.</p>
          <details style="text-align: left; margin: 16px 0; background: white; padding: 12px; border-radius: 4px;">
            <summary style="cursor: pointer; font-weight: bold;">Error Details</summary>
            <pre style="margin-top: 8px; font-size: 12px; overflow: auto;">${error.message || error}</pre>
          </details>
          <button onclick="window.location.reload()" style="background: #dc2626; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            Reload Page
          </button>
          <div style="margin-top: 16px; font-size: 12px; color: #6b7280;">
            <div>Environment: ${process.env.NODE_ENV || 'unknown'}</div>
            <div>URL: ${window.location.href}</div>
            <div>Time: ${new Date().toISOString()}</div>
          </div>
        </div>
      </div>
    `;
  }
};

try {
  // Remove any existing loading indicators
  const removeLoadingScreen = () => {
    const loadingElements = document.querySelectorAll('.loading-container, .initial-loading');
    loadingElements.forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  };

  // Get root element
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found. Check your index.html file.');
  }

  console.log('[Logan Freights] Starting application...');
  console.log('[Logan Freights] Environment:', process.env.NODE_ENV || 'unknown');
  console.log('[Logan Freights] Root element found:', !!rootElement);

  // Clear any existing content in root
  rootElement.innerHTML = '';

  // Create React root and render app
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log('[Logan Freights] React app mounted successfully');

  // Clean up loading screen after a short delay
  setTimeout(removeLoadingScreen, 50);

} catch (error) {
  handleStartupError(error);
}
