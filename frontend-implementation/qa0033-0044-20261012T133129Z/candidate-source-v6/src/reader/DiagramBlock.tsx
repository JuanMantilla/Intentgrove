import { useEffect, useState } from "react";
import { t, type Locale } from "../app/i18n";
import CodeBlock from "./CodeBlock";
import PreviewLoading from "./PreviewLoading";
import { renderDiagram } from "./diagram-host";
export default function DiagramBlock({source,copySource,locale}:{source:string;copySource:string;locale:Locale}) {
  const [result,setResult]=useState<{source:string;url?:string;failed?:boolean}|null>(null);
  useEffect(() => {
    let live=true;let url:string|undefined;
    const task=renderDiagram(source);
    void task.promise.then(pixels => {
      if(!live)return;
      url=URL.createObjectURL(new Blob([new Uint8Array(pixels.bytes)],{type:"image/png"}));
      setResult({source,url});
    },()=>{if(live)setResult({source,failed:true});});
    return () => {live=false;task.cancel();if(url)URL.revokeObjectURL(url);};
  },[source]);
  const current=result?.source===source?result:null;
  return <div className="diagram-block">
    {current?.url?<img src={current.url} alt={t(locale,"diagramAlt")} />:current?.failed
      ? <p role="alert">{t(locale,"diagramUnavailable")}</p>
      : <PreviewLoading label={t(locale,"loading")} />}
    <details open={current?.failed || undefined}><summary>{t(locale,"blockSource")}</summary><CodeBlock source={source} copySource={copySource} language="mermaid" locale={locale}/></details>
  </div>;
}
