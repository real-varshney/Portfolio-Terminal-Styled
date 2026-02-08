import { Terminal } from "xterm";
import {
  FileSystemNavigator,
  isKnownUnsupportedCommand,
  parseCommand,
} from "./VirtualFileSystem";
import highlightDynamicLinks from "./highlightDynamicLinks";
import prompts from "../assets/templates/prompts.json";
import { availableCommands } from "../assets/constants/Constants";
import { SpaceInvadersGame } from "./SpaceInvadersGame";

export const XTermMethods = {
  terminalState: { originalLineY: 1, linesJumped: 0 },
  history: [] as string[],
  historyIndex: -1,
  navigator: new FileSystemNavigator(),
  isCatMode: false,
  catFileName: null as string | null,
  catAppend: false,
  catBuffer: [] as string[],
  isGameMode: false,
  game: null as SpaceInvadersGame | null,

  type: (
    term: any,
    key: string,
    promptName: string,
    domEvent: KeyboardEvent,
  ) => {
    if (!term) return;

    if (XTermMethods.isGameMode) {
        return;
    }

    if (XTermMethods.isCatMode) {
        term.write(key);
        return;
    }

    const cursorY = term.buffer.active.cursorY;
    const cursorX = term.buffer.active.cursorX;
    const isPrintableCharacter = domEvent.key.length === 1;

    XTermMethods.terminalState.linesJumped =
      cursorY - XTermMethods.terminalState.originalLineY;
    if (domEvent.key === "ArrowUp") {
      XTermMethods.showHistory(term, promptName, -1);
    } else if (domEvent.key === "Tab") {
      XTermMethods.autocomplete(term, promptName);
      return;
    } else if (domEvent.key === "ArrowLeft") {
      XTermMethods.handleLine(term, promptName, domEvent);
    } else if (domEvent.key === "ArrowRight") {
      XTermMethods.handleLine(term, promptName, domEvent);
    }
    if (
      cursorY < XTermMethods.terminalState.originalLineY &&
      isPrintableCharacter
    ) {
      return;
    }

    if (XTermMethods.terminalState.linesJumped > 0) {
      term.write(key);
      return;
    } else if (cursorX < promptName.length - 1 && isPrintableCharacter) {
      return;
    }

    term.write(key);
  },

  backspace: (term: any, promptName: string) => {
    if (!term) return;

    if (XTermMethods.isGameMode) return;

    if (XTermMethods.isCatMode) {
      if (term.buffer.active.cursorX > 0) {
        term.write("\b \b");
      }
      return;
    }

    const cursorX = term.buffer.active.cursorX;
    const cursorY = term.buffer.active.cursorY;
    
    // Use a cleaned version of the prompt for length calculation
    const cleanPrompt = promptName.replace(/\u200B/g, "");
    const promptLength = cleanPrompt.length;

    // Safety check: prevent deleting if we are behind the prompt's Y level
    if (cursorY < XTermMethods.terminalState.originalLineY) return;

    // Handle jumping back to the previous line if user typed a long command
    if (cursorX === 0 && cursorY > XTermMethods.terminalState.originalLineY) {
      term.write("\x1b[A\x1b[999C \x1b[D");
      XTermMethods.terminalState.linesJumped--;
      return;
    }

    // Stop at the prompt on the original line
    if (cursorY === XTermMethods.terminalState.originalLineY) {
        if (cursorX > promptLength) {
            term.write("\b \b");
        }
    } else {
        // We are on a wrapped line, backspace is safe
        term.write("\b \b");
    }
  },

  
  enter: (term: any, promptName: string) => {
    if (!term) return;

    const buffer = (term as any)._core.buffer;
    const currentLine = buffer.lines
      .get(buffer.ybase + buffer.y)
      ?.translateToString()
      .trim();

    if (XTermMethods.isGameMode) {
        return;
    }

    if (XTermMethods.isCatMode) {
        XTermMethods.catBuffer.push(currentLine || '');
        term.write("\r\n");
        return;
    }
    
    // Extract command by removing the full prompt
    const command = currentLine.startsWith(promptName)
      ? currentLine.slice(promptName.length).trim()
      : currentLine;

    if (command) {
      XTermMethods.history.push(command); // Save command in history
      XTermMethods.historyIndex = XTermMethods.history.length; // Reset index
    }
    term.write("\r\n");
    handleCommand(term, command);
  },

  saveCatFile: () => {
    if (XTermMethods.catFileName) {
        const content = XTermMethods.catBuffer.join('\n');
        XTermMethods.navigator.echoToFile(content, XTermMethods.catFileName, XTermMethods.catAppend);
    }
    XTermMethods.isCatMode = false;
    XTermMethods.catFileName = null;
    XTermMethods.catAppend = false;
    XTermMethods.catBuffer = [];
  },

  startGame: (term: any) => {
    XTermMethods.isGameMode = true;
    XTermMethods.game = new SpaceInvadersGame(term);
    XTermMethods.game.start();
  },

  exitGame: (term: any) => {
    if (XTermMethods.game) {
        XTermMethods.game.stop();
        XTermMethods.game = null;
    }
    XTermMethods.isGameMode = false;
    term.write('\x1b[2J\x1b[H');
    term.write('\r\n');
    const prompt = "portfolio@vishal.varshney " + (XTermMethods.navigator?.getCurrentPath() || "~") + "$ \u200B";
    term.write(prompt, () => {
      XTermMethods.setValue(term);
    });
  },

  handleGameInput: (key: string) => {
    if (XTermMethods.game) {
        XTermMethods.game.handleInput(key);
    }
  },

  setValue: (term: any) => {
    setTimeout(() => {
      XTermMethods.terminalState.linesJumped = 0;
      XTermMethods.terminalState.originalLineY = term.buffer.active.cursorY;
    }, 10);
    return;
  },

  showHistory(term: Terminal, prompt: string, direction: number) {
    const { originalLineY } = this.terminalState;

    if (term.buffer.active.cursorY !== originalLineY && direction == 1) {
      // term.write("\x1b[B");
      return;
    } else if (
      term.buffer.active.cursorY !== originalLineY &&
      direction == -1
    ) {
      return;
    }

    if (this.history.length === 0) return;

    const newIndex = this.historyIndex + direction;
    if (newIndex < 0) return;
    if (newIndex >= this.history.length) {
      term.write(`\x1b[J`); // Clears everything below
      term.write(`\x1b[2K\r${prompt}`); // Clears current line
      this.historyIndex = this.history.length;
      return;
    }
    this.historyIndex = newIndex;
    const historyCommand = this.history[this.historyIndex];

    term.write(`\x1b[J`); // Clears everything below
    term.write(`\x1b[2K\r${prompt}${historyCommand}`); // Clears current line & writes history
  },

  handleLine: (term: Terminal, _: string, domEvent: KeyboardEvent) => {
    const { cursorY, cursorX } = term.buffer.active;
    var totalLength = term.buffer.active.getLine(cursorY)?.length;
    if (cursorX == 0 && domEvent.key === "ArrowLeft") {
      domEvent.preventDefault();
      term.write("\x1b[A\x1b[999C");
    } else if (
      cursorX == (totalLength || 0) - 1 &&
      domEvent.key === "ArrowRight"
    ) {
      domEvent.preventDefault();
      term.write("\x1b[B\x1b[999D");
    }
  },

 autocomplete(term: Terminal, prompt: string) {
    const buffer = term.buffer.active;
    const cursorX = buffer.cursorX;
    const line = buffer.getLine(buffer.baseY + buffer.cursorY);
    if (!line) return;

    const cleanPrompt = prompt.replace(/\u200B/g, "");

    let lineUntilCursor = "";
    for (let i = 0; i < cursorX; i++) {
      const cell = line.getCell(i);
      if (cell) lineUntilCursor += cell.getChars();
    }
    lineUntilCursor = lineUntilCursor.replace(/\u200B/g, "");

    let currentInput = "";
    if (lineUntilCursor.startsWith(cleanPrompt)) {
      currentInput = lineUntilCursor.slice(cleanPrompt.length);
    } else {
      currentInput = lineUntilCursor.trimStart(); 
    }

    // 3. Logic for empty input
    if (!currentInput.trim()) {
      const allOptions = [
        ...availableCommands,
        ...(XTermMethods.navigator.getCurrentDirectory()?.children
          ? Object.keys(XTermMethods.navigator.getCurrentDirectory()!.children!)
          : []),
      ];
      term.write("\r\n" + allOptions.join("  ") + "\r\n");
      term.write(prompt + currentInput);
      // Update the reference point so backspace knows where the new prompt is
      XTermMethods.setValue(term);
      return;
    }

    const parts = currentInput.split(/\s+/);
    const command = parts[0];
    const lastPart = parts[parts.length - 1];

    let matches: string[] = [];
    if (parts.length === 1) {
      matches = availableCommands.filter((cmd) => cmd.startsWith(command));
    } else {
      const dir = XTermMethods.navigator.getCurrentDirectory();
      if (dir && dir.children) {
        let candidates = Object.keys(dir.children);
        // Corrected logic: 'cat' looks for files, 'cd' looks for directories
        if (command === "cd") {
          candidates = candidates.filter((key) => dir.children![key].type === "directory");
        } else if (command === "cat") {
          candidates = candidates.filter((key) => dir.children![key].type === "file");
        }
        matches = candidates.filter((item) => item.startsWith(lastPart));
      }
    }

    if (matches.length === 1) {
      const completion = matches[0].slice(lastPart.length);
      term.write(completion);
    } else if (matches.length > 1) {
      term.write("\r\n" + matches.join("  ") + "\r\n");
      term.write(prompt + currentInput);
      // Reset the tracking line so backspace safety persists on the new line
      XTermMethods.setValue(term);
    }
  },
};

