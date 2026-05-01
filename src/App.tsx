import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import Splash from './pages/Splash';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyCharacter from './pages/MyCharacter';
import OOTD from './pages/OOTD';
import OCRScan from './pages/OCRScan';
import Wardrobe from './pages/Wardrobe';
import Shop from './pages/Shop';
import Settings from './pages/Settings';

import BottomNav from './components/BottomNav';
import AIAssistant from './components/AIAssistant';
import AddItem from './pages/AddItem';
import FittingRoom from './pages/FittingRoom';
import Diagnosis from './pages/Diagnosis';

function AnimatedRoutes() {
  const location = useLocation();
  
  useEffect(() => {
    console.log('[Router] Path changed to:', location.pathname);
  }, [location]);

  const navPaths = ['/dashboard', '/wardrobe', '/shop', '/ootd'];
  const isNavVisible = navPaths.some(path => location.pathname.startsWith(path));
  
  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scan" element={<MyCharacter />} />
          <Route path="/ootd" element={<OOTD />} />
          <Route path="/wardrobe" element={<Wardrobe />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ocr" element={<OCRScan />} />
          <Route path="/add-item" element={<AddItem />} />
          <Route path="/fitting" element={<FittingRoom />} />
          <Route path="/diagnosis" element={<Diagnosis />} />
        </Routes>
      </AnimatePresence>
      
      {location.pathname.startsWith('/dashboard') && <AIAssistant />}
      
      {isNavVisible && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
