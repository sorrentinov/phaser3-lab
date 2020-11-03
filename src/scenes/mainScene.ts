import Phaser from 'phaser'

export default class MainScene extends Phaser.Scene {  
   score?:number
   lives?:number
   speed?:number
   dragon_move?:number
   scoreText?:Phaser.GameObjects.Text
   liveText?:Phaser.GameObjects.Text
   player?:Phaser.GameObjects.Sprite
   dragon?:Phaser.GameObjects.Sprite
   gold?:Phaser.GameObjects.Sprite

  constructor() {
    super({ key: 'MainScene' })        
  }

  init() {    
    this.score = 0
	  this.lives = 3
	  this.speed= 1.5
    this.dragon_move = 1  	
  }

  preload() {
    // lets preload some images that we can use in our game
    this.load.image('background', 'assets/images/background.png');
    this.load.image('player', 'assets/images/warrior.png');
    this.load.image('dragon', 'assets/images/pet_dragon_new.png');
    this.load.image('gold', 'assets/images/icon.png');
  }

  create() {    

    // add the background
    const bg = this.add.sprite(0, 0, 'background');
    bg.setOrigin(0,0);

    // add score text & game text to screen
    this.scoreText = this.add.text(100, 16, 'score: ' + this.score, { fontSize: '32px', fill: '#000' });    
    const height = this.sys.game.config.height as number;
    this.liveText = this.add.text(16, height -50, `Lives: ${this.lives}`, {fontSize: '32px', fill: '#000'});

    // add player
    this.player = this.add.sprite(100, 150, 'player');
    this.player.setScale(0.3);

    // add monster
    this.dragon = this.add.sprite(350, 150, 'dragon');
    this.dragon.setScale(0.1);

    // add gold
    this.gold = this.add.sprite(650, 150, 'gold');
    this.gold.setScale(0.5);
    
    // display the Phaser.VERSION
    this.add
      .text(this.cameras.main.width - 15, 15, `Phaser v${Phaser.VERSION}`, {
        color: '#000000',
        fontSize: 24
      })
      .setOrigin(1, 0)
  }

  update() {
    // Is mouse click down?    
    if (this.input.activePointer.isDown) {
      // move player along the x-axis at a rate this.speed pixels
      this.player?.setX(this.speed);
    }
          
    if (this.lives && this.player && this.dragon && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.dragon.getBounds())) {            
      this.lives--
      this.liveText?.setText(`Lives: ${this.lives}`)
      this.end()
    }
    
    if (this.score && this.player && this.gold && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.gold.getBounds())) {
      this.score +=50;
      this.scoreText?.setText(`Score: ${this.score}`);
      this.end();
    }

  }

  end() {
  }
}
