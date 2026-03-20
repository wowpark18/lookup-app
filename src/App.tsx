import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import Splash from './pages/Splash';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scan3D from './pages/Scan3D';
import OOTD from './pages/OOTD';
import OCRScan from './pages/OCRScan';
import BottomNav from './components/BottomNav';

function AnimatedRoutes() {
  const location = useLocation();
  const showNav = location.pathname !== '/' && location.pathname !== '/scan' && location.pathname !== '/login';

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan" element={<Scan3D />} />
            <Route path="/ootd" element={<OOTD />} />
            <Route path="/ocr" element={<OCRScan />} />
          </Routes>
        </AnimatePresence>
      </div>
      {showNav && <BottomNav />}
    </>
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
