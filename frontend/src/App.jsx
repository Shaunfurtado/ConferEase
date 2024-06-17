//frontend\src\App.jsx
import { Routes, Route } from 'react-router-dom';
import CreateSession from './pages/CreateSession';
import Session from './pages/Session';

const App = () => {
    return (
        <div className="App">
            <header className="App-header">
                <h1 className="text-2xl font-bold">Anonymous Conference Platform</h1>
            </header>
            <Routes>
                <Route path="/" element={<CreateSession />} />
                <Route path="/session/:sessionId" element={<Session />} />
            </Routes>
        </div>
    );
};

export default App;
