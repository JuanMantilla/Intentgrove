import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { getAppearance } from "./app/appearance";
import "./styles/app.css";

getAppearance();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
