import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import App from "./App";
import "./index.css";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LocationProvider } from "@/context/LocationContext";
import { registerPwa } from "@/lib/registerPwa";

registerPwa();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          <LocationProvider>
            <App />
          </LocationProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  </React.StrictMode>
);
