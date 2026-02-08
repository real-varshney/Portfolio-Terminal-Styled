import { Terminal, ILink, ILinkProvider } from "xterm";
import prompts from "../assets/templates/prompts.json";

interface LinkEntry {
  type: string;
  value: string;
  key: string;
  color?: string;
  startOffset?: number;
  endOffset?: number;
}

const highlightDynamicLinks = (term: Terminal, text: string) => {
  const linkEntries: LinkEntry[] = prompts.HIDDEN.LINKS || [];
  if (linkEntries.length === 0) {
    term.write(text);
    return text;
  }

  const stripAnsi = (s: string) => {
    return s.replace(/\x1b\[[^m]*m/g, "").replace(/\x1b\[.*?[\w]/g, "");
  };

  const getCellColor = (term: Terminal, lineNumber: number, charIndex: number) => {
    const line = term.buffer.active.getLine(lineNumber - 1);
    if (!line) return null;
    
    // xterm uses visual columns, we need to skip to the actual cell position
    let visualPos = 0;
    let cellIndex = 0;
    
    while (cellIndex < line.length && visualPos < charIndex) {
      const cell = line.getCell(cellIndex);
      if (!cell) break;
      
      const char = cell.getChars();
      const charWidth = cell.getWidth();
      const codePoint = char.codePointAt(0) || 0;
      const isEmoji = codePoint > 0x1F000;
      
      visualPos += isEmoji ? 2 : (charWidth || 1);
      cellIndex++;
    }
    
    // Check the cell at this position for foreground color
    if (cellIndex > 0) {
      cellIndex--; // Back up to the cell we're on
    }
    
    const cell = line.getCell(cellIndex);
    if (!cell) return null;
    
    // xterm stores colors as integers in the fg property
    // 0 = default foreground, anything else = colored
    const cellAny = cell as any;
    return cellAny.fg && cellAny.fg !== 0 ? cellAny.fg : null;
  };

  const getVisualWidthUpTo = (s: string, charIndex: number) => {
    let visualWidth = 0;
    for (let i = 0; i < charIndex && i < s.length; i++) {
      const char = s[i];
      if (char === '\x1b') {
        while (i < s.length && s[i] !== 'm') i++;
      } else {
        const code = char.codePointAt(0) || 0;
        visualWidth += code > 0x1F000 ? 2 : 1;
      }
    }
    return visualWidth;
  };

  const anyTerm = term as any;
  if (!anyTerm.__linkProviderRegistered) {
    const provider: ILinkProvider = {
      provideLinks: (lineNumber, callback) => {
        const links: ILink[] = [];
        const rawLine = term.buffer.active.getLine(lineNumber - 1)?.translateToString() || "";

        const promptPrefix = "portfolio@vishal.varshney ~$ ";
        const cleanRawLine = stripAnsi(rawLine);
        if (cleanRawLine.startsWith(promptPrefix)) {
          callback([]);
          return;
        }

        for (const entry of linkEntries) {
          const keyword = entry.key;
          const lowerKeyword = keyword.toLowerCase();
          const lowerRawLine = rawLine.toLowerCase();
          
          let searchIndex = 0;
          while (true) {
            const found = lowerRawLine.indexOf(lowerKeyword, searchIndex);
            if (found === -1) break;

            const cleanLine = stripAnsi(rawLine);
            const cleanFound = stripAnsi(rawLine.substring(0, found)).length + lowerKeyword.length;
            const beforeChar = cleanFound > lowerKeyword.length ? cleanLine[cleanFound - lowerKeyword.length - 1] : undefined;
            const afterChar = cleanLine[cleanFound];
            const isWordChar = (ch: string | undefined) => !!ch && /[A-Za-z0-9_]/.test(ch);

            if (!isWordChar(beforeChar) && !isWordChar(afterChar)) {
              const visualStart = getVisualWidthUpTo(rawLine, found);
              const visualEnd = visualStart + keyword.length;

              const cellFg = getCellColor(term, lineNumber, visualStart);
              const entryColor = entry.color;

              // Check if we should apply offset: only if entry has color AND cell has matching color
              let shouldApplyOffset = false;
              if (entryColor) {
                // For now, if cell has any non-default foreground, consider it colored
                shouldApplyOffset = !!cellFg;
              }
              if(entry.key.toLowerCase() === 
                "About"
              ){
                console.log("Applying offset for About link:", { cellFg, entryColor, shouldApplyOffset });
              }

              const startOffset = shouldApplyOffset ? (entry.startOffset ?? 0) : 0;
              const endOffset = shouldApplyOffset ? (entry.endOffset ?? 0) : 0;

              const link: ILink = {
                range: {
                  start: { x: visualStart + startOffset + 1, y: lineNumber },
                  end: { x: visualEnd + endOffset, y: lineNumber },
                },
                text: keyword,
                activate: () => {
                  if (entry.type === "URL") {
                    window.open(entry.value, "_blank");
                  } else {
                    term.write(`${entry.value}`);
                  }
                },
              };
              links.push(link);
            }

            searchIndex = found + lowerKeyword.length;
          }
        }

        callback(links);
      },
    };

    term.registerLinkProvider(provider);
    anyTerm.__linkProviderRegistered = true;
  }

  return text;
};

export default highlightDynamicLinks;
