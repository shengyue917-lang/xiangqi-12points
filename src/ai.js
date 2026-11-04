/**
 * @file ai.js
 * @description 智能 AI 对弈引擎 (带静态吃子搜索 Quiescence Search、置换表与启发式位置评估)
 */

import { WIN_SCORE } from './rules.js';

export class XiangqiAI {
  constructor() {
    this.tt = new Map();
    this.ttMaxEntries = 30000;

    // 马的位置启发权重（以红方为基准，黑方镜像）
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

    // 兵/卒位置启发权重（过河和逼近九宫显著增权）
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

  evaluate(game, aiColor) {
    const opponentColor = aiColor === 'red' ? 'black' : 'red';
    const aiScore = aiColor === 'red' ? game.redScore : game.blackScore;
    const oppScore = opponentColor === 'red' ? game.redScore : game.blackScore;

    if (aiScore >= WIN_SCORE) return 900000;
    if (oppScore >= WIN_SCORE) return -900000;

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

        const isRed = p.color === 'red';
        const rowIdx = isRed ? r : (9 - r);
        const colIdx = c;

        switch (p.type) {
          case 'k':
            val = 1500;
            break;
          case 'r':
            val = 320;
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

  /**
   * 静态吃子搜索：彻底消灭地平线效应与盲目换子
   */
  quiescence(game, alpha, beta, isMaximizing, aiColor, qDepth = 3) {
    const standPat = this.evaluate(game, aiColor);

    if (qDepth <= 0 || game.redScore >= WIN_SCORE || game.blackScore >= WIN_SCORE) {
      return standPat;
    }

    const turnColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'black' : 'red');

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;

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

  minimax(game, depth, alpha, beta, isMaximizing, aiColor) {
    if (game.redScore >= WIN_SCORE || game.blackScore >= WIN_SCORE) {
      return this.evaluate(game, aiColor);
    }

    if (depth === 0) {
      return this.quiescence(game, alpha, beta, isMaximizing, aiColor, 3);
    }

    const turnColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'black' : 'red');

    const boardKey = this.getBoardKey(game, turnColor) + `_d${depth}_${isMaximizing}`;
    if (this.tt.has(boardKey)) {
      return this.tt.get(boardKey);
    }

    const moves = game.getAllLegalMoves(turnColor);
    if (moves.length === 0) return this.evaluate(game, aiColor);

    const aliveBefore = game.getAlivePiecesCount();
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
        if (beta <= alpha) break;
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
        if (beta <= alpha) break;
      }
      resVal = minEval;
    }

    if (this.tt.size > this.ttMaxEntries) this.tt.clear();
    this.tt.set(boardKey, resVal);

    return resVal;
  }

  getBestMove(game, aiColor, difficulty = 'medium') {
    const allMoves = game.getAllLegalMoves(aiColor);
    if (allMoves.length === 0) return null;

    const aliveBefore = game.getAlivePiecesCount();
    const opponentColor = aiColor === 'red' ? 'black' : 'red';
    const currentAIScore = aiColor === 'red' ? game.redScore : game.blackScore;

    // 1. 必杀一击判定
    for (const m of allMoves) {
      if (m.isCapture && m.targetPiece) {
        if (m.targetPiece.type === 'k') return m;
        const pts = game.calculatePieceScore(m.targetPiece, aliveBefore);
        if (currentAIScore + pts >= WIN_SCORE) return m;
      }
    }

    // 2. 紧急防御判定
    const oppMoves = game.getAllLegalMoves(opponentColor);
    const lethalThreat = oppMoves.find(om => om.isCapture && om.targetPiece && om.targetPiece.type === 'k');
    if (lethalThreat) {
      const counterKill = allMoves.find(m => m.toC === lethalThreat.fromC && m.toR === lethalThreat.fromR);
      if (counterKill) return counterKill;
    }

    // 3. 难度深度配置
    if (difficulty === 'easy') {
      allMoves.sort((a, b) => {
        const scoreA = a.isCapture ? game.calculatePieceScore(a.targetPiece, aliveBefore) : 0;
        const scoreB = b.isCapture ? game.calculatePieceScore(b.targetPiece, aliveBefore) : 0;
        return (scoreB - scoreA) + (Math.random() * 0.3 - 0.15);
      });
      return allMoves[0];
    }

    const maxDepth = difficulty === 'hard' ? 4 : 3;

    let bestMove = null;
    let bestVal = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    this.tt.clear();

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
