import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "xterm/css/xterm.css";
import { XTermMethods } from "../utils/XTermMethods";
import { getTerminalIntroMessages } from "../assets/constants/Constants";
import TypeAnimation from "../utils/TypeAnimation";
import { fullPrompt } from "../assets/constants/Constants";

const XTermComponent = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const [isIntroLoaded, setIsIntroLoaded] = useState(false);

  useEffect(() => {
    if (terminalRef.current) {
      term.current = new Terminal({
        cursorBlink: true,
        theme: { background: "#1e1e1e", foreground: "#ffffff" },
        fontSize: 14,
        scrollback: 1000,
        disableStdin: false,
        allowTransparency: true,
      });

      term.current.open(terminalRef.current);

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      term.current.loadAddon(fitAddon);
      term.current.loadAddon(webLinksAddon);
      fitAddon.fit();
    }

    return () => {
      term.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (isIntroLoaded && term.current) {
      term.current.write(`\r\n${fullPrompt}`);
      setTimeout(() => {
        XTermMethods.setValue(term.current);
      }, 0);

      term.current.onKey(({ key, domEvent }) => {
        if (!term.current) return;

        if (domEvent.key === "Enter") {
          XTermMethods.enter(term.current, fullPrompt);
        } else if (domEvent.key === "ArrowUp") {
          domEvent.preventDefault();
          XTermMethods.showHistory(term.current, fullPrompt, -1);
        } else if (domEvent.key === "ArrowDown") {
          domEvent.preventDefault();
          XTermMethods.showHistory(term.current, fullPrompt, 1);
        } else if (domEvent.key === "Backspace") {
          XTermMethods.backspace(term.current, fullPrompt);
        } else {
          XTermMethods.type(term.current, key, fullPrompt, domEvent);
        }
      });

      return () => {
        term.current?.dispose();
      };
    }
  }, [isIntroLoaded]);

  useEffect(() => {
    if (!isIntroLoaded && term.current) {
      const termWidth = term.current.cols; 
      const introMessages = getTerminalIntroMessages(termWidth);
      TypeAnimation(term.current, introMessages).then(() => {
        setIsIntroLoaded(true);
      });
    }
  }, [isIntroLoaded]);

  return (
    <div ref={terminalRef} style={{ width: "100%", height: "100%", overflow: "hidden" }} />
  );
};

export default XTermComponent;
