import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
    const navigate = useNavigate();
    return (
        <div className='boxx'>
            <div className="header slide-down">
                {/* LEFT */}
                <div className="logo-section">
                    <img src="/vite.svg" alt="logo" />
                    <span className="app-name">Route Optimizer</span>
                </div>

                {/* RIGHT */}
                <div className="auth-buttons">
                    <button className="btn btn-primary" onClick={() => navigate("/auth?mode=login")}>Login</button>
                    <button className="btn btn-secondary" onClick={() => navigate("/auth?mode=register")}>SignUp</button>
                </div>
            </div>

            {/* HERO SECTION */}
            <div className="hero slide-in">
                <h1>Plan Smarter Routes.</h1>
                <h1>Save Time.</h1>
                <h1>Never Miss a Priority.</h1>
                <p>
                    This application helps users calculate the most efficient travel route
                    by considering multiple stops, traffic conditions, and priority levels.
                    Mandatory stops are handled first while nearby lower-priority stops are
                    intelligently merged to minimize total travel time.
                </p>
            </div>
        </div>
    );
}

export default Home;
