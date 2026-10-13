import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import SettingsWindow from "./app/SettingsWindow";
import { getAppearance } from "./app/appearance";
import "./styles/app.css";

const probeRows: unknown[]=[];
const panel=document.createElement('pre');panel.setAttribute('aria-label','QA diagnostic observation');panel.style.cssText='position:fixed;bottom:0;right:0;width:430px;height:90px;font:10px monospace;overflow:auto;z-index:99999;background:#fff;color:#000;pointer-events:none';document.body.append(panel);
(globalThis as any).__qaTrace=(event:string,data:object={})=>{probeRows.push({at:performance.now(),event,...data});panel.replaceChildren(...probeRows.slice(-30).map(row=>{const line=document.createElement('div');line.textContent=JSON.stringify(row);return line;}));};
const copyProbe=document.createElement('button');copyProbe.textContent='Copy QA diagnostic log';copyProbe.style.cssText='position:fixed;bottom:92px;right:0;z-index:99999';document.body.append(copyProbe);copyProbe.onclick=()=>{const field=document.createElement('textarea');field.value=JSON.stringify(probeRows);document.body.append(field);field.focus();field.select();document.execCommand('copy');field.remove();};
window.addEventListener('keydown' ,e=>(globalThis as any).__qaTrace('raw-key',{key:e.key,meta:e.metaKey,target:(e.target as HTMLElement)?.tagName}),true);
document.addEventListener('focusin',e=>(globalThis as any).__qaTrace('focus',{target:(e.target as HTMLElement)?.outerHTML?.slice(0,150)}),true);
getAppearance();
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {new URLSearchParams(location.search).has("settings") ? <SettingsWindow /> : <App />}
  </React.StrictMode>
);
