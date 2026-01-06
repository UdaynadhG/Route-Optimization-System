
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import axios from 'axios'
import { useState } from "react";

function Login() {
    const [userNotFound, setUserNotFound] = useState(false);
    const [invalidPass, setInvalidPass] = useState(false);
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();

    async function handleLogin(e) {
        const user = { username: e.username, password: e.password };
        const url = "http://localhost:3000/user-auth/login-user/";
        try {
            const response = await axios.post(url, user, {
                headers: { "Content-Type": "application/json" },
            });

            if (response.data.message === "user not found") {
                setUserNotFound(true);
                reset();
                setTimeout(() => {
                    setUserNotFound(false);
                }, 3000);
            } else if (response.data.message === "Invalid password") {
                setInvalidPass(true);
                reset();
                setTimeout(() => {
                    setInvalidPass(false);
                }, 3000);
            } else {
                localStorage.setItem("refreshToken", response.data.refreshToken);
                sessionStorage.setItem("accessToken", response.data.accessToken);
                navigate('/stop-manage')
            }
        } catch (err) {
            alert("Login failed");
            console.error("Error during login:", err.response?.data || err.message);
        }
    }

    return (
        <>
            <form className="form mt-5" onSubmit={handleSubmit(handleLogin)}>
                <input type="text" placeholder="Username or Email" className="mb-3" {...register("username", { required: true })}/>
                <input type="password" placeholder="Password" className="mb-3" {...register("password", { required: true })}/>

                <button className="submit-btn" type="submit">Login</button>
            </form>

            {
                userNotFound && <h2 className="mt-5 text-center">
                    User Not Found
                </h2>
            }
            {
                invalidPass && <h2 className="mt-5 text-center">
                    Invalid Password
                </h2>
            }
        </>
    );
}

export default Login;
