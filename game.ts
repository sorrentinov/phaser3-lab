
import Phaser from 'phaser'

const makePoint = (x?: number, y?: number) => new Phaser.Geom.Point(x, y)

// const scene:Phaser.Types.Scenes.CreateSceneFromObjectConfig = {
//     preload: preload, 
//     create: create, 
//     update:update   
// } 

const cartesianToIsometric = (cartPt: Phaser.Geom.Point) => makePoint(cartPt.x - cartPt.y, (cartPt.x + cartPt.y) / 2)
const isometricToCartesian = (isoPt: Phaser.Geom.Point) => makePoint((2 * isoPt.y + isoPt.x) / 2, (2 * isoPt.y - isoPt.x) / 2)
const getTileCoordinates = (cartPt: Phaser.Geom.Point, tileHeight: number) => makePoint(Math.floor(cartPt.x / tileHeight), Math.floor(cartPt.y / tileHeight))
const getCartesianFromTileCoordinates = (tilePt: Phaser.Geom.Point, tileHeight: number) => makePoint(tilePt.x * tileHeight, tilePt.y * tileHeight)

type Facing = 'east' | 'south' | 'north' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest'

const WIDTH = 1024
const HEIGHT = 768

/**
 * 
 */
class GameScene extends Phaser.Scene {

    upKey?: Phaser.Input.Keyboard.Key
    downKey?: Phaser.Input.Keyboard.Key
    leftKey?: Phaser.Input.Keyboard.Key
    rightKey?: Phaser.Input.Keyboard.Key

    //level array
    levelData =
        [[1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 1],
        [1, 0, 1, 2, 0, 1],
        [1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1]];
    //x & y values of the direction vector for character movement
    dX = 0
    dY = 0
    tileWidth = 50// the width of a tile
    borderOffset = makePoint(250, 50);//to centralise the isometric level display
    wallGraphicHeight = 98
    floorGraphicWidth = 103
    floorGraphicHeight = 53
    heroGraphicWidth = 41
    heroGraphicHeight = 62
    wallHeight = this.wallGraphicHeight - this.floorGraphicHeight
    heroHeight = (this.floorGraphicHeight / 2) + (this.heroGraphicHeight - this.floorGraphicHeight) + 6//adjustments to make the legs hit the middle of the tile for initial load
    heroWidth = (this.floorGraphicWidth / 2) - (this.heroGraphicWidth / 2)//for placing hero at the middle of the tile
    facing: Facing = 'south'//direction the character faces
    sorcerer?: Phaser.GameObjects.Sprite//hero
    sorcererShadow?: Phaser.GameObjects.Sprite//duh


    bmpText?: Phaser.GameObjects.BitmapText//title text
    normText?: Phaser.GameObjects.Text//text to display hero coordinates
    minimap?: Phaser.GameObjects.Group//minimap holder group
    heroMapSprite?: Phaser.GameObjects.Sprite //hero marker sprite in the minimap
    gameScene?: Phaser.GameObjects.RenderTexture//this is the render texture onto which we draw depth sorted scene
    floorSprite?: Phaser.GameObjects.Sprite
    wallSprite?: Phaser.GameObjects.Sprite

    shadowOffset = makePoint(this.heroWidth + 7, 11)
    heroMapTile = makePoint() //hero tile values in array
    heroMapPos = makePoint() //2D coordinates of hero map marker sprite in minimap, assume this is mid point of graphic

    heroSpeed = 1.2 //well, speed of our hero 

    constructor() {
        super('demo')
    }

    preload(): void {
        console.log( 'PRELOAD' )
        this.load.crossOrigin = 'Anonymous';
        //load all necessary assets
        this.load.bitmapFont('font', 'https://dl.dropboxusercontent.com/s/z4riz6hymsiimam/font.png?dl=0', 'https://dl.dropboxusercontent.com/s/7caqsovjw5xelp0/font.xml?dl=0');
        this.load.image('greenTile', 'https://dl.dropboxusercontent.com/s/nxs4ptbuhrgzptx/green_tile.png?dl=0');
        this.load.image('redTile', 'https://dl.dropboxusercontent.com/s/zhk68fq5z0c70db/red_tile.png?dl=0');
        this.load.image('heroTile', 'https://dl.dropboxusercontent.com/s/8b5zkz9nhhx3a2i/hero_tile.png?dl=0');
        this.load.image('heroShadow', 'https://dl.dropboxusercontent.com/s/sq6deec9ddm2635/ball_shadow.png?dl=0');
        this.load.image('floor', 'https://dl.dropboxusercontent.com/s/h5n5usz8ejjlcxk/floor.png?dl=0');
        this.load.image('wall', 'https://dl.dropboxusercontent.com/s/uhugfdq1xcwbm91/block.png?dl=0');
        this.load.image('ball', 'https://dl.dropboxusercontent.com/s/pf574jtx7tlmkj6/ball.png?dl=0');

        //this.load.atlasJSONArray('hero', 
        this.load.atlas('hero',
            'https://dl.dropboxusercontent.com/s/hradzhl7mok1q25/hero_8_4_41_62.png?dl=0',
            'https://dl.dropboxusercontent.com/s/95vb0e8zscc4k54/hero_8_4_41_62.json?dl=0');
    }

