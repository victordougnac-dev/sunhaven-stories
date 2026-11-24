import './styles/main.css';
import { GameEngine } from './game/GameEngine';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
if (canvas) {
  const engine = new GameEngine(canvas);
  void engine.init();
}