const handleCommand = (term: Terminal, command: string | undefined) => {
  if (!command) return;

  const commands = command.split("|").map((cmd) => cmd.trim());

  let output = "";

  for (const cmd of commands) {
    if (output) {
      // If there's output from the previous command, it might be used as input for the next one.
      // For now, we'll just execute them sequentially.
    }

    output = executeCommand(term, cmd);
  }

  // Register link provider then write output

  try {
    highlightDynamicLinks(term, output);
  } catch (e) {
    console.warn("highlightDynamicLinks failed:", e);
  }

  term.write(output);
};

const executeCommand = (term: Terminal, command: string): string => {
  if (!command) return "";

  const normalizedCommand = command.toLowerCase().trim();

  // Handle clear/cls

  if (normalizedCommand === "cls") {
    term.clear();

    return "";
  }
  
  if (normalizedCommand === "sudo space-adventure") {
    XTermMethods.startGame(term);
    return "";
  }

  if (command.startsWith('cat >')) {
    const parts = command.split('>');
    const filename = parts[1].trim();
    if (filename) {
        XTermMethods.isCatMode = true;
        XTermMethods.catFileName = filename;
        XTermMethods.catAppend = false;
        XTermMethods.catBuffer = [];
        return '';
    } else {
        return "cat: missing file operand";
    }
  }

  if (command.startsWith('cat >>')) {
    const parts = command.split('>>');
    const filename = parts[1].trim();
    if (filename) {
        XTermMethods.isCatMode = true;
        XTermMethods.catFileName = filename;
        XTermMethods.catAppend = true;
        const existingContent = XTermMethods.navigator.getCreatedFile(filename);
        XTermMethods.catBuffer = existingContent ? existingContent.split('\n') : [];
        return '';
    } else {
        return "cat: missing file operand";
    }
  }


  // Parse the command

  const parsed = parseCommand(command);

  let output = "";

  // Handle file system commands

  if (parsed.command === "ls") {
    const longFormat = parsed.flags["l"] || command.includes("-l");

    output = XTermMethods.navigator.ls(longFormat);
  } else if (parsed.command === "cd") {
    output = XTermMethods.navigator.cd(parsed.args[0] || "");
  } else if (parsed.command === "cat") {
    if (parsed.args.length === 0) {
      output = "cat: missing file operand";
    } else {
      output = XTermMethods.navigator.cat(parsed.args[0]);
    }
  } else if (parsed.command === "pwd") {
    output = XTermMethods.navigator.getCurrentPath();
  } else if (parsed.command === "help") {
    output = prompts.VISIBLE.HELP;
  } else if (isKnownUnsupportedCommand(command)) {
    output = prompts.VISIBLE.UNSUPPORTED;
  } else {
    output = prompts.VISIBLE.UNKNOWN;
  }

  return output;
};