    create(): void {
        console.log( 'CREATE' )
        this.bmpText = this.add.bitmapText(10, 10, 'font', 'Isometric Tutorial\nUse Arrow Keys', 18);
        this.normText = this.add.text(10, 360, "hi");

        this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

        //we draw the depth sorted scene into this render texture
        this.gameScene = this.add.renderTexture(0, 0, WIDTH, HEIGHT);

        this.add.sprite(0, 0, this.gameScene.texture);

        this.floorSprite = this.make.sprite({ x: 0, y: 0, key: 'floor' /* frame?*/ });
        this.wallSprite = this.make.sprite({ x: 0, y: 0, key: 'wall' /* frame?*/ });

        this.sorcererShadow = this.make.sprite({ x: 0, y: 0, key: 'heroShadow' /* frame?*/ })
        this.sorcererShadow.scaleX = 0.5
        this.sorcererShadow.scaleY = 0.6
        this.sorcererShadow.alpha = 0.4;
        this.createLevel();
    }

    /**
     * create minimap
     */
    createLevel(): void {

        const minimapConfig:Phaser.Types.GameObjects.Group.GroupCreateConfig = {
            setXY: { x:500, y:10},
            setScale: { x: 0.3, y: 0.3}
        }
        this.minimap = this.add.group( minimapConfig );

        // this.minimap.scale = makePoint(0.3, 0.3);
        // this.minimap.x = 500;
        // this.minimap.y = 10;

        var tileType = 0;

        for (var i = 0; i < this.levelData.length; i++) {
            for (var j = 0; j < this.levelData[0].length; j++) {
                tileType = this.levelData[i][j];
                this.placeTile(tileType, i, j);
                if (tileType == 2) {//save hero map tile
                    this.heroMapTile = makePoint(i, j);
                }
            }
        }

        this.addHero();

        this.heroMapSprite = this.minimap.create(this.heroMapTile.y * this.tileWidth, this.heroMapTile.x * this.tileWidth, 'heroTile')

        if( !this.heroMapSprite ) return; // GUARD

        this.heroMapSprite.y += (this.tileWidth / 2) - (this.heroMapSprite.height / 2);
        
        this.heroMapPos = makePoint(this.heroMapSprite.x + this.heroMapSprite.width / 2, this.heroMapSprite.y + this.heroMapSprite.height / 2);
        
        this.heroMapTile = getTileCoordinates(this.heroMapPos, this.tileWidth);
    
        
        this.renderScene(); //draw once the initial state
    }

    addHero(): void {
        // sprite
        this.sorcerer = this.add.sprite(-50, 0, 'hero', '1.png');// keep him out side screen area


        // animation 
        // this.sorcerer.animations.add('southeast', ['1.png', '2.png', '3.png', '4.png'], 6, true);
        this.anims.create( { key:'southeast', 
                frames: this.anims.generateFrameNames('hero', { suffix: '.png', start: 1, end: 4 }), frameRate:6, repeat:-1} )
        // this.sorcerer.animations.add('south', ['5.png', '6.png', '7.png', '8.png'], 6, true);
        this.anims.create( { key:'south', 
                frames: this.anims.generateFrameNames('hero', { suffix: '.png', start: 5, end: 8 }), frameRate:6, repeat:-1} )
        // this.sorcerer.animations.add('southwest', ['9.png', '10.png', '11.png', '12.png'], 6, true);
        this.anims.create( { key:'southwest', 
                frames: this.anims.generateFrameNames('hero', { suffix: '.png', start: 9, end: 12 }), frameRate:6, repeat:-1} )
        // this.sorcerer.animations.add('west', ['13.png', '14.png', '15.png', '16.png'], 6, true);
        this.anims.create( { key:'west', 
                frames: this.anims.generateFrameNames('hero', { suffix: '.png', start: 13, end: 16 }), frameRate:6, repeat:-1} )
        // this.sorcerer.animations.add('northwest', ['17.png', '18.png', '19.png', '20.png'], 6, true);
        this.anims.create( { key:'northwest', 
                frames: this.anims.generateFrameNames('hero', { suffix: '.png', start: 17, end: 20 }), frameRate:6, repeat:-1} )
        // this.sorcerer.animations.add('north', ['21.png', '22.png', '23.png', '24.png'], 6, true);
        this.anims.create( { key:'north', 
                frames: this.anims.generateFrameNames('hero', { suffix: '.png', start: 21, end: 24 }), frameRate:6, repeat:-1} )
        // this.sorcerer.animations.add('northeast', ['25.png', '26.png', '27.png', '28.png'], 6, true);
        this.anims.create( { key:'northeast', 
                frames: this.anims.generateFrameNames('hero', { suffix: '.png', start: 25, end: 28 }), frameRate:6, repeat:-1} )
        // this.sorcerer.animations.add('east', ['29.png', '30.png', '31.png', '32.png'], 6, true);
        this.anims.create( { key:'east', 
                frames: this.anims.generateFrameNames('hero', { suffix: '.png', start: 29, end: 32 }), frameRate:6, repeat:-1} )
    }

