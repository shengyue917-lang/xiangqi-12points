/**
 * @file ui.js
 * @description 界面渲染控制器、触控响应与交互逻辑
 */

import { WIN_SCORE, PIECE_NAMES } from './rules.js';

export class XiangqiUI {
  constructor(game, ai) {
    this.game = game;
    this.ai = ai;

    this.gameMode = 'pvp'; // 'pvp' | 'pve'
    this.aiDifficulty = 'medium'; // 'easy' | 'medium' | 'hard'
    this.playerColor = 'red';
    this.aiColor = 'black';
    this.isAIThinking = false;

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

    this.dom.diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.aiDifficulty = btn.dataset.diff;
      });
    });

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

    this.dom.board.addEventListener('click', (e) => {
      if (this.game.gameOver || this.isAIThinking) return;

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

    this.dom.btnUndo.addEventListener('click', () => {
      if (this.isAIThinking) return;

      if (this.gameMode === 'pve') {
        if (this.game.currentTurn === this.playerColor) {
          this.game.undo();
          this.game.undo();
        } else {
          this.game.undo();
        }
      } else {
        this.game.undo();
      }

      this.dom.victoryModal.classList.add('hidden');
      this.render();
    });

    const restartHandler = () => {
      this.game.reset();
      this.dom.victoryModal.classList.add('hidden');
      this.render();
      this.checkAITurn();
    };
    this.dom.btnRestart.addEventListener('click', restartHandler);
    this.dom.btnModalRestart.addEventListener('click', restartHandler);

    this.dom.btnSoundToggle.addEventListener('click', () => {
      if (this.game.sound) {
        this.game.sound.enabled = !this.game.sound.enabled;
        this.dom.btnSoundToggle.textContent = this.game.sound.enabled ? '🔊' : '🔇';
      }
    });

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

  checkAITurn() {
    if (this.gameMode !== 'pve' || this.game.gameOver) return;

    if (this.game.currentTurn === this.aiColor) {
      this.isAIThinking = true;
      this.dom.aiThinkingBadge.classList.remove('hidden');

      const thinkDelay = this.aiDifficulty === 'hard' ? 400 : 250;
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
      this.dom.battleLogs.innerHTML = `<div class="log-entry log-welcome">对局开始！率先掠夺 ${WIN_SCORE} 分者获胜。</div>`;
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
