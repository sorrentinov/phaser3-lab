import "phaser";
import MainScene from './scenes/mainScene';

const DEFAULT_WIDTH = 1280
const DEFAULT_HEIGHT = 720

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  title: "MyGame",  
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  //parent: "game",  
  //backgroundColor: "#18216D",
  scene: [MainScene]
};

//export default new Phaser.Game(config)

export class MyGame extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config)
  }
}

window.addEventListener('load', () => {
    const game = new MyGame(config)
})
