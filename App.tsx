import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { ProjectDetail } from './pages/ProjectDetail';

function App() {
  // Simple Hash Routing implementation
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newPath: string) => {
    window.location.hash = newPath;
  };

  // Route matching logic
  let Component;
  if (route.startsWith('#/project/')) {
    const projectId = route.split('#/project/')[1];
    return <ProjectDetail projectId={projectId} onNavigate={navigate} />;
  } else {
    return <Dashboard onNavigate={navigate} />;
  }
}

export default App;