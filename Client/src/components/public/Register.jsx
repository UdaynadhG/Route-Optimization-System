import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import axios from 'axios'
import { useState } from "react";

function Register() {
    
    const [passMismatch, setpassMismatch] = useState(false);
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm();

    async function handleSignUp(e) {
        if(e.password !== e.Cpassword){
            setpassMismatch(true);
            setTimeout(() => setpassMismatch(false), 3000);
            return;
        }
        const user = { username: e.username, name: e.name, email: e.email, password: e.password };
        const url = `${import.meta.env.VITE_API_URL}/user-auth/create-user/`;
        try {
            const response = await axios.post(url, user, {
                headers: { "Content-Type": "application/json" },
            });
            localStorage.setItem("refreshToken", response.data.refreshToken);
            sessionStorage.setItem("accessToken", response.data.accessToken);
            navigate('/stop-manage')
        } catch (err) {
            console.error("Error during SignUp:", err.response?.data || err.message);
        }
    }
    
    return (
        <>
            <form className="form mt-3" onSubmit={handleSubmit(handleSignUp)}>
                <input type="text" placeholder="Username" {...register("username", { required: true })}/>
                <input type="text" placeholder="name" {...register("name", { required: true })}/>
                <input type="email" placeholder="Email" {...register("email", { required: true })}/>
                <input type="password" placeholder="Password" {...register("password", { required: true })}/>
                <input type="password" placeholder="Confirm Password" {...register("Cpassword", { required: true })}/>

                <button className="submit-btn" type="submit">Create Account</button>

            </form>
            {
                passMismatch && <h6 className="text-center">
                    Confirm password must be the same as password.
                </h6>
            }
        </>
    );
}

export default Register;
