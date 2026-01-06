import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import './Login.css'

function AuthPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const mode = searchParams.get("mode");
    const [isLogin, setIsLogin] = useState(mode !== "register");

    useEffect(() => {
        setIsLogin(mode !== "register");
    }, [mode]);

    return (
        <div className="container-login">
            {/* LOGO */}
            <div
                className="logo-section"
                onClick={() => navigate("/")}
                style={{ cursor: "pointer" }}
            >
                <img src="/vite.svg" alt="logo" />
                <span className="app-name">Route Optimizer</span>
            </div>

            <div className="box">
                <div className="head">
                    <button
                        className={isLogin ? "tab active" : "tab"}
                        onClick={() => navigate("/auth?mode=login")}
                    >
                        LOGIN
                    </button>

                    <button
                        className={!isLogin ? "tab active" : "tab"}
                        onClick={() => navigate("/auth?mode=register")}
                    >
                        SIGN UP
                    </button>
                </div>

                {isLogin ? <Login /> : <Register />}
            </div>
        </div>
    );
}

export default AuthPage;