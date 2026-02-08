// Virtual file system for the terminal - populated from prompts.json
import prompts from "../assets/templates/prompts.json";

interface FileSystemItem {
  type: 'file' | 'directory';
  name: string;
  content?: string;
  children?: Record<string, FileSystemItem>;
  description?: string;
}

interface VirtualFS {
  [key: string]: FileSystemItem;
}

// Build file system from prompts.json FILESYSTEM section
const buildFileSystem = (): VirtualFS => {
  const fsData = (prompts as any).FILESYSTEM || {};
  const fs: VirtualFS = {};

  // Process each top-level directory
  for (const [dirName, dirContent] of Object.entries(fsData)) {
    const dir = dirContent as any;
    fs[dirName] = {
      type: 'directory',
      name: dirName,
      description: dir.description,
      children: {}
    };

    // Add files to the directory
    if (dir.files) {
      for (const [fileName, fileContent] of Object.entries(dir.files)) {
        const file = fileContent as any;
        (fs[dirName].children![fileName] as FileSystemItem) = {
          type: 'file',
          name: fileName,
          content: file.content
        };
      }
    }

    // Add subdirectories
    if (dir.subdirectories) {
      for (const [subDirName, subDirContent] of Object.entries(dir.subdirectories)) {
        const subDir = subDirContent as any;
        (fs[dirName].children![subDirName] as FileSystemItem) = {
          type: 'directory',
          name: subDirName,
          description: subDir.description,
          children: {}
        };

        // Add files to subdirectory
        if (subDir.files) {
          const subDirChildren = (fs[dirName].children![subDirName] as FileSystemItem).children!;
          for (const [fileName, fileContent] of Object.entries(subDir.files)) {
            const file = fileContent as any;
            subDirChildren[fileName] = {
              type: 'file',
              name: fileName,
              content: file.content
            };
          }
        }
      }
    }
  }

  return fs;
};

export const fileSystem = buildFileSystem();

export interface ParsedCommand {
  command: string;
  args: string[];
  flags: Record<string, boolean>;
}

export const parseCommand = (input: string): ParsedCommand => {
  const parts = input.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args: string[] = [];
  const flags: Record<string, boolean> = {};

  for (let i = 1; i < parts.length; i++) {
    if (parts[i].startsWith('-')) {
      flags[parts[i].substring(1)] = true;
    } else {
      args.push(parts[i]);
    }
  }

  return { command, args, flags };
};

export class FileSystemNavigator {
  private currentPath: string[] = [];
  private localStorageKey = "virtual_fs_created_files";
  private createdFiles: Record<string, string> = {};

