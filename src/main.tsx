import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import SettingsWindow from "./app/SettingsWindow";
import { getAppearance } from "./app/appearance";
import "./styles/app.css";

getAppearance();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {new URLSearchParams(location.search).has("settings") ? <SettingsWindow /> : <App />}
  </React.StrictMode>
);
