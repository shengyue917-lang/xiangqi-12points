/**
 * @file rules.js
 * @description 中国象棋核心走棋约束与 12 分动态身价抢分制规则引擎
 */

export const WIN_SCORE = 12.0;

export const PIECE_NAMES = {
  red: { k: '帅', a: '仕', e: '相', h: '马', r: '车', c: '炮', p: '兵' },
  black: { k: '将', a: '士', e: '象', h: '马', r: '车', c: '炮', p: '卒' }
};

export const PIECE_FULL_NAMES = {
  red: { k: '红帅', a: '红仕', e: '红相', h: '红马', r: '红车', c: '红炮', p: '红兵' },
  black: { k: '黑将', a: '黑士', e: '黑象', h: '黑马', r: '黑车', c: '黑炮', p: '黑卒' }
};

/**
 * 创建标准 9×10 中国象棋初始盘面
 */
export function createInitialBoard() {
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

export class XiangqiGame {
  constructor(soundManager = null) {
    this.sound = soundManager;
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

  /**
   * 12 分动态抢分制：依据吃子前全盘存活棋子数判定分值
   */
  calculatePieceScore(piece, totalPiecesBeforeCapture) {
    if (!piece) return 0.0;
    switch (piece.type) {
      case 'k': return WIN_SCORE; // 将/帅 12.0 分（一击必杀）
      case 'r': return 3.0;       // 车 3.0 分
      case 'a': return 1.0;       // 士/仕 1.0 分
      case 'e': return 1.0;       // 象/相 1.0 分
      case 'p': return 0.5;       // 兵/卒 0.5 分（无论过河与否）
      case 'c': return totalPiecesBeforeCapture >= 21 ? 2.0 : 1.5; // 炮动态分
      case 'h': return totalPiecesBeforeCapture >= 26 ? 1.5 : 2.0; // 马动态分
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
          { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
          { dc: -1, dr: 0 }, { dc: 1, dr: 0 }
        ];

        for (const d of dirs) {
          const nc = c + d.dc;
          const nr = r + d.dr;
          if (nc >= minCol && nc <= maxCol && nr >= minRow && nr <= maxRow) {
            addMove(nc, nr);
          }
        }

        // 飞将（面对面照脸直接斩杀）
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
          { dc: -1, dr: -1 }, { dc: 1, dr: -1 },
          { dc: -1, dr: 1 },  { dc: 1, dr: 1 }
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
          { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
          { dc: -1, dr: 0 }, { dc: 1, dr: 0 }
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
          { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
          { dc: -1, dr: 0 }, { dc: 1, dr: 0 }
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
      if (this.sound) this.sound.playCapture();
    } else {
      const attackerName = PIECE_FULL_NAMES[piece.color][piece.type];
      const prefix = isAIMove ? '🤖 [AI移动]' : '';
      logMsg = `${prefix} 第 ${this.round} 回合: ${attackerName} 移动至 (${toC}, ${toR})`;
      if (this.sound) this.sound.playMove();
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
      if (this.sound) this.sound.playVictory();
      return {
        success: true,
        gameOver: true,
        winner: this.winner,
        reason: capturedKing ? '斩首敌帅，一击必杀！' : `率先达成 ${WIN_SCORE} 分大关（最终积分 ${currentScore}分）！`
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
