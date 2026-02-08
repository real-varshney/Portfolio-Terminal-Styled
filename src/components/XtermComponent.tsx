import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "xterm/css/xterm.css";
import { XTermMethods } from "../utils/XTermMethods";
import { getTerminalIntroMessages } from "./IntroLoader";
import TypeAnimation from "../utils/TypeAnimation";
import highlightDynamicLinks from "../utils/highlightDynamicLinks";

const XTermComponent = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const [isIntroLoaded, setIsIntroLoaded] = useState(false);
  const skipIntroRef = useRef<(() => void) | null>(null);
  const isIntroLoadedRef = useRef(false);
  const isPromptReadyRef = useRef(false);

  const getPrompt = () => {
    const path = XTermMethods.navigator?.getCurrentPath() || "~";
    return `portfolio@vishal.varshney ${path}$ \u200B`;
  };

  useEffect(() => {
    isIntroLoadedRef.current = isIntroLoaded;
  }, [isIntroLoaded]);

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

      // Focus the terminal so Enter key works immediately
      term.current.focus();

      // Set up unified key handler
      term.current.onKey(({ key, domEvent }) => {
        if (!term.current) return;

        if (XTermMethods.isGameMode) {
            if (domEvent.ctrlKey && domEvent.key === 'd') {
                domEvent.preventDefault();
                XTermMethods.exitGame(term.current);
            } else {
                XTermMethods.handleGameInput(key);
            }
            return;
        }

        if (XTermMethods.isCatMode) {
            if (domEvent.ctrlKey && domEvent.key === 'd') {
                domEvent.preventDefault();
                XTermMethods.saveCatFile();
                const newPrompt = getPrompt();
                term.current.write(`\r\n${newPrompt}`);
            } else if (domEvent.key === "Enter") {
                const prompt = getPrompt();
                XTermMethods.enter(term.current, prompt);
            } else if (domEvent.key === "Backspace") {
                XTermMethods.backspace(term.current, "");
            } else {
                XTermMethods.type(term.current, key, '', domEvent);
            }
            return;
        }

        if (domEvent.key === "Enter") {
          // During intro, skip animation
          if (!isIntroLoadedRef.current && skipIntroRef.current) {
            domEvent.preventDefault();
            skipIntroRef.current();
            return;
          }
          // After intro, execute command
          if (isIntroLoadedRef.current && isPromptReadyRef.current) {
            const oldPrompt = getPrompt();
            XTermMethods.enter(term.current, oldPrompt);
            if (XTermMethods.isCatMode) {
              term.current.write("\r\n");
            } else {
              const newPrompt = getPrompt();
              term.current.write(`\r\n${newPrompt}`, () => {
                XTermMethods.setValue(term.current);
              });
            }
          }
        } else if (domEvent.key === "ArrowUp") {
          if (isIntroLoadedRef.current && isPromptReadyRef.current) {
            domEvent.preventDefault();
            const prompt = getPrompt();
            XTermMethods.showHistory(term.current, prompt, -1);
          }
        } else if (domEvent.key === "ArrowDown") {
          if (isIntroLoadedRef.current && isPromptReadyRef.current) {
            domEvent.preventDefault();
            const prompt = getPrompt();
            XTermMethods.showHistory(term.current, prompt, 1);
          }
        } else if (domEvent.key === "Backspace") {
          if (isIntroLoadedRef.current && isPromptReadyRef.current) {
            const prompt = getPrompt();
            XTermMethods.backspace(term.current, prompt);
          }
        } else {
          if (isIntroLoadedRef.current && isPromptReadyRef.current) {
            const prompt = getPrompt();
            XTermMethods.type(term.current, key, prompt, domEvent);
          }
        }
      });
    }

    return () => {
      term.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (isIntroLoaded && term.current) {
      const prompt = getPrompt();
      term.current.write(`\r\n${prompt}`, () => {
        XTermMethods.setValue(term.current);
        isPromptReadyRef.current = true;
      });
    }
  }, [isIntroLoaded]);

  useEffect(() => {
    if (!isIntroLoaded && term.current) {
      const termWidth = term.current.cols; 
      // Ensure dynamic link provider is registered before intro renders
      try {
        highlightDynamicLinks(term.current, "");
      } catch (e) {
        console.warn("early link registration failed:", e);
      }
      const introMessages = getTerminalIntroMessages(termWidth);
      const { promise, skip } = TypeAnimation(term.current, introMessages);
      skipIntroRef.current = skip;
      
      promise.then(() => {
        setIsIntroLoaded(true);
      });
    }
  }, []);

  return (
    <div ref={terminalRef} style={{ width: "100%", height: "100%", overflow: "hidden" }} />
  );
};

export default XTermComponent;
