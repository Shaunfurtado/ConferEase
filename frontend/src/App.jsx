//frontend\src\App.jsx
import { Routes, Route } from 'react-router-dom';
import CreateSession from './pages/CreateSession';
import Session from './pages/Session';
import ConferenceSession from './pages/ConferenceSession';
import NewCollection from './pages/demo';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';

const App = () => {
    return (
        <Theme>
        <div className="App">
            <Routes>
                <Route path="/" element={<CreateSession />} />
                <Route path="/session/:sessionId" element={<Session />} />
                <Route path="/conference/:sessionId" element={<ConferenceSession />} />
                <Route path="/new-collection" element={<NewCollection />} />
            </Routes>
        </div>
        </Theme>
    );
};

export default App;