    renderScene(): void {

        this.gameScene?.clear() //clear the previous frame then draw again

        let tileType = 0;
        for (var i = 0; i < this.levelData.length; i++) {
            for (var j = 0; j < this.levelData[0].length; j++) {
                tileType = this.levelData[i][j];
                this.drawTileIso(tileType, i, j);
                if (i == this.heroMapTile.y && j == this.heroMapTile.x) {
                    this.drawHeroIso();
                }
            }
        }
        if( this.normText )
            this.normText.text = `Hero is on x,y: ${this.heroMapTile.x},${this.heroMapTile.y}`;
    }



    update(): void {

        //check key press
        this.detectKeyInput();
        //if no key is pressed then stop else play walking animation
        if (this.sorcerer ) {
            if( this.dY == 0 && this.dX == 0) {
                this.sorcerer.anims.stop();
                //this.sorcerer.anims.currentAnim.frame = 0;
            } else {
                if (this.sorcerer.anims.currentAnim?.key != this.facing) {
                    this.sorcerer.anims.play(this.facing);
                }
            }
        }
        //check if we are walking into a wall else move hero in 2D
        if (this.heroMapSprite && this.isWalkable()) {
            this.heroMapPos.x += this.heroSpeed * this.dX;
            this.heroMapPos.y += this.heroSpeed * this.dY;
            this.heroMapSprite.x = this.heroMapPos.x - this.heroMapSprite.width / 2;
            this.heroMapSprite.y = this.heroMapPos.y - this.heroMapSprite.height / 2;
            //get the new hero map tile
            this.heroMapTile = getTileCoordinates(this.heroMapPos, this.tileWidth);
            //depthsort & draw new scene
            this.renderScene();
        }
    }

    drawHeroIso(): void {

        if( !this.heroMapSprite ) return // guard

        const heroCornerPt = makePoint(this.heroMapPos.x - this.heroMapSprite.width / 2, this.heroMapPos.y - this.heroMapSprite.height / 2);
        const isoPt = cartesianToIsometric(heroCornerPt);//find new isometric position for hero from 2D map position

        // draw shadow to render texture
        // this.gameScene.renderXY(this.sorcererShadow, isoPt.x + this.borderOffset.x + this.shadowOffset.x, isoPt.y + this.borderOffset.y + this.shadowOffset.y, false);
        this.gameScene?.draw( this.sorcererShadow, isoPt.x + this.borderOffset.x + this.shadowOffset.x, isoPt.y + this.borderOffset.y + this.shadowOffset.y)
        // draw hero to render texture
        // this.gameScene.renderXY(this.sorcerer, isoPt.x + this.borderOffset.x + this.heroWidth, isoPt.y + this.borderOffset.y - this.heroHeight, false);
        this.gameScene?.draw( this.sorcerer, isoPt.x + this.borderOffset.x + this.heroWidth, isoPt.y + this.borderOffset.y - this.heroHeight)
    }

    placeTile(tileType: number, i: number, j: number) {//place minimap

        const tile = (tileType == 1) ? 'redTile' : 'greenTile';

        this.minimap?.create(j * this.tileWidth, i * this.tileWidth, tile);
    }

    /**
     * place isometric level tiles
     * 
     * @param tileType 
     * @param i 
     * @param j 
     */
    drawTileIso(tileType: number, i: number, j: number) {
        const cartPt = makePoint(j * this.tileWidth, i * this.tileWidth);//This is here for better code readability.
        const isoPt = cartesianToIsometric(cartPt);

        const sprite = (tileType == 1) ? this.wallSprite : this.floorSprite

        //this.gameScene.renderXY(sprite, isoPt.x + this.borderOffset.x, isoPt.y + this.borderOffset.y - this.wallHeight, false);
        this.gameScene?.draw( sprite, isoPt.x + this.borderOffset.x, isoPt.y + this.borderOffset.y - this.wallHeight )
    }

