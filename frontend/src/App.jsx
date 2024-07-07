//frontend\src\App.jsx
import { Routes, Route } from 'react-router-dom';
import CreateSession from './pages/CreateSession';
import Session from './pages/Session';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';

const App = () => {
    return (
        <Theme>
        <div className="App">
            
            <header className="App-header">
                <h1 className="text-2xl font-bold">Anonymous Conference Platform</h1>
            </header>
            <Routes>
                <Route path="/" element={<CreateSession />} />
                <Route path="/session/:sessionId" element={<Session />} />
            </Routes>
        </div>
        </Theme>
    );
};

export default App;
