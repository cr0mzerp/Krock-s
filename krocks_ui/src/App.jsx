import { Toaster } from 'sonner'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from '@/pages/Home';

const queryClientInstance = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
      <Toaster 
        theme="dark" 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'rgba(30, 30, 30, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--t1)',
            fontSize: '13px',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          },
          success: { iconTheme: { primary: '#4ade80', secondary: '#1e1e1e' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#1e1e1e' } }
        }}
      />
    </QueryClientProvider>
  )
}

export default App
