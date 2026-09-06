import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import App from "./App";
import "./index.css";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LocationProvider } from "@/context/LocationContext";
import { registerPwa } from "@/lib/registerPwa";

registerPwa();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          <FavoritesProvider>
            <LocationProvider>
              <App />
            </LocationProvider>
          </FavoritesProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  </React.StrictMode>
);
