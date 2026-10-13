import { Component, createRef, type ReactNode } from "react";
import { renderTokens, useCodeTokens } from "./CodeBlock";
import { domPoint, textOffset } from "./rich-dom";

/** Capture before React's DOM mutation phase, including delayed worker results. */
class StableCodeSelection extends Component<{ children: ReactNode }> {
  private root = createRef<HTMLSpanElement>();
  getSnapshotBeforeUpdate(): [number, number] | null {
    const element = this.root.current, selection = window.getSelection();
    return element && selection?.anchorNode && selection.focusNode && element.contains(selection.anchorNode) && element.contains(selection.focusNode)
      ? [textOffset(element, selection.anchorNode, selection.anchorOffset), textOffset(element, selection.focusNode, selection.focusOffset)] : null;
  }
  componentDidUpdate(_props: Readonly<{ children: ReactNode }>, _state: unknown, snapshot: [number, number] | null) {
    if (snapshot && this.root.current) window.getSelection()?.setBaseAndExtent(...domPoint(this.root.current, snapshot[0]), ...domPoint(this.root.current, snapshot[1]));
  }
  render() { return <span ref={this.root}>{this.props.children}</span>; }
}

/** Highlight only literal code. Token worker results never become source. */
export function RichCodeText({ source, language }: { source: string; language: string }) {
  const tokens = useCodeTokens(source, language);
  return <StableCodeSelection>{tokens ? renderTokens(tokens) : source}</StableCodeSelection>;
}
