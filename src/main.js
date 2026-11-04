/**
 * @file main.js
 * @description 应用程序主入口，组装音频引擎、规则系统、AI 大脑与 UI 交互层
 */

import { SoundManager } from './audio.js';
import { XiangqiGame } from './rules.js';
import { XiangqiAI } from './ai.js';
import { XiangqiUI } from './ui.js';

function bootstrap() {
  const sound = new SoundManager();
  const game = new XiangqiGame(sound);
  const ai = new XiangqiAI();
  const ui = new XiangqiUI(game, ai);

  // 挂载便于开发调试与实机自动化回归测试的 API
  window.testAPI = {
    game,
    ai,
    ui,
    sound,
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