    /**
     * It is not advisable to create points in update loop, but for code readability.
     */
    isWalkable() {
        if( !this.heroMapSprite ) return // guard

        const heroCornerPt = makePoint(this.heroMapPos.x - this.heroMapSprite.width / 2, this.heroMapPos.y - this.heroMapSprite.height / 2)

        const cornerTL = makePoint(heroCornerPt.x + (this.heroSpeed * this.dX), heroCornerPt.y + (this.heroSpeed * this.dY))

        // now we have the top left corner point. we need to find all 4 corners based on the map marker graphics width & height
        //ideally we should just provide the hero a volume instead of using the graphics' width & height
        const cornerTR = makePoint(cornerTL.x + this.heroMapSprite.width, cornerTL.y)

        const cornerBR = makePoint(cornerTR.x, cornerTL.y + this.heroMapSprite.height)

        const cornerBL = makePoint(cornerTL.x, cornerBR.y)

        let newTileCorner1 = makePoint()
        let newTileCorner2 = makePoint()
        let newTileCorner3 = this.heroMapPos;
        //let us get which 2 corners to check based on current facing, may be 3
        switch (this.facing) {
            case "north":
                newTileCorner1 = cornerTL;
                newTileCorner2 = cornerTR;
                break;
            case "south":
                newTileCorner1 = cornerBL;
                newTileCorner2 = cornerBR;
                break;
            case "east":
                newTileCorner1 = cornerBR;
                newTileCorner2 = cornerTR;
                break;
            case "west":
                newTileCorner1 = cornerTL;
                newTileCorner2 = cornerBL;
                break;
            case "northeast":
                newTileCorner1 = cornerTR;
                newTileCorner2 = cornerBR;
                newTileCorner3 = cornerTL;
                break;
            case "southeast":
                newTileCorner1 = cornerTR;
                newTileCorner2 = cornerBR;
                newTileCorner3 = cornerBL;
                break;
            case "northwest":
                newTileCorner1 = cornerTR;
                newTileCorner2 = cornerBL;
                newTileCorner3 = cornerTL;
                break;
            case "southwest":
                newTileCorner1 = cornerTL;
                newTileCorner2 = cornerBR;
                newTileCorner3 = cornerBL;
                break;
        }

        let able = true;

        //check if those corners fall inside a wall after moving
        newTileCorner1 = getTileCoordinates(newTileCorner1, this.tileWidth);
        if (this.levelData[newTileCorner1.y][newTileCorner1.x] == 1) {
            able = false;
        }
        newTileCorner2 = getTileCoordinates(newTileCorner2, this.tileWidth);
        if (this.levelData[newTileCorner2.y][newTileCorner2.x] == 1) {
            able = false;
        }
        newTileCorner3 = getTileCoordinates(newTileCorner3, this.tileWidth);
        if (this.levelData[newTileCorner3.y][newTileCorner3.x] == 1) {
            able = false;
        }
        return able;
    }

    /**
     * assign direction for character & set x,y speed components
     */
    detectKeyInput() {
        if (this.upKey?.isDown) {
            this.dY = -1;
        }
        else if (this.downKey?.isDown) {
            this.dY = 1;
        }
        else {
            this.dY = 0;
        }
        if (this.rightKey?.isDown) {
            this.dX = 1;
            if (this.dY == 0) {
                this.facing = "east";
            }
            else if (this.dY == 1) {
                this.facing = "southeast";
                this.dX = this.dY = 0.5;
            }
            else {
                this.facing = "northeast";
                this.dX = 0.5;
                this.dY = -0.5;
            }
        }
        else if (this.leftKey?.isDown) {
            this.dX = -1;
            if (this.dY == 0) {
                this.facing = "west";
            }
            else if (this.dY == 1) {
                this.facing = "southwest";
                this.dY = 0.5;
                this.dX = -0.5;
            }
            else {
                this.facing = "northwest";
                this.dX = this.dY = -0.5;
            }
        }
        else {
            this.dX = 0;
            if (this.dY == 0) {
                //facing="west";
            }
            else if (this.dY == 1) {
                this.facing = "south";
            }
            else {
                this.facing = "north";
            }
        }
    }

}


// START


const config: Phaser.Types.Core.GameConfig = {
    width: WIDTH,
    height: HEIGHT,
    type: Phaser.AUTO,
    parent: 'gameContainer',
    backgroundColor: '#cccccc',
    scene: GameScene

}

const game = new Phaser.Game(config);