  constructor() {
    this.currentPath = [];
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const storedFiles = localStorage.getItem(this.localStorageKey);
      if (storedFiles) {
        this.createdFiles = JSON.parse(storedFiles);
      }
    } catch (e) {
      console.error("Failed to load created files from localStorage:", e);
      this.createdFiles = {};
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.createdFiles));
    } catch (e) {
      console.error("Failed to save created files to localStorage:", e);
    }
  }

  getCurrentPath(): string {
    return this.currentPath.length === 0 ? '~' : `~/${this.currentPath.join('/')}`;
  }


  getCurrentDirectory(): FileSystemItem | null {
    const staticFsDir = this.getStaticDirectory();
    const createdFilesInDir = this.getCreatedFilesInCurrentDir();

    const children: Record<string, FileSystemItem> = { ...staticFsDir?.children };

    for (const [filename, content] of Object.entries(createdFilesInDir)) {
      children[filename] = {
        type: 'file',
        name: filename,
        content: content,
      };
    }

    if (this.currentPath.length === 0) {
      return {
        type: 'directory',
        name: 'root',
        children: children,
      };
    }
    
    return {
        type: 'directory',
        name: this.currentPath[this.currentPath.length-1],
        children: children
    };
  }
  
  private getStaticDirectory(): FileSystemItem | null {
      if (this.currentPath.length === 0) {
        return {
            type: 'directory',
            name: 'root',
            children: fileSystem
        };
      }
  
      let current_dir: any = fileSystem;
      for (const part of this.currentPath) {
        if (current_dir[part]?.type === 'directory') {
            current_dir = current_dir[part].children || {};
        } else if (current_dir.children && current_dir.children[part]?.type === 'directory') {
            current_dir = current_dir.children[part].children || {};
        } else {
          return null;
        }
      }
      return { type: 'directory', name: 'current', children: current_dir };
  }

  private getCreatedFilesInCurrentDir(): Record<string, string> {
    const currentPathStr = this.getCreatedFilePath();
    const files: Record<string, string> = {};
    for (const [key, content] of Object.entries(this.createdFiles)) {
      if (key.startsWith(currentPathStr + '/') && !key.substring(currentPathStr.length + 1).includes('/')) {
        const filename = key.substring(currentPathStr.length + 1);
        files[filename] = content;
      }
    }
    return files;
  }

  getCreatedFilePath(): string {
    return this.currentPath.join('/');
  }

  getCreatedFile(filename: string): string | null {
    const key = `${this.getCreatedFilePath()}/${filename}`;
    return this.createdFiles[key] || null;
  }

  createFile(filename: string, content: string): string {
    const key = `${this.getCreatedFilePath()}/${filename}`;
    this.createdFiles[key] = content;
    this.saveToLocalStorage();
    return ``;
  }

  ls(longFormat: boolean = false): string {
    const dir = this.getCurrentDirectory();
    if (!dir || !dir.children) return 'Directory not found';

    let output = '';
    const items = (Object.values(dir.children).filter(item => item && item.name) as FileSystemItem[]);

    if (longFormat) {
      output = 'total ' + items.length + '\r\n';
      for (const item of items) {
        const type = item.type === 'directory' ? 'd' : '-';
        const size = item.content ? item.content.length : 0;
        const date = new Date().toLocaleDateString();
        output += `${type}rw-r--r--  1 user  staff  ${size.toString().padStart(5)}  ${date}  ${item.name}`;
        if (item.type === 'directory') output += '/';
        output += '\r\n';
      }
    } else {
      for (const item of items) {
        let line = '';
        if (item.type === 'directory') {
          line += `${item.name}/`;
          if (item.description) {
            line += ` - ${item.description}`;
          }
        } else {
          line += item.name;
        }
        output += line + '\r\n';
      }
    }

    return output.trim();
  }

  cat(filename: string): string {
    // Check created files first
    const createdFile = this.getCreatedFile(filename);
    if (createdFile) {
      return createdFile.replace(/\n/g, '\r\n');
    }

    const dir = this.getStaticDirectory();
    if (!dir || !dir.children) return 'Directory not found';

    const item = (dir.children as any)[filename];
    if (!item) return `cat: ${filename}: No such file or directory`;
    if (item.type === 'directory') return `cat: ${filename}: Is a directory`;

    // Left-align content and handle newlines
    return (item.content || '').replace(/\n/g, '\r\n');
  }

  touchFile(filename: string): string {
    if (!filename) return 'Usage: touch <filename>';
    if (filename.includes('/')) return 'touch: cannot create file with path separators';
    
    const createdFile = this.getCreatedFile(filename);
    if (createdFile !== null) {
      return `touch: ${filename}: File already exists`;
    }

    return this.createFile(filename, '');
  }

  echoToFile(content: string, filename: string, append: boolean = false): string {
    if (!filename) return 'Usage: echo <text> > <filename>';
    
    const key = `${this.getCreatedFilePath()}/${filename}`;
    if (append) {
      const existing = this.createdFiles[key] || '';
      this.createdFiles[key] = existing + '\n' + content;
    } else {
      this.createdFiles[key] = content;
    }
    this.saveToLocalStorage();
    return '';
  }

  cd(path: string): string {
    if (path === '~' || path === '' || path === '~/') {
      this.currentPath = [];
      return '';
    }

    const originalPath = [...this.currentPath]; // Backup current path

    let pathParts: string[];

    if (path.startsWith('~/')) {
      this.currentPath = [];
      pathParts = path.substring(2).split('/').filter(p => p);
    } else if (path.startsWith('/')) {
      // Absolute path from root
      this.currentPath = [];
      pathParts = path.substring(1).split('/').filter(p => p);
    } else {
      // Relative path
      pathParts = path.split('/').filter(p => p);
    }

    for (const part of pathParts) {
      if (part === '..') {
        if (this.currentPath.length > 0) {
          this.currentPath.pop();
        }
      } else if (part !== '.') {
        const dir = this.getCurrentDirectory();
        if (dir && dir.children && dir.children[part] && dir.children[part].type === 'directory') {
          this.currentPath.push(part);
        } else {
          this.currentPath = originalPath; // Revert path
          return `cd: no such file or directory: ${path}`;
        }
      }
    }

    return '';
  }
}

export const SUPPORTED_COMMANDS = [
  'ls',
  'ls -l',
  'cat',
  'cd',
  'pwd',
  'clear',
  'cls',
  'help',
  'tree',
  'whoami',
  'echo'
];

export const KNOWN_UNSUPPORTED_COMMANDS = [
  'sudo game',
  'sudo',
  'mkdir',
  'touch',
  'rm',
  'cp',
  'mv',
  'grep',
  'find',
  'chmod',
  'chown'
];

export const isKnownUnsupportedCommand = (command: string): boolean => {
  const normalized = command.toLowerCase().trim();
  return KNOWN_UNSUPPORTED_COMMANDS.some(
    cmd => normalized === cmd || normalized.startsWith(cmd + ' ')
  );
};
