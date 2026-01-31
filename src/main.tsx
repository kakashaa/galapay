import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker with immediate update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none'
      });
      
      // Check for updates immediately
      registration.update();
      
      // Check for updates every 30 seconds
      setInterval(() => {
        registration.update();
      }, 30000);
      
      // When a new service worker is waiting, activate it immediately
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, reload the page
              window.location.reload();
            }
          });
        }
      });
      
      // Handle controller change (when skipWaiting is called)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    } catch (error) {
      console.log('Service worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
