import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './authConfig';
import { AuthProvider } from './context/AuthContext';
import './i18n/config';
import '@/App.css';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import Projects from './pages/Projects';
import Allocations from './pages/Allocations';
import Analytics from './pages/Analytics';
import Hierarchy from './pages/Hierarchy';
import Admin from './pages/Admin';
import OverallocatedResources from './pages/OverallocatedResources';
import ResourceLeaves from './pages/ResourceLeaves';

const msalInstance = new PublicClientApplication(msalConfig);

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="resources" element={<Resources />} />
                <Route path="projects" element={<Projects />} />
                <Route path="allocations" element={<Allocations />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="hierarchy" element={<Hierarchy />} />
                <Route path="admin" element={<Admin />} />
                <Route path="overallocated" element={<OverallocatedResources />} />
                <Route path="leaves" element={<ResourceLeaves />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </Suspense>
      </AuthProvider>
    </MsalProvider>
  );
}

export default App;
