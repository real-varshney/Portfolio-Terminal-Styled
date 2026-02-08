import { MENU_ITEMS } from "../assets/constants/Constants";

export const getTerminalIntroMessages = (termWidth: number) => {
  const INNER_WIDTH = 73;
  const BORDER_CHAR = "\x1b[94m";
  const RESET = "\x1b[0m";
  
  const boxIndent = Math.max(0, Math.floor((termWidth - INNER_WIDTH - 4) / 2));
  const indent = " ".repeat(boxIndent);

  const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

  const getDisplayWidth = (s: string) => {
    const clean = stripAnsi(s);
    let width = 0;
    let emojiCount = 0;
    
    for (const char of clean) {
      const code = char.codePointAt(0) || 0;
      // Emojis (U+1F000+) are 2 visual width, everything else is 1
      if (code > 0x1F000) {
        width += 0;
        emojiCount++;
      } else {
        width += 1;
      }
    }
    
    // Add 1 extra space per emoji as buffer for terminal rendering
    width += emojiCount;
    return width;
  };

  const centerText = (text: string) => {
    const width = getDisplayWidth(text);
    const padding = Math.max(0, Math.floor((termWidth - width) / 2));
    return " ".repeat(padding) + text;
  };

  const boxRow = (content: string) => {
    const width = getDisplayWidth(content);
    const padding = Math.max(0, INNER_WIDTH - width);
    return `${indent}${BORDER_CHAR}│${RESET}${content}${" ".repeat(padding)}${BORDER_CHAR}│${RESET}`;
  };

  const emptyRow = () => boxRow("");

  const twoColRow = (left: string, right: string) => {
    const leftWidth = getDisplayWidth(left);
    const rightWidth = getDisplayWidth(right);

    if (!right || rightWidth === 0) {
      // Single column case
      const padding = Math.max(0, INNER_WIDTH - leftWidth);
      const content = left + " ".repeat(padding);
      return boxRow(content);
    }

    // Two column case - split available space evenly
    const minGap = 1;
    const availablePerCol = Math.floor((INNER_WIDTH - minGap) / 2);
    
    const leftPadding = Math.max(0, availablePerCol - leftWidth);
    const rightPadding = Math.max(0, availablePerCol - rightWidth);
    const totalGap = INNER_WIDTH - leftWidth - rightWidth - leftPadding - rightPadding;
    
    const content = left + " ".repeat(leftPadding) + " ".repeat(Math.max(1, totalGap)) + right + " ".repeat(rightPadding);
    return boxRow(content);
  };

  const lines: string[] = [
    "",
    centerText("\x1b[93mWelcome, explorer...\x1b[0m"),
    centerText("\x1b[96mYou have entered a realm where ideas become reality.\x1b[0m"),
    "",
    `${indent}${BORDER_CHAR}┌${"─".repeat(INNER_WIDTH)}┐${RESET}`,
    emptyRow(),
  ];

  // Arrange items in pairs (left, right)
  for (let i = 0; i < MENU_ITEMS.length; i += 2) {
    const leftItem = MENU_ITEMS[i];
    const rightItem = MENU_ITEMS[i + 1];

    const leftHeading = `  ${leftItem.headingColor}${leftItem.icon} ${leftItem.heading}${RESET}`;
    const rightHeading = rightItem ? `  ${rightItem.headingColor}${rightItem.icon} ${rightItem.heading}${RESET}` : "";

    lines.push(twoColRow(leftHeading, rightHeading));

    const leftDesc = `   ${leftItem.description}`;
    const rightDesc = rightItem ? `   ${rightItem.description}` : "";

    lines.push(twoColRow(leftDesc, rightDesc));

    if (i + 2 < MENU_ITEMS.length) {
      lines.push(emptyRow());
    }
  }

  lines.push(emptyRow());
  lines.push(`${indent}${BORDER_CHAR}└${"─".repeat(INNER_WIDTH)}┘${RESET}`);
  lines.push("");

  return lines;
};
