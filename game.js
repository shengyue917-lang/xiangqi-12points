/**
 * 中国象棋 - 12分动态积分制竞速对战
 * 核心逻辑与智能 AI 对弈引擎
 */

(function () {
  'use strict';

  // --- 棋子名称与初始布局 ---
  const PIECE_NAMES = {
    red: { k: '帅', a: '仕', e: '相', h: '马', r: '车', c: '炮', p: '兵' },
    black: { k: '将', a: '士', e: '象', h: '马', r: '车', c: '炮', p: '卒' }
  };

  const PIECE_FULL_NAMES = {
    red: { k: '红帅', a: '红仕', e: '红相', h: '红马', r: '红车', c: '红炮', p: '红兵' },
    black: { k: '黑将', a: '黑士', e: '黑象', h: '黑马', r: '黑车', c: '黑炮', p: '黑卒' }
  };

  // 胜利判定目标总分（12分制）
  const WIN_SCORE = 12.0;

  // 初始棋盘 9列 x 10行 (col: 0~8, row: 0~9)
  function createInitialBoard() {
    const board = Array(10).fill(null).map(() => Array(9).fill(null));

    // 黑方 (行 0~3)
    board[0][0] = { color: 'black', type: 'r', id: 'b_r1' };
    board[0][1] = { color: 'black', type: 'h', id: 'b_h1' };
    board[0][2] = { color: 'black', type: 'e', id: 'b_e1' };
    board[0][3] = { color: 'black', type: 'a', id: 'b_a1' };
    board[0][4] = { color: 'black', type: 'k', id: 'b_k' };
    board[0][5] = { color: 'black', type: 'a', id: 'b_a2' };
    board[0][6] = { color: 'black', type: 'e', id: 'b_e2' };
    board[0][7] = { color: 'black', type: 'h', id: 'b_h2' };
    board[0][8] = { color: 'black', type: 'r', id: 'b_r2' };

    board[2][1] = { color: 'black', type: 'c', id: 'b_c1' };
    board[2][7] = { color: 'black', type: 'c', id: 'b_c2' };

    board[3][0] = { color: 'black', type: 'p', id: 'b_p1' };
    board[3][2] = { color: 'black', type: 'p', id: 'b_p2' };
    board[3][4] = { color: 'black', type: 'p', id: 'b_p3' };
    board[3][6] = { color: 'black', type: 'p', id: 'b_p4' };
    board[3][8] = { color: 'black', type: 'p', id: 'b_p5' };

    // 红方 (行 6~9)
    board[6][0] = { color: 'red', type: 'p', id: 'r_p1' };
    board[6][2] = { color: 'red', type: 'p', id: 'r_p2' };
    board[6][4] = { color: 'red', type: 'p', id: 'r_p3' };
    board[6][6] = { color: 'red', type: 'p', id: 'r_p4' };
    board[6][8] = { color: 'red', type: 'p', id: 'r_p5' };

    board[7][1] = { color: 'red', type: 'c', id: 'r_c1' };
    board[7][7] = { color: 'red', type: 'c', id: 'r_c2' };

    board[9][0] = { color: 'red', type: 'r', id: 'r_r1' };
    board[9][1] = { color: 'red', type: 'h', id: 'r_h1' };
    board[9][2] = { color: 'red', type: 'e', id: 'r_e1' };
    board[9][3] = { color: 'red', type: 'a', id: 'r_a1' };
    board[9][4] = { color: 'red', type: 'k', id: 'r_k' };
    board[9][5] = { color: 'red', type: 'a', id: 'r_a2' };
    board[9][6] = { color: 'red', type: 'e', id: 'r_e2' };
    board[9][7] = { color: 'red', type: 'h', id: 'r_h2' };
    board[9][8] = { color: 'red', type: 'r', id: 'r_r2' };

    return board;
  }

  // --- 音效系统 (Web Audio API) ---
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioCtx();
        } catch (e) {
          console.warn('Web Audio init failed:', e);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    playMove() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.09);
      } catch (err) {}
    }

    playCapture() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.14);

        gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
      } catch (err) {}
    }

    playVictory() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const start = this.ctx.currentTime + idx * 0.12;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.35, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(start);
          osc.stop(start + 0.42);
        });
      } catch (err) {}
    }
  }

  // --- 游戏状态对象 ---
  class XiangqiGame {
    constructor() {
      this.sound = new SoundManager();
      this.reset();
    }

    reset() {
      this.board = createInitialBoard();
      this.currentTurn = 'red';
      this.redScore = 0.0;
      this.blackScore = 0.0;
      this.round = 1;
      this.gameOver = false;
      this.winner = null;
      this.selectedPos = null;
      this.legalMoves = [];
      this.moveHistory = [];
      this.lastMove = null;
      this.logs = [];
    }

    getAlivePiecesCount() {
      let count = 0;
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          if (this.board[r][c]) count++;
        }
      }
      return count;
    }

    calculatePieceScore(piece, totalPiecesBeforeCapture) {
      if (!piece) return 0.0;
      switch (piece.type) {
        case 'k': return WIN_SCORE; // 将/帅分值调为 12.0 分（一击必杀）
        case 'r': return 3.0;
        case 'a': return 1.0;
        case 'e': return 1.0;
        case 'p': return 0.5;
        case 'c': return totalPiecesBeforeCapture >= 21 ? 2.0 : 1.5;
        case 'h': return totalPiecesBeforeCapture >= 26 ? 1.5 : 2.0;
        default: return 0.0;
      }
    }

    getMarketInfo() {
      const alive = this.getAlivePiecesCount();

      let horsePrice, horseDesc;
      if (alive >= 26) {
        horsePrice = 1.5;
        const diff = alive - 25;
        horseDesc = `当前盘面 ≥ 26 子 (1.5分)；还差 <b>${diff}</b> 子降至 25 子时升为 <b>2.0分</b>！`;
      } else {
        horsePrice = 2.0;
        horseDesc = `当前盘面 ≤ 25 子，马已升值为 <b>2.0分</b>！`;
      }

      let cannonPrice, cannonDesc;
      if (alive >= 21) {
        cannonPrice = 2.0;
        const diff = alive - 20;
        cannonDesc = `当前盘面 ≥ 21 子 (2.0分)；还差 <b>${diff}</b> 子降至 20 子时降为 <b>1.5分</b>！`;
      } else {
        cannonPrice = 1.5;
        cannonDesc = `当前盘面 ≤ 20 子，炮已降值为 <b>1.5分</b>！`;
      }

      return { alive, horsePrice, horseDesc, cannonPrice, cannonDesc };
    }

    inBounds(c, r) {
      return c >= 0 && c <= 8 && r >= 0 && r <= 9;
    }

    getPiece(c, r) {
      if (!this.inBounds(c, r)) return null;
      return this.board[r][c];
    }

    getAllLegalMoves(forColor) {
      const allMoves = [];
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const piece = this.board[r][c];
          if (piece && piece.color === forColor) {
            const moves = this.getLegalMoves(c, r);
            for (const m of moves) {
              allMoves.push({
                fromC: c,
                fromR: r,
                toC: m.col,
                toR: m.row,
                piece,
                isCapture: m.isCapture,
                targetPiece: m.targetPiece
              });
            }
          }
        }
      }
      return allMoves;
    }

    getLegalMoves(c, r) {
      const piece = this.getPiece(c, r);
      if (!piece) return [];

      const moves = [];
      const addMove = (targetC, targetR) => {
        if (!this.inBounds(targetC, targetR)) return false;
        const targetPiece = this.getPiece(targetC, targetR);
        if (!targetPiece) {
          moves.push({ col: targetC, row: targetR, isCapture: false, targetPiece: null });
          return true;
        } else if (targetPiece.color !== piece.color) {
          moves.push({ col: targetC, row: targetR, isCapture: true, targetPiece });
          return false;
        } else {
          return false;
        }
      };

      const { color, type } = piece;

      switch (type) {
        case 'k': {
          const minCol = 3, maxCol = 5;
          const minRow = color === 'red' ? 7 : 0;
          const maxRow = color === 'red' ? 9 : 2;

          const dirs = [
            { dc: 0, dr: -1 },
            { dc: 0, dr: 1 },
            { dc: -1, dr: 0 },
            { dc: 1, dr: 0 }
          ];

          for (const d of dirs) {
            const nc = c + d.dc;
            const nr = r + d.dr;
            if (nc >= minCol && nc <= maxCol && nr >= minRow && nr <= maxRow) {
              addMove(nc, nr);
            }
          }

          let step = color === 'red' ? -1 : 1;
          let checkR = r + step;
          while (checkR >= 0 && checkR <= 9) {
            const p = this.getPiece(c, checkR);
            if (p) {
              if (p.type === 'k' && p.color !== color) {
                moves.push({ col: c, row: checkR, isCapture: true, targetPiece: p });
              }
              break;
            }
            checkR += step;
          }
          break;
        }

        case 'a': {
          const minCol = 3, maxCol = 5;
          const minRow = color === 'red' ? 7 : 0;
          const maxRow = color === 'red' ? 9 : 2;

          const dirs = [
            { dc: -1, dr: -1 },
            { dc: 1, dr: -1 },
            { dc: -1, dr: 1 },
            { dc: 1, dr: 1 }
          ];

          for (const d of dirs) {
            const nc = c + d.dc;
            const nr = r + d.dr;
            if (nc >= minCol && nc <= maxCol && nr >= minRow && nr <= maxRow) {
              addMove(nc, nr);
            }
          }
          break;
        }

        case 'e': {
          const minRow = color === 'red' ? 5 : 0;
          const maxRow = color === 'red' ? 9 : 4;

          const steps = [
            { dc: -2, dr: -2, eyeC: -1, eyeR: -1 },
            { dc: 2, dr: -2, eyeC: 1, eyeR: -1 },
            { dc: -2, dr: 2, eyeC: -1, eyeR: 1 },
            { dc: 2, dr: 2, eyeC: 1, eyeR: 1 }
          ];

          for (const s of steps) {
            const nc = c + s.dc;
            const nr = r + s.dr;
            const eyeC = c + s.eyeC;
            const eyeR = r + s.eyeR;

            if (this.inBounds(nc, nr) && nr >= minRow && nr <= maxRow) {
              if (!this.getPiece(eyeC, eyeR)) {
                addMove(nc, nr);
              }
            }
          }
          break;
        }

        case 'h': {
          const horseMoves = [
            { dc: -1, dr: -2, legC: 0, legR: -1 },
            { dc: 1, dr: -2, legC: 0, legR: -1 },
            { dc: -1, dr: 2, legC: 0, legR: 1 },
            { dc: 1, dr: 2, legC: 0, legR: 1 },
            { dc: -2, dr: -1, legC: -1, legR: 0 },
            { dc: -2, dr: 1, legC: -1, legR: 0 },
            { dc: 2, dr: -1, legC: 1, legR: 0 },
            { dc: 2, dr: 1, legC: 1, legR: 0 }
          ];

          for (const m of horseMoves) {
            const nc = c + m.dc;
            const nr = r + m.dr;
            const legC = c + m.legC;
            const legR = r + m.legR;

            if (this.inBounds(nc, nr)) {
              if (!this.getPiece(legC, legR)) {
                addMove(nc, nr);
              }
            }
          }
          break;
        }

        case 'r': {
          const dirs = [
            { dc: 0, dr: -1 },
            { dc: 0, dr: 1 },
            { dc: -1, dr: 0 },
            { dc: 1, dr: 0 }
          ];

          for (const d of dirs) {
            let nc = c + d.dc;
            let nr = r + d.dr;
            while (this.inBounds(nc, nr)) {
              const targetPiece = this.getPiece(nc, nr);
              if (!targetPiece) {
                moves.push({ col: nc, row: nr, isCapture: false, targetPiece: null });
              } else {
                if (targetPiece.color !== color) {
                  moves.push({ col: nc, row: nr, isCapture: true, targetPiece });
                }
                break;
              }
              nc += d.dc;
              nr += d.dr;
            }
          }
          break;
        }

        case 'c': {
          const dirs = [
            { dc: 0, dr: -1 },
            { dc: 0, dr: 1 },
            { dc: -1, dr: 0 },
            { dc: 1, dr: 0 }
          ];

          for (const d of dirs) {
            let nc = c + d.dc;
            let nr = r + d.dr;
            let jumped = false;

            while (this.inBounds(nc, nr)) {
              const targetPiece = this.getPiece(nc, nr);
              if (!jumped) {
                if (!targetPiece) {
                  moves.push({ col: nc, row: nr, isCapture: false, targetPiece: null });
                } else {
                  jumped = true;
                }
              } else {
                if (targetPiece) {
                  if (targetPiece.color !== color) {
                    moves.push({ col: nc, row: nr, isCapture: true, targetPiece });
                  }
                  break;
                }
              }
              nc += d.dc;
              nr += d.dr;
            }
          }
          break;
        }

        case 'p': {
          if (color === 'red') {
            addMove(c, r - 1);
            if (r <= 4) {
              addMove(c - 1, r);
              addMove(c + 1, r);
            }
          } else {
            addMove(c, r + 1);
            if (r >= 5) {
              addMove(c - 1, r);
              addMove(c + 1, r);
            }
          }
          break;
        }
      }

      return moves;
    }

    makeMove(fromC, fromR, toC, toR, isAIMove = false) {
      if (this.gameOver) return { success: false, reason: '游戏已结束' };

      const piece = this.getPiece(fromC, fromR);
      if (!piece) return { success: false, reason: '源位置无棋子' };
      if (piece.color !== this.currentTurn) return { success: false, reason: '未轮到该方走棋' };

      const legal = this.getLegalMoves(fromC, fromR);
      const matchedMove = legal.find(m => m.col === toC && m.row === toR);
      if (!matchedMove) return { success: false, reason: '不合法的落子位置' };

      const alivePiecesBefore = this.getAlivePiecesCount();
      const targetPiece = this.getPiece(toC, toR);

      let scoreGained = 0.0;
      let logMsg = '';

      if (targetPiece) {
        scoreGained = this.calculatePieceScore(targetPiece, alivePiecesBefore);
        if (piece.color === 'red') {
          this.redScore = +(this.redScore + scoreGained).toFixed(1);
        } else {
          this.blackScore = +(this.blackScore + scoreGained).toFixed(1);
        }

        const attackerName = PIECE_FULL_NAMES[piece.color][piece.type];
        const victimName = PIECE_FULL_NAMES[targetPiece.color][targetPiece.type];
        const newTotal = piece.color === 'red' ? this.redScore : this.blackScore;
        const prefix = isAIMove ? '🤖 [AI击杀]' : '';

        logMsg = `${prefix} 第 ${this.round} 回合: ${attackerName} 击杀 ${victimName} (吃子前盘面${alivePiecesBefore}子，${PIECE_NAMES[targetPiece.color][targetPiece.type]}计 ${scoreGained}分，${piece.color === 'red' ? '红方' : '黑方'}总分升至 ${newTotal}分)`;
        this.sound.playCapture();
      } else {
        const attackerName = PIECE_FULL_NAMES[piece.color][piece.type];
        const prefix = isAIMove ? '🤖 [AI移动]' : '';
        logMsg = `${prefix} 第 ${this.round} 回合: ${attackerName} 移动至 (${toC}, ${toR})`;
        this.sound.playMove();
      }

      const historyItem = {
        from: { col: fromC, row: fromR },
        to: { col: toC, row: toR },
        movedPiece: { ...piece },
        capturedPiece: targetPiece ? { ...targetPiece } : null,
        scoreGained,
        currentTurnBefore: this.currentTurn,
        roundBefore: this.round,
        redScoreBefore: piece.color === 'red' ? +(this.redScore - scoreGained).toFixed(1) : this.redScore,
        blackScoreBefore: piece.color === 'black' ? +(this.blackScore - scoreGained).toFixed(1) : this.blackScore,
        logMsg,
        isAIMove
      };
      this.moveHistory.push(historyItem);
      this.logs.unshift(logMsg);

      this.board[toR][toC] = piece;
      this.board[fromR][fromC] = null;
      this.lastMove = { from: { col: fromC, row: fromR }, to: { col: toC, row: toR } };

      this.selectedPos = null;
      this.legalMoves = [];

      const currentScore = piece.color === 'red' ? this.redScore : this.blackScore;
      const capturedKing = targetPiece && targetPiece.type === 'k';

      if (currentScore >= WIN_SCORE || capturedKing) {
        this.gameOver = true;
        this.winner = piece.color;
        this.sound.playVictory();
        return {
          success: true,
          gameOver: true,
          winner: this.winner,
          reason: capturedKing ? '斩首敌帅，一击必杀！' : `率先达成 12 分大关（最终积分 ${currentScore}分）！`
        };
      }

      if (this.currentTurn === 'black') {
        this.round++;
      }
      this.currentTurn = this.currentTurn === 'red' ? 'black' : 'red';

      return { success: true, gameOver: false };
    }

    undo() {
      if (this.moveHistory.length === 0) return false;

      const last = this.moveHistory.pop();
      this.board[last.from.row][last.from.col] = last.movedPiece;
      this.board[last.to.row][last.to.col] = last.capturedPiece;

      this.currentTurn = last.currentTurnBefore;
      this.round = last.roundBefore;
      this.redScore = last.redScoreBefore;
      this.blackScore = last.blackScoreBefore;
      this.gameOver = false;
      this.winner = null;

      if (this.moveHistory.length > 0) {
        const prev = this.moveHistory[this.moveHistory.length - 1];
        this.lastMove = { from: prev.from, to: prev.to };
      } else {
        this.lastMove = null;
      }

      this.logs.shift();
      this.selectedPos = null;
      this.legalMoves = [];

      return true;
    }
  }

  // --- 智能 AI 对弈引擎 (高阶 Minimax + 静态吃子搜索 Quiescence + 置换表优化) ---
  class XiangqiAI {
    constructor() {
      // 置换表缓存 (Transposition Table)
      this.tt = new Map();
      this.ttMaxEntries = 30000;

      // 棋子位置价值矩阵 (Piece-Square Tables, 以红方视角设计，黑方镜像翻转)
      // 马：中心活跃，避开边角
      this.pstHorse = [
        [0,  -4,   0,   0,   0,   0,   0,  -4,   0],
        [0,   4,   8,  10,  10,  10,   8,   4,   0],
        [4,   8,  16,  20,  20,  20,  16,   8,   4],
        [6,  12,  18,  22,  22,  22,  18,  12,   6],
        [8,  16,  22,  26,  26,  26,  22,  16,   8],
        [8,  16,  22,  26,  26,  26,  22,  16,   8],
        [6,  12,  18,  20,  20,  20,  18,  12,   6],
        [4,   8,  12,  14,  14,  14,  12,   8,   4],
        [2,   4,   6,   8,   8,   8,   6,   4,   2],
        [0,   0,   2,   2,   2,   2,   2,   0,   0]
      ];

      // 兵/卒：过河及逼近九宫价值大幅攀升
      this.pstPawn = [
        [0,   3,   6,   9,  12,   9,   6,   3,   0],
        [9,  12,  18,  24,  30,  24,  18,  12,   9],
        [9,  14,  20,  26,  32,  26,  20,  14,   9],
        [6,  10,  16,  22,  26,  22,  16,  10,   6],
        [4,   8,  12,  16,  18,  16,  12,   8,   4],
        [2,   0,   4,   0,   8,   0,   4,   0,   2],
        [0,   0,   0,   0,   0,   0,   0,   0,   0],
        [0,   0,   0,   0,   0,   0,   0,   0,   0],
        [0,   0,   0,   0,   0,   0,   0,   0,   0],
        [0,   0,   0,   0,   0,   0,   0,   0,   0]
      ];
    }

    // 生成局面的紧凑哈希键
    getBoardKey(game, turnColor) {
      let s = turnColor + ':';
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const p = game.board[r][c];
          if (p) s += `${c}${r}${p.color[0]}${p.type}`;
        }
      }
      return s;
    }

    // 局面启发式评估
    evaluate(game, aiColor) {
      const opponentColor = aiColor === 'red' ? 'black' : 'red';
      const aiScore = aiColor === 'red' ? game.redScore : game.blackScore;
      const oppScore = opponentColor === 'red' ? game.redScore : game.blackScore;

      // 获胜或失败极端判定
      if (aiScore >= WIN_SCORE) return 900000;
      if (oppScore >= WIN_SCORE) return -900000;

      // 距离 12 分大关越近，权重呈指数级增长
      let evalScore = (aiScore - oppScore) * 1600;

      const alive = game.getAlivePiecesCount();
      const horseVal = alive >= 26 ? 150 : 200;
      const cannonVal = alive >= 21 ? 200 : 150;

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const p = game.board[r][c];
          if (!p) continue;

          let val = 0;
          let posVal = 0;

          // 根据阵营确定位置矩阵视角
          const isRed = p.color === 'red';
          const rowIdx = isRed ? r : (9 - r);
          const colIdx = c;

          switch (p.type) {
            case 'k':
              val = 1500;
              break;
            case 'r':
              val = 320;
              // 车通头与深入敌阵奖励
              posVal = (isRed ? (9 - r) : r) * 3;
              break;
            case 'c':
              val = cannonVal;
              posVal = (isRed ? (9 - r) : r) * 2;
              break;
            case 'h':
              val = horseVal;
              posVal = this.pstHorse[rowIdx][colIdx];
              break;
            case 'a':
              val = 90;
              break;
            case 'e':
              val = 90;
              break;
            case 'p':
              val = 50;
              posVal = this.pstPawn[rowIdx][colIdx];
              break;
          }

          const totalPieceVal = val + posVal;
          if (p.color === aiColor) {
            evalScore += totalPieceVal;
          } else {
            evalScore -= totalPieceVal;
          }
        }
      }

      return evalScore;
    }

    // 静态搜索 (Quiescence Search) - 彻底消灭地平线效应与无脑送子
    quiescence(game, alpha, beta, isMaximizing, aiColor, qDepth = 3) {
      const standPat = this.evaluate(game, aiColor);

      if (qDepth <= 0 || game.redScore >= WIN_SCORE || game.blackScore >= WIN_SCORE) {
        return standPat;
      }

      const turnColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'black' : 'red');

      if (isMaximizing) {
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        // 仅抓取吃子走法
        const allMoves = game.getAllLegalMoves(turnColor);
        const captureMoves = allMoves.filter(m => m.isCapture);
        if (captureMoves.length === 0) return standPat;

        const aliveBefore = game.getAlivePiecesCount();
        // MVV-LVA 排序：优先尝试高回报吃子
        captureMoves.sort((a, b) => {
          const valA = game.calculatePieceScore(a.targetPiece, aliveBefore);
          const valB = game.calculatePieceScore(b.targetPiece, aliveBefore);
          return valB - valA;
        });

        for (const m of captureMoves) {
          const targetPiece = game.board[m.toR][m.toC];
          const movedPiece = game.board[m.fromR][m.fromC];
          const pts = game.calculatePieceScore(targetPiece, aliveBefore);

          game.board[m.toR][m.toC] = movedPiece;
          game.board[m.fromR][m.fromC] = null;
          if (aiColor === 'red') game.redScore += pts; else game.blackScore += pts;

          const score = this.quiescence(game, alpha, beta, false, aiColor, qDepth - 1);

          game.board[m.fromR][m.fromC] = movedPiece;
          game.board[m.toR][m.toC] = targetPiece;
          if (aiColor === 'red') game.redScore -= pts; else game.blackScore -= pts;

          if (score >= beta) return beta;
          if (score > alpha) alpha = score;
        }
        return alpha;
      } else {
        if (standPat <= alpha) return alpha;
        if (standPat < beta) beta = standPat;

        const allMoves = game.getAllLegalMoves(turnColor);
        const captureMoves = allMoves.filter(m => m.isCapture);
        if (captureMoves.length === 0) return standPat;

        const aliveBefore = game.getAlivePiecesCount();
        captureMoves.sort((a, b) => {
          const valA = game.calculatePieceScore(a.targetPiece, aliveBefore);
          const valB = game.calculatePieceScore(b.targetPiece, aliveBefore);
          return valB - valA;
        });

        for (const m of captureMoves) {
          const targetPiece = game.board[m.toR][m.toC];
          const movedPiece = game.board[m.fromR][m.fromC];
          const pts = game.calculatePieceScore(targetPiece, aliveBefore);

          game.board[m.toR][m.toC] = movedPiece;
          game.board[m.fromR][m.fromC] = null;
          const oppColor = aiColor === 'red' ? 'black' : 'red';
          if (oppColor === 'red') game.redScore += pts; else game.blackScore += pts;

          const score = this.quiescence(game, alpha, beta, true, aiColor, qDepth - 1);

          game.board[m.fromR][m.fromC] = movedPiece;
          game.board[m.toR][m.toC] = targetPiece;
          if (oppColor === 'red') game.redScore -= pts; else game.blackScore -= pts;

          if (score <= alpha) return alpha;
          if (score < beta) beta = score;
        }
        return beta;
      }
    }

    // Minimax 极小化极大搜索 + Alpha-Beta 剪枝
    minimax(game, depth, alpha, beta, isMaximizing, aiColor) {
      if (game.redScore >= WIN_SCORE || game.blackScore >= WIN_SCORE) {
        return this.evaluate(game, aiColor);
      }

      if (depth === 0) {
        // 进入静态吃子搜索阶段
        return this.quiescence(game, alpha, beta, isMaximizing, aiColor, 3);
      }

      const turnColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'black' : 'red');

      // 置换表查询
      const boardKey = this.getBoardKey(game, turnColor) + `_d${depth}_${isMaximizing}`;
      if (this.tt.has(boardKey)) {
        return this.tt.get(boardKey);
      }

      const moves = game.getAllLegalMoves(turnColor);
      if (moves.length === 0) return this.evaluate(game, aiColor);

      const aliveBefore = game.getAlivePiecesCount();

      // 优化排序：优先吃子，其次中心移动
      moves.sort((a, b) => {
        const valA = a.isCapture ? (game.calculatePieceScore(a.targetPiece, aliveBefore) * 100) : 0;
        const valB = b.isCapture ? (game.calculatePieceScore(b.targetPiece, aliveBefore) * 100) : 0;
        return valB - valA;
      });

      let resVal;
      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const m of moves) {
          const targetPiece = game.board[m.toR][m.toC];
          const movedPiece = game.board[m.fromR][m.fromC];
          const pts = m.isCapture ? game.calculatePieceScore(targetPiece, aliveBefore) : 0;

          game.board[m.toR][m.toC] = movedPiece;
          game.board[m.fromR][m.fromC] = null;
          if (aiColor === 'red') game.redScore += pts; else game.blackScore += pts;

          const ev = this.minimax(game, depth - 1, alpha, beta, false, aiColor);

          game.board[m.fromR][m.fromC] = movedPiece;
          game.board[m.toR][m.toC] = targetPiece;
          if (aiColor === 'red') game.redScore -= pts; else game.blackScore -= pts;

          maxEval = Math.max(maxEval, ev);
          alpha = Math.max(alpha, ev);
          if (beta <= alpha) break; // Beta 剪枝
        }
        resVal = maxEval;
      } else {
        let minEval = Infinity;
        const oppColor = aiColor === 'red' ? 'black' : 'red';
        for (const m of moves) {
          const targetPiece = game.board[m.toR][m.toC];
          const movedPiece = game.board[m.fromR][m.fromC];
          const pts = m.isCapture ? game.calculatePieceScore(targetPiece, aliveBefore) : 0;

          game.board[m.toR][m.toC] = movedPiece;
          game.board[m.fromR][m.fromC] = null;
          if (oppColor === 'red') game.redScore += pts; else game.blackScore += pts;

          const ev = this.minimax(game, depth - 1, alpha, beta, true, aiColor);

          game.board[m.fromR][m.fromC] = movedPiece;
          game.board[m.toR][m.toC] = targetPiece;
          if (oppColor === 'red') game.redScore -= pts; else game.blackScore -= pts;

          minEval = Math.min(minEval, ev);
          beta = Math.min(beta, ev);
          if (beta <= alpha) break; // Alpha 剪枝
        }
        resVal = minEval;
      }

      // 存入置换表
      if (this.tt.size > this.ttMaxEntries) this.tt.clear();
      this.tt.set(boardKey, resVal);

      return resVal;
    }

    // 核心决策入口
    getBestMove(game, aiColor, difficulty = 'medium') {
      const allMoves = game.getAllLegalMoves(aiColor);
      if (allMoves.length === 0) return null;

      const aliveBefore = game.getAlivePiecesCount();
      const opponentColor = aiColor === 'red' ? 'black' : 'red';
      const currentAIScore = aiColor === 'red' ? game.redScore : game.blackScore;

      // 1. 必胜绝杀一击判定
      for (const m of allMoves) {
        if (m.isCapture && m.targetPiece) {
          if (m.targetPiece.type === 'k') return m;
          const pts = game.calculatePieceScore(m.targetPiece, aliveBefore);
          if (currentAIScore + pts >= WIN_SCORE) return m;
        }
      }

      // 2. 紧急防御判定：敌方下一步是否能斩我方帅/将？
      const oppMoves = game.getAllLegalMoves(opponentColor);
      const lethalThreat = oppMoves.find(om => om.isCapture && om.targetPiece && om.targetPiece.type === 'k');
      if (lethalThreat) {
        // 先看能不能直接反杀这个威胁子力
        const counterKill = allMoves.find(m => m.toC === lethalThreat.fromC && m.toR === lethalThreat.fromR);
        if (counterKill) return counterKill;
      }

      // 3. 难度深度配置
      // 新手：深度 1，纯贪心
      if (difficulty === 'easy') {
        allMoves.sort((a, b) => {
          const scoreA = a.isCapture ? game.calculatePieceScore(a.targetPiece, aliveBefore) : 0;
          const scoreB = b.isCapture ? game.calculatePieceScore(b.targetPiece, aliveBefore) : 0;
          return (scoreB - scoreA) + (Math.random() * 0.3 - 0.15);
        });
        return allMoves[0];
      }

      // 进阶：深度 3 + 静态吃子搜索
      // 大师：深度 4 + 静态吃子搜索
      const maxDepth = difficulty === 'hard' ? 4 : 3;

      let bestMove = null;
      let bestVal = -Infinity;
      let alpha = -Infinity;
      let beta = Infinity;

      // 清空本轮置换表
      this.tt.clear();

      // 根节点走法排序
      allMoves.sort((a, b) => {
        const valA = a.isCapture ? (game.calculatePieceScore(a.targetPiece, aliveBefore) * 100) : 0;
        const valB = b.isCapture ? (game.calculatePieceScore(b.targetPiece, aliveBefore) * 100) : 0;
        return valB - valA;
      });

      for (const m of allMoves) {
        const targetPiece = game.board[m.toR][m.toC];
        const movedPiece = game.board[m.fromR][m.fromC];
        const scoreGained = m.isCapture ? game.calculatePieceScore(targetPiece, aliveBefore) : 0;

        game.board[m.toR][m.toC] = movedPiece;
        game.board[m.fromR][m.fromC] = null;
        if (aiColor === 'red') game.redScore += scoreGained;
        else game.blackScore += scoreGained;

        const val = this.minimax(game, maxDepth - 1, alpha, beta, false, aiColor);

        game.board[m.fromR][m.fromC] = movedPiece;
        game.board[m.toR][m.toC] = targetPiece;
        if (aiColor === 'red') game.redScore -= scoreGained;
        else game.blackScore -= scoreGained;

        if (val > bestVal) {
          bestVal = val;
          bestMove = m;
        }
        alpha = Math.max(alpha, bestVal);
        if (beta <= alpha) break;
      }

      return bestMove || allMoves[0];
    }
  }

  // --- UI 渲染控制器 ---
  class XiangqiUI {
    constructor(game, ai) {
      this.game = game;
      this.ai = ai;

      // 对战模式状态
      this.gameMode = 'pvp'; // 'pvp' | 'pve'
      this.aiDifficulty = 'medium'; // 'easy' | 'medium' | 'hard'
      this.playerColor = 'red'; // 'red' | 'black'
      this.aiColor = 'black';
      this.isAIThinking = false;

      // 缓存 DOM 节点
      this.dom = {
        board: document.getElementById('board'),
        piecesLayer: document.getElementById('pieces-layer'),
        hintsLayer: document.getElementById('hints-layer'),
        modePvp: document.getElementById('mode-pvp'),
        modePve: document.getElementById('mode-pve'),
        aiSettings: document.getElementById('ai-settings'),
        diffButtons: document.querySelectorAll('.btn-diff'),
        btnSideRed: document.getElementById('btn-side-red'),
        btnSideBlack: document.getElementById('btn-side-black'),
        aiThinkingBadge: document.getElementById('ai-thinking-badge'),
        turnBadge: document.getElementById('turn-badge'),
        turnRound: document.getElementById('turn-round'),
        pieceCountBadge: document.getElementById('board-piece-count-badge'),
        redScore: document.getElementById('red-score'),
        blackScore: document.getElementById('black-score'),
        redProgress: document.getElementById('red-progress'),
        blackProgress: document.getElementById('black-progress'),
        horsePrice: document.getElementById('horse-price'),
        horseTip: document.getElementById('horse-tip'),
        cannonPrice: document.getElementById('cannon-price'),
        cannonTip: document.getElementById('cannon-tip'),
        battleLogs: document.getElementById('battle-logs'),
        btnUndo: document.getElementById('btn-undo'),
        btnRestart: document.getElementById('btn-restart'),
        btnSoundToggle: document.getElementById('btn-sound-toggle'),
        btnHelp: document.getElementById('btn-help'),
        btnCloseRules: document.getElementById('btn-close-rules'),
        rulesModal: document.getElementById('rules-modal'),
        victoryModal: document.getElementById('victory-modal'),
        victoryTitle: document.getElementById('victory-title'),
        victoryReason: document.getElementById('victory-reason'),
        statWinnerScore: document.getElementById('stat-winner-score'),
        statRounds: document.getElementById('stat-rounds'),
        statRemains: document.getElementById('stat-remains'),
        btnModalRestart: document.getElementById('btn-modal-restart')
      };

      this.initEvents();
      this.render();
    }

    initEvents() {
      // 模式切换
      this.dom.modePvp.addEventListener('click', () => {
        this.gameMode = 'pvp';
        this.dom.modePvp.classList.add('active');
        this.dom.modePve.classList.remove('active');
        this.dom.aiSettings.classList.add('hidden');
        this.render();
      });

      this.dom.modePve.addEventListener('click', () => {
        this.gameMode = 'pve';
        this.dom.modePve.classList.add('active');
        this.dom.modePvp.classList.remove('active');
        this.dom.aiSettings.classList.remove('hidden');
        this.checkAITurn();
        this.render();
      });

      // 难度选择
      this.dom.diffButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          this.dom.diffButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.aiDifficulty = btn.dataset.diff;
        });
      });

      // 玩家阵营选择
      this.dom.btnSideRed.addEventListener('click', () => {
        this.playerColor = 'red';
        this.aiColor = 'black';
        this.dom.btnSideRed.classList.add('active');
        this.dom.btnSideBlack.classList.remove('active');
        this.game.reset();
        this.render();
        this.checkAITurn();
      });

      this.dom.btnSideBlack.addEventListener('click', () => {
        this.playerColor = 'black';
        this.aiColor = 'red';
        this.dom.btnSideBlack.classList.add('active');
        this.dom.btnSideRed.classList.remove('active');
        this.game.reset();
        this.render();
        this.checkAITurn();
      });

      // 棋盘点击代理
      this.dom.board.addEventListener('click', (e) => {
        if (this.game.gameOver || this.isAIThinking) return;

        // 如果在 PVE 模式下，不是玩家回合则禁止操作
        if (this.gameMode === 'pve' && this.game.currentTurn !== this.playerColor) {
          return;
        }

        const hintTarget = e.target.closest('.hint-dot, .hint-capture');
        if (hintTarget) {
          const toCol = parseInt(hintTarget.dataset.col, 10);
          const toRow = parseInt(hintTarget.dataset.row, 10);
          if (this.game.selectedPos) {
            this.handlePlayerMove(this.game.selectedPos.col, this.game.selectedPos.row, toCol, toRow);
          }
          return;
        }

        const pieceEl = e.target.closest('.chess-piece');
        if (pieceEl) {
          const col = parseInt(pieceEl.dataset.col, 10);
          const row = parseInt(pieceEl.dataset.row, 10);
          const piece = this.game.getPiece(col, row);

          if (!piece) return;

          if (this.game.selectedPos) {
            const isLegalTarget = this.game.legalMoves.some(m => m.col === col && m.row === row);
            if (isLegalTarget) {
              this.handlePlayerMove(this.game.selectedPos.col, this.game.selectedPos.row, col, row);
              return;
            }
          }

          if (piece.color === this.game.currentTurn) {
            this.selectPiece(col, row);
          } else {
            this.clearSelection();
          }
          return;
        }

        this.clearSelection();
      });

      // 悔棋 (在人机对战模式下，连同 AI 刚才走的一步和玩家的一起撤回)
      this.dom.btnUndo.addEventListener('click', () => {
        if (this.isAIThinking) return;

        if (this.gameMode === 'pve') {
          // 如果当前是玩家回合，撤销两步 (AI的一步 + 玩家的一步)
          if (this.game.currentTurn === this.playerColor) {
            this.game.undo();
            this.game.undo();
          } else {
            // 当前是AI回合，撤销一步
            this.game.undo();
          }
        } else {
          this.game.undo();
        }

        this.dom.victoryModal.classList.add('hidden');
        this.render();
      });

      // 重新开局
      const restartHandler = () => {
        this.game.reset();
        this.dom.victoryModal.classList.add('hidden');
        this.render();
        this.checkAITurn();
      };
      this.dom.btnRestart.addEventListener('click', restartHandler);
      this.dom.btnModalRestart.addEventListener('click', restartHandler);

      // 音效开关
      this.dom.btnSoundToggle.addEventListener('click', () => {
        this.game.sound.enabled = !this.game.sound.enabled;
        this.dom.btnSoundToggle.textContent = this.game.sound.enabled ? '🔊' : '🔇';
      });

      // 规则弹窗
      this.dom.btnHelp.addEventListener('click', () => {
        this.dom.rulesModal.classList.remove('hidden');
      });
      this.dom.btnCloseRules.addEventListener('click', () => {
        this.dom.rulesModal.classList.add('hidden');
      });
    }

    selectPiece(col, row) {
      this.game.selectedPos = { col, row };
      this.game.legalMoves = this.game.getLegalMoves(col, row);
      this.renderBoard();
    }

    clearSelection() {
      if (this.game.selectedPos) {
        this.game.selectedPos = null;
        this.game.legalMoves = [];
        this.renderBoard();
      }
    }

    handlePlayerMove(fromC, fromR, toC, toR) {
      const result = this.game.makeMove(fromC, fromR, toC, toR, false);
      if (result.success) {
        this.render();
        if (result.gameOver) {
          this.showVictoryModal(result);
        } else {
          this.checkAITurn();
        }
      }
    }

    // 检查并调度 AI 行动
    checkAITurn() {
      if (this.gameMode !== 'pve' || this.game.gameOver) return;

      if (this.game.currentTurn === this.aiColor) {
        this.isAIThinking = true;
        this.dom.aiThinkingBadge.classList.remove('hidden');

        // 微延迟让玩家感知 AI 正在深思熟虑
        const thinkDelay = this.aiDifficulty === 'hard' ? 450 : 300;
        setTimeout(() => {
          if (this.game.gameOver) {
            this.isAIThinking = false;
            this.dom.aiThinkingBadge.classList.add('hidden');
            return;
          }

          const bestMove = this.ai.getBestMove(this.game, this.aiColor, this.aiDifficulty);
          this.isAIThinking = false;
          this.dom.aiThinkingBadge.classList.add('hidden');

          if (bestMove) {
            const aiRes = this.game.makeMove(bestMove.fromC, bestMove.fromR, bestMove.toC, bestMove.toR, true);
            this.render();
            if (aiRes.gameOver) {
              this.showVictoryModal(aiRes);
            }
          }
        }, thinkDelay);
      }
    }

    showVictoryModal(result) {
      const isAI = this.gameMode === 'pve' && result.winner === this.aiColor;
      const winnerName = isAI ? '🤖 智能 AI' : (result.winner === 'red' ? '红方' : '黑方');
      this.dom.victoryTitle.textContent = isAI ? `🤖 AI 绝杀胜出！` : `🎊 ${winnerName} 凯旋大捷！`;
      this.dom.victoryTitle.style.color = result.winner === 'red' ? '#ff8787' : '#ced4da';
      this.dom.victoryReason.textContent = result.reason;

      const winScore = result.winner === 'red' ? this.game.redScore : this.game.blackScore;
      this.dom.statWinnerScore.textContent = winScore.toFixed(1);
      this.dom.statRounds.textContent = this.game.round;
      this.dom.statRemains.textContent = this.game.getAlivePiecesCount();

      this.dom.victoryModal.classList.remove('hidden');
    }

    render() {
      this.renderBoard();
      this.renderDashboard();
    }

    getPercentPos(col, row) {
      const left = ((40 + col * 80) / 720) * 100;
      const top = ((40 + row * 80) / 800) * 100;
      return { left: `${left}%`, top: `${top}%` };
    }

    renderBoard() {
      this.dom.piecesLayer.innerHTML = '';
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const piece = this.game.getPiece(c, r);
          if (!piece) continue;

          const isSelected = this.game.selectedPos &&
            this.game.selectedPos.col === c &&
            this.game.selectedPos.row === r;

          const pieceEl = document.createElement('div');
          pieceEl.className = `chess-piece ${piece.color} ${isSelected ? 'selected' : ''}`;
          pieceEl.dataset.col = c;
          pieceEl.dataset.row = r;
          pieceEl.dataset.id = piece.id;

          const pos = this.getPercentPos(c, r);
          pieceEl.style.left = pos.left;
          pieceEl.style.top = pos.top;

          const char = PIECE_NAMES[piece.color][piece.type];
          pieceEl.innerHTML = `<div class="piece-inner">${char}</div>`;
          this.dom.piecesLayer.appendChild(pieceEl);
        }
      }

      if (this.game.lastMove) {
        const fromPos = this.getPercentPos(this.game.lastMove.from.col, this.game.lastMove.from.row);
        const toPos = this.getPercentPos(this.game.lastMove.to.col, this.game.lastMove.to.row);

        const mFrom = document.createElement('div');
        mFrom.className = 'last-move-marker';
        mFrom.style.left = fromPos.left;
        mFrom.style.top = fromPos.top;

        const mTo = document.createElement('div');
        mTo.className = 'last-move-marker';
        mTo.style.left = toPos.left;
        mTo.style.top = toPos.top;

        this.dom.piecesLayer.appendChild(mFrom);
        this.dom.piecesLayer.appendChild(mTo);
      }

      this.dom.hintsLayer.innerHTML = '';
      if (this.game.legalMoves && this.game.legalMoves.length > 0) {
        for (const m of this.game.legalMoves) {
          const pos = this.getPercentPos(m.col, m.row);
          const hintEl = document.createElement('div');
          hintEl.className = m.isCapture ? 'hint-capture' : 'hint-dot';
          hintEl.dataset.col = m.col;
          hintEl.dataset.row = m.row;
          hintEl.style.left = pos.left;
          hintEl.style.top = pos.top;
          this.dom.hintsLayer.appendChild(hintEl);
        }
      }
    }

    renderDashboard() {
      const isRed = this.game.currentTurn === 'red';
      const isAITurn = this.gameMode === 'pve' && this.game.currentTurn === this.aiColor;
      
      this.dom.turnBadge.className = `badge ${isRed ? 'badge-red' : 'badge-black'}`;
      this.dom.turnBadge.textContent = isAITurn ? `🤖 AI走子(${isRed ? '红' : '黑'})` : (isRed ? '红方走子' : '黑方走子');
      this.dom.turnRound.textContent = this.game.round;

      const aliveCount = this.game.getAlivePiecesCount();
      this.dom.pieceCountBadge.textContent = `盘面 ${aliveCount} / 32 子`;

      this.dom.redScore.textContent = this.game.redScore.toFixed(1);
      this.dom.blackScore.textContent = this.game.blackScore.toFixed(1);

      const redPercent = Math.min(100, (this.game.redScore / WIN_SCORE) * 100);
      const blackPercent = Math.min(100, (this.game.blackScore / WIN_SCORE) * 100);
      this.dom.redProgress.style.width = `${redPercent}%`;
      this.dom.blackProgress.style.width = `${blackPercent}%`;

      const market = this.game.getMarketInfo();
      this.dom.horsePrice.textContent = `${market.horsePrice.toFixed(1)} 分`;
      this.dom.horseTip.innerHTML = market.horseDesc;
      this.dom.cannonPrice.textContent = `${market.cannonPrice.toFixed(1)} 分`;
      this.dom.cannonTip.innerHTML = market.cannonDesc;

      this.dom.btnUndo.disabled = this.game.moveHistory.length === 0 || this.isAIThinking;

      this.renderLogs();
    }

    renderLogs() {
      if (this.game.logs.length === 0) {
        this.dom.battleLogs.innerHTML = '<div class="log-entry log-welcome">对局开始！率先掠夺 12 分者获胜。</div>';
        return;
      }

      this.dom.battleLogs.innerHTML = this.game.logs.map(log => {
        let cls = 'log-entry';
        if (log.includes('击杀')) cls += ' capture';
        else if (log.includes('红')) cls += ' red-action';
        else if (log.includes('黑')) cls += ' black-action';
        return `<div class="${cls}">${log}</div>`;
      }).join('');
    }
  }

  // 挂载全局对象与测试入口
  window.addEventListener('DOMContentLoaded', () => {
    const game = new XiangqiGame();
    const ai = new XiangqiAI();
    const ui = new XiangqiUI(game, ai);

    window.testAPI = {
      game,
      ai,
      ui,
      getState: () => ({
        currentTurn: game.currentTurn,
        round: game.round,
        redScore: game.redScore,
        blackScore: game.blackScore,
        alivePieces: game.getAlivePiecesCount(),
        gameOver: game.gameOver,
        winner: game.winner,
        historyCount: game.moveHistory.length,
        gameMode: ui.gameMode,
        aiDifficulty: ui.aiDifficulty,
        playerColor: ui.playerColor,
        aiColor: ui.aiColor
      }),
      getPiece: (c, r) => game.getPiece(c, r),
      getLegalMoves: (c, r) => game.getLegalMoves(c, r),
      makeMove: (fromC, fromR, toC, toR, isAI = false) => {
        const res = game.makeMove(fromC, fromR, toC, toR, isAI);
        ui.render();
        if (res.gameOver) ui.showVictoryModal(res);
        return res;
      },
      triggerAIMove: () => {
        const best = ai.getBestMove(game, ui.aiColor, ui.aiDifficulty);
        if (best) {
          const res = game.makeMove(best.fromC, best.fromR, best.toC, best.toR, true);
          ui.render();
          if (res.gameOver) ui.showVictoryModal(res);
          return res;
        }
        return null;
      },
      undo: () => {
        const ok = game.undo();
        ui.render();
        return ok;
      },
      restart: () => {
        game.reset();
        ui.render();
      }
    };
  });
})();
