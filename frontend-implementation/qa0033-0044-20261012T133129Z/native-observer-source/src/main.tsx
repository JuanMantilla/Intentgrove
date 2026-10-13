import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import SettingsWindow from "./app/SettingsWindow";
import { getAppearance } from "./app/appearance";
import "./styles/app.css";

const probeRows:unknown[]=[];
(globalThis as any).__qaTrace=(event:string,data:object={})=>{probeRows.push({at:performance.now(),wall:Date.now(),visibility:document.visibilityState,focus:document.hasFocus(),event,...data});};
const copyProbe=document.createElement('button');copyProbe.textContent='Copy worker diagnostic log';copyProbe.style.cssText='position:fixed;bottom:92px;right:0;z-index:99999';document.body.append(copyProbe);copyProbe.onclick=()=>{const field=document.createElement('textarea');field.value=JSON.stringify(probeRows);document.body.append(field);field.focus();field.select();document.execCommand('copy');field.remove();};
document.addEventListener('visibilitychange',()=>(globalThis as any).__qaTrace('visibility'));
window.addEventListener('focus',()=>(globalThis as any).__qaTrace('focus'));
window.addEventListener('blur',()=>(globalThis as any).__qaTrace('blur'));
getAppearance();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {new URLSearchParams(location.search).has("settings") ? <SettingsWindow /> : <App />}
  </React.StrictMode>
);
