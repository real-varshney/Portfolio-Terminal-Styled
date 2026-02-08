import { Terminal } from "xterm";

export class SpaceInvadersGame {
  private term: Terminal;
  private intervalId: any = null;
  private score: number = 0;
  private highScore: number = 0;
  private playerX: number = 0;
  // Bullets now store their own color code
  private bullets: { x: number; y: number; color: string }[] = [];
  private aliens: { x: number; y: number }[] = [];
  private alienDirection: number = 1;
  private alienMoveCounter: number = 0;
  private alienMoveThreshold: number = 10;
  private gameWidth: number = 0;
  private gameHeight: number = 0;
  private isGameOver: boolean = false;

  // ANSI Color Palette
  private readonly COLORS = {
    RESET: "\x1b[0m",
    PLAYER: "\x1b[1;32m", // Bright Green
    ALIEN: "\x1b[1;35m",  // Bright Magenta
    GAMEOVER: "\x1b[1;31m", // Bright Red
    SCORE: "\x1b[1;36m",  // Cyan
  };

  // Bullet Color Palette
  private readonly BULLET_PALETTE = [
    "\x1b[1;31m", // Red
    "\x1b[1;33m", // Yellow
    "\x1b[1;34m", // Blue
    "\x1b[1;35m", // Magenta
    "\x1b[1;36m", // Cyan
    "\x1b[1;37m", // White
  ];

  constructor(term: Terminal) {
    this.term = term;
    this.gameWidth = term.cols;
    this.gameHeight = term.rows;
    this.playerX = Math.floor(this.gameWidth / 2);

    const savedScore = localStorage.getItem("spaceInvadersHighScore");
    this.highScore = savedScore ? parseInt(savedScore, 10) : 0;
  }

  start() {
    this.term.clear();
    this.term.write("\x1b[?25l"); // Hide cursor
    this.initAliens();
    this.intervalId = setInterval(() => this.loop(), 50);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.term.write("\x1b[?25h"); // Show cursor
    this.term.clear();
  }

  handleInput(key: string) {
    if (this.isGameOver) return;

    if (key === '\x1b[D') { // Left
      this.playerX = Math.max(3, this.playerX - 2);
    } else if (key === '\x1b[C') { // Right
      this.playerX = Math.min(this.gameWidth - 3, this.playerX + 2);
    } else if (key === ' ') {
      this.shoot();
    }
  }

  private initAliens() {
    this.aliens = [];
    const rows = 3;
    const cols = 6;
    const alienWidth = 5; // -(o)- is 5 chars
    const spacing = 3;
    const totalWidth = cols * (alienWidth + spacing);
    const startX = Math.floor((this.gameWidth - totalWidth) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.aliens.push({ x: startX + c * (alienWidth + spacing), y: r + 3 });
      }
    }
  }

  private shoot() {
    // Pick a random color for this specific bullet
    const randomColor = this.BULLET_PALETTE[Math.floor(Math.random() * this.BULLET_PALETTE.length)];
    this.bullets.push({ 
        x: this.playerX, 
        y: this.gameHeight - 2,
        color: randomColor 
    });
  }

  private loop() {
    if (this.isGameOver) {
      this.drawGameOver();
      return;
    }
    this.update();
    this.draw();
  }

  private update() {
    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].y--;
      if (this.bullets[i].y < 0) this.bullets.splice(i, 1);
    }

    // Move Aliens
    this.alienMoveCounter++;
    if (this.alienMoveCounter >= this.alienMoveThreshold) {
      this.alienMoveCounter = 0;
      let hitEdge = false;
      for (const a of this.aliens) {
        if ((this.alienDirection === 1 && a.x >= this.gameWidth - 7) ||
            (this.alienDirection === -1 && a.x <= 2)) {
          hitEdge = true;
          break;
        }
      }

      if (hitEdge) {
        this.alienDirection *= -1;
        for (const a of this.aliens) a.y++;
      } else {
        for (const a of this.aliens) a.x += this.alienDirection;
      }
    }

    // Collision Logic
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let hit = false;
      for (let j = this.aliens.length - 1; j >= 0; j--) {
        const a = this.aliens[j];
        // Alien "hitbox" is 5 chars wide: -(o)-
        if (b.x >= a.x && b.x <= a.x + 4 && b.y === a.y) {
          this.aliens.splice(j, 1);
          this.bullets.splice(i, 1);
          this.score += 10;
          hit = true;
          break;
        }
      }
      if (hit && this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem("spaceInvadersHighScore", this.highScore.toString());
      }
    }

    if (this.aliens.length === 0) {
      this.initAliens();
      this.alienMoveThreshold = Math.max(2, this.alienMoveThreshold - 2);
    }

    for (const a of this.aliens) {
      if (a.y >= this.gameHeight - 2) this.isGameOver = true;
    }
  }

  private draw() {
    this.term.write('\x1b[2J'); // Clear

    // UI
    this.term.write(`\x1b[1;1H${this.COLORS.SCORE}SCORE: ${this.score}   HIGH: ${this.highScore}${this.COLORS.RESET}`);

    // Draw Aliens: -(o)-
    this.term.write(this.COLORS.ALIEN);
    for (const a of this.aliens) {
      this.term.write(`\x1b[${a.y};${a.x}H-(o)-`);
    }

    // Draw Bullets with their unique random colors
    for (const b of this.bullets) {
      this.term.write(`${b.color}\x1b[${b.y};${b.x}H!\x1b[0m`);
    }

    // Draw Player: /_^_\\
    this.term.write(`\x1b[${this.gameHeight - 1};${this.playerX - 2}H${this.COLORS.PLAYER}/_^_\\${this.COLORS.RESET}`);
  }

  private drawGameOver() {
    this.term.write('\x1b[2J');
    const cy = Math.floor(this.gameHeight / 2);
    const msg = "--- GAME OVER ---";
    this.term.write(`\x1b[${cy};${Math.floor((this.gameWidth - msg.length) / 2)}H${this.COLORS.GAMEOVER}${msg}${this.COLORS.RESET}`);
    this.term.write(`\x1b[${cy + 2};${Math.floor((this.gameWidth - 15) / 2)}HScore: ${this.score}`);
  }
}