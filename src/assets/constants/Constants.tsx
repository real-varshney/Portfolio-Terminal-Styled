interface MenuItem {
  icon: string;
  heading: string;
  headingColor: string;
  description: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    icon: "🚀",
    heading: "Projects",
    headingColor: "\x1b[92m", // Green
    description: "View my past work",
  },
  {
    icon: "💬",
    heading: "Contact",
    headingColor: "\x1b[95m", // Magenta
    description: "Get in touch with me",
  },
  {
    icon: "📖",
    heading: "About",
    headingColor: "\x1b[93m", // Yellow
    description: "Learn more about me",
  },
  {
    icon: "🎮",
    heading: "Hidden Secrets",
    headingColor: "\x1b[91m", // Red
    description: "Hidden surprises await",
  },
  {
    icon: "❓",
    heading: "Help",
    headingColor: "\x1b[97m", // White
    description: "Type 'help' to see commands",
  },
];

export const availableCommands = ["ls", "ls -l", "cat", "cd", "pwd", "clear", "cls", "help", "about", "tree", "echo", "whoami"];

export const fullPrompt = 'portfolio@vishal.varshney ~$ \u200B';
