import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import MapCanvas from './components/MapCanvas';

function App() {
  return (
    <div>
      <h1>Witaj w Ant Quest!</h1>
      <p>Razem z Gruntorem i mrówkami ruszamy w podróż!</p>
      <MapCanvas />
    </div>
  );
}

export default App;
