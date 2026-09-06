import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import App from "./App";
import "./index.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { registerPwa } from "@/lib/registerPwa";

registerPwa();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
