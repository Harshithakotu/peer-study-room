import { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import { connectSocket, disconnectSocket } from "../socket";

if (import.meta.env.VITE_SERVER_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (initialized.current) return;
    initialized.current = true;

    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = "Bearer " + token;
      axios
        .get("/api/auth/me")
        .then((res) => {
          setUser(res.data);
          connectSocket(token);
        })
        .catch(() => {
          localStorage.removeItem("token");
          delete axios.defaults.headers.common["Authorization"];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post("/api/auth/login", { email, password });
    const { token, user } = res.data;
    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = "Bearer " + token;
    connectSocket(token);
    setUser(user);
    return user;
  };

  const register = async (username, email, password) => {
    const res = await axios.post("/api/auth/register", { username, email, password });
    const { token, user } = res.data;
    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = "Bearer " + token;
    connectSocket(token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    disconnectSocket();
    setUser(null);
    initialized.current = false;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
