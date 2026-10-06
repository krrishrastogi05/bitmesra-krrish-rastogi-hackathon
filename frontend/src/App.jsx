import { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import Terminal from './terminal/Terminal';

export default function App() {
  const [splash, setSplash] = useState(true);
  return (
    <>
      <Terminal />
      {splash && <SplashScreen onComplete={() => setSplash(false)} />}
    </>
  );
}
