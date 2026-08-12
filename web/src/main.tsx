import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./i18n";
import App from "./App";
import "./index.css";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { AuthProvider } from "@/context/AuthContext";
import { AuthModalProvider } from "@/context/AuthModalContext";

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CurrencyProvider>
      <AuthProvider>
        <AuthModalProvider>
          <App />
        </AuthModalProvider>
      </AuthProvider>
    </CurrencyProvider>
  </React.StrictMode>
);
