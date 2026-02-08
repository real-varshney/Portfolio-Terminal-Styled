import { Terminal } from "xterm";

export class SpaceInvadersGame {
  private term: Terminal;
  private intervalId: any = null;
  private score: number = 0;
  private highScore: number = 0;
  private playerX: number = 0;
  private bullets: { x: number; y: number }[] = [];
  private enemies: { x: number; y: number }[] = [];
  private enemyDirection: number = 1; // 1 for right, -1 for left
  private gameWidth: number = 0;
  private gameHeight: number = 0;
  private isGameOver: boolean = false;
  private lastEnemyMoveTime: number = 0;
  private enemyMoveInterval: number = 800;

  constructor(term: Terminal) {
    this.term = term;
    const savedScore = localStorage.getItem("spaceInvadersHighScore");
    this.highScore = savedScore ? parseInt(savedScore, 10) : 0;
  }

  start() {
    this.term.clear();
    this.term.write('\x1b[?25l'); // Hide cursor
    this.gameWidth = this.term.cols;
    this.gameHeight = this.term.rows;
    this.playerX = Math.floor(this.gameWidth / 2);
    this.score = 0;
    this.isGameOver = false;
    this.bullets = [];
    this.enemies = [];
    this.enemyMoveInterval = 800;
    this.lastEnemyMoveTime = Date.now();
    
    this.initEnemies();
    this.renderFull();

    this.intervalId = setInterval(() => {
      this.update();
      this.render();
    }, 50); // ~20 FPS
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.term.write('\x1b[?25h'); // Show cursor
    this.term.clear();
  }

  handleInput(key: string) {
    if (this.isGameOver) {
      if (key.toLowerCase() === 'r') {
        this.stop();
        this.start();
      }
      return;
    }

    // Clear player previous position to prevent trailing
    this.drawAt(this.playerX, this.gameHeight - 1, ' ');

    if (key === '\x1b[D') { // Left Arrow
      this.playerX = Math.max(0, this.playerX - 1);
    } else if (key === '\x1b[C') { // Right Arrow
      this.playerX = Math.min(this.gameWidth - 1, this.playerX + 1);
    } else if (key === ' ') { // Space to shoot
      this.bullets.push({ x: this.playerX, y: this.gameHeight - 2 });
    }

    // Draw player new position immediately for responsiveness
    this.drawAt(this.playerX, this.gameHeight - 1, '\x1b[32m^\x1b[0m');
  }

  private initEnemies() {
    const rows = 3;
    // Calculate columns based on width, leaving some margin
    const cols = Math.min(10, Math.floor(this.gameWidth / 6));
    const startX = Math.floor((this.gameWidth - (cols * 4)) / 2);
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.enemies.push({
          x: startX + c * 4,
          y: 2 + r * 2
        });
      }
    }
  }

  private update() {
    if (this.isGameOver) return;

    // Update bullets
    // Clear old bullets
    this.bullets.forEach(b => this.drawAt(b.x, b.y, ' '));
    this.bullets = this.bullets.map(b => ({ ...b, y: b.y - 1 })).filter(b => b.y > 0);

    // Update enemies movement
    const now = Date.now();
    if (now - this.lastEnemyMoveTime > this.enemyMoveInterval) {
      this.lastEnemyMoveTime = now;
      
      // Clear old enemies
      this.enemies.forEach(e => this.drawAt(e.x, e.y, '   '));

      let moveDown = false;
      const minX = this.enemies.length > 0 ? Math.min(...this.enemies.map(e => e.x)) : 0;
      const maxX = this.enemies.length > 0 ? Math.max(...this.enemies.map(e => e.x)) : 0;

      if (this.enemyDirection === 1 && maxX >= this.gameWidth - 4) {
        this.enemyDirection = -1;
        moveDown = true;
      } else if (this.enemyDirection === -1 && minX <= 1) {
        this.enemyDirection = 1;
        moveDown = true;
      }

      this.enemies.forEach(e => {
        if (moveDown) e.y++;
        else e.x += this.enemyDirection;
      });

      if (moveDown) {
        // Increase speed as they get closer
        this.enemyMoveInterval = Math.max(100, this.enemyMoveInterval - 50);
      }

      // Check Game Over condition
      if (this.enemies.some(e => e.y >= this.gameHeight - 2)) {
        this.gameOver();
        return;
      }
    }

    // Collision Detection
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        // Simple collision box
        if (b.y === e.y && b.x >= e.x && b.x <= e.x + 2) {
          this.enemies.splice(j, 1);
          this.bullets.splice(i, 1);
          this.score += 10;
          hit = true;
          this.drawAt(e.x, e.y, '   '); // Clear enemy immediately
          break;
        }
      }
      if (hit) continue;
    }

    // Level cleared
    if (this.enemies.length === 0) {
      this.initEnemies();
      this.enemyMoveInterval = Math.max(100, this.enemyMoveInterval - 100);
    }
  }

  private render() {
    if (this.isGameOver) return;

    // HUD
    this.drawAt(1, 1, `Score: ${this.score}  High Score: ${this.highScore}`);

    // Enemies
    this.enemies.forEach(e => this.drawAt(e.x, e.y, '\x1b[31m<M>\x1b[0m'));

    // Bullets
    this.bullets.forEach(b => this.drawAt(b.x, b.y, '\x1b[36m|\x1b[0m'));

    // Player
    this.drawAt(this.playerX, this.gameHeight - 1, '\x1b[32m^\x1b[0m');
  }

  private renderFull() {
    this.term.clear();
    this.render();
  }

  private drawAt(x: number, y: number, text: string) {
    // ANSI escape code for positioning cursor: \x1b[<line>;<column>H
    this.term.write(`\x1b[${y};${x + 1}H${text}`);
  }

  private gameOver() {
    this.isGameOver = true;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("spaceInvadersHighScore", this.highScore.toString());
    }
    this.term.clear();
    const msg = "GAME OVER";
    const scoreMsg = `Final Score: ${this.score}`;
    const restartMsg = "Press 'R' to Restart or Ctrl+D to Exit";
    
    const centerX = Math.floor(this.gameWidth / 2);
    const centerY = Math.floor(this.gameHeight / 2);

    this.drawAt(centerX - Math.floor(msg.length / 2), centerY - 1, `\x1b[31m${msg}\x1b[0m`);
    this.drawAt(centerX - Math.floor(scoreMsg.length / 2), centerY, scoreMsg);
    this.drawAt(centerX - Math.floor(restartMsg.length / 2), centerY + 1, restartMsg);
  }
}
