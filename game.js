class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        this.load.image('background', 'menu_background.jpg');
    }

    create() {
        const { width, height } = this.sys.game.config;

        // Ajout du background centré et redimensionné pour couvrir l'écran
        const bg = this.add.image(width / 2, height / 2, 'background');
        bg.setDisplaySize(width, height); // Redimensionner l'image pour qu'elle remplisse l'écran

        const title = this.add.text(width / 2, 200, 'Labyrinthe 2D', { font: '40px Arial', fill: '#fff' });
        title.setOrigin(0.5);

        const playButton = this.add.text(width / 2, 400, 'Jouer', { font: '30px Arial', fill: '#0f0' })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => this.scene.start('GameScene'));

        const settingsButton = this.add.text(width / 2, 500, 'Paramètres', { font: '30px Arial', fill: '#ff0' })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => this.scene.start('SettingsScene'));
        const quitButton = this.add.text(width / 2, 600, 'Quitter', { font: '30px Arial', fill: '#f00' })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => this.quitGame());
    }

}

class GameScene extends Phaser.Scene {

    constructor() {
        super({ key: 'GameScene' });
        this.grid = [];
        this.collectedObjects = 0;
        this.playerSpeed = 160;
    }

    preload() {
        this.load.image('player', 'alice.png');
        this.load.image('wall', 'wall.jpg');
        this.load.image('object', 'object.png');
        this.load.image('exit', 'exit.png');
        this.load.image('ennemie', 'goat.png');
    }

    create() {
        this.scene.launch('HudScene'); // Launch the HUD scene here
        this.hudScene = this.scene.get('HudScene'); // Reference to access it
        this.hudScene.reset();

        const cols = 30, rows = 30, cellSize = 40;
        this.cols = cols;
        this.rows = rows;
        this.cellSize = cellSize;

        this.keys = this.input.keyboard.addKeys(keyBindings);

        this.lights.enable().setAmbientColor(0x000000);

        this.walls = this.physics.add.staticGroup();
        this.objects = this.physics.add.group();
        this.enemies = this.physics.add.group();

        this.grid = this.generateMaze(cols, rows);

        // Placement des murs parfaitement collés
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if (this.grid[y][x] === 1) {
                    const wall = this.walls.create(
                        x * cellSize + cellSize / 2,
                        y * cellSize + cellSize / 2,
                        'wall'
                    ).setPipeline('Light2D');

                    wall.setDisplaySize(cellSize, cellSize).refreshBody();
                }
            }
        }


        this.player = this.physics.add.sprite(cellSize, cellSize, 'player').setScale(0.7).setOrigin((-0.5)).setPipeline('Light2D');
        this.physics.add.collider(this.player, this.walls);

        this.placeObjects(5).forEach(pos => {
            this.objects.create(pos.x * cellSize + cellSize / 2, pos.y * cellSize + cellSize / 2, 'object').setScale(0.05).setPipeline('Light2D');
        });

        let exitPos = this.placeObjects(1)[0];
        this.exit = this.physics.add.staticSprite(exitPos.x * cellSize + cellSize / 2, exitPos.y * cellSize + cellSize / 2, 'exit').setScale(0.06).setPipeline('Light2D');

        this.spawnEnemies();

        this.playerLight = this.lights.addLight(this.player.x, this.player.y, 150).setColor(0xffffff).setIntensity(1);




        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBounds(0, 0, cols * cellSize, rows * cellSize);

        this.physics.add.overlap(this.player, this.objects, this.collectObject, null, this);

        this.physics.add.collider(this.enemies, this.walls, this.handleEnemyWallCollision, null, this);

        this.physics.add.overlap(this.player, this.enemies, this.playerHitEnemy, null, this);
    }

    update() {
        this.player.setVelocity(0);

        if (this.keys.left.isDown) this.player.setVelocityX(-this.playerSpeed);
        if (this.keys.right.isDown) this.player.setVelocityX(this.playerSpeed);
        if (this.keys.up.isDown) this.player.setVelocityY(-this.playerSpeed);
        if (this.keys.down.isDown) this.player.setVelocityY(this.playerSpeed);

        this.playerLight.x = this.player.x;
        this.playerLight.y = this.player.y;


        this.enemies.getChildren().forEach(enemy => this.moveEnemy(enemy));

        if (this.collectedObjects === 7) {
            this.exit.setAlpha(1);
        }
    }



    // Modification de la fonction spawnEnemies
    spawnEnemies() {
        let validCells = [];
        for (let x = 1; x < this.cols - 1; x++) {
            for (let y = 1; y < this.rows - 1; y++) {
                if (this.grid[y][x] === 0) { // Vérifier si la cellule est libre
                    let freeNeighbors = 0;
                    if (this.grid[y - 1][x] === 0) freeNeighbors++;
                    if (this.grid[y + 1][x] === 0) freeNeighbors++;
                    if (this.grid[y][x - 1] === 0) freeNeighbors++;
                    if (this.grid[y][x + 1] === 0) freeNeighbors++;
                    if (freeNeighbors >= 3) validCells.push({ x, y });
                }
            }
        }

        for (let i = 0; i < 5; i++) {
            let pos = validCells.splice(Phaser.Math.Between(0, validCells.length - 1), 1)[0];
            if (pos) {
                let enemy = this.physics.add.sprite(pos.x * this.cellSize + this.cellSize / 2, pos.y * this.cellSize + this.cellSize / 2, 'ennemie').setScale(0.06).setPipeline('Light2D');
                enemy.setData('direction', 'right');
                this.enemies.add(enemy);
            }
        }
    }

    // Modification de la fonction placeObjects
    placeObjects(count) {
        let positions = [];
        while (positions.length < count) {
            let x = Phaser.Math.Between(0, this.cols - 1);
            let y = Phaser.Math.Between(0, this.rows - 1);
            if (this.grid[y][x] === 0 && !positions.some(p => p.x === x && p.y === y)) { // Vérifier que la cellule est libre
                positions.push({ x, y });
            }
        }
        return positions;
    }



    moveEnemy(enemy) {
        const speed = 100;
        const direction = enemy.getData('direction');

        if (direction === 'right') {
            enemy.setVelocityX(speed);
            if (enemy.x > (this.cols - 2) * this.cellSize) enemy.setData('direction', 'left');
        } else {
            enemy.setVelocityX(-speed);
            if (enemy.x < 2 * this.cellSize) enemy.setData('direction', 'right');
        }
    }

    handleEnemyWallCollision(enemy, wall) {
        const direction = enemy.getData('direction');
        if (direction === 'right') {
            enemy.setData('direction', 'left');
        } else {
            enemy.setData('direction', 'right');
        }
    }

    playerHitEnemy(player, enemy) {
        this.physics.pause();
        player.setTint(0xff0000);

        // Afficher le message "Vous êtes mort"
        const { width, height } = this.cameras.main;
        const deathText = this.add.text(width / 2, height / 2, 'Vous êtes mort', {
            font: '50px Arial',
            fill: '#ff0000'
        }).setOrigin(0.5).setScrollFactor(0); // Pour qu'il reste fixe à l'écran

        // Effet de fondu (transition écran noir)
        this.cameras.main.fade(2000, 0, 0, 0);

        // Après la transition, revenir au Menu
        this.time.delayedCall(2000, () => {
            this.scene.start('MenuScene');
        });
    }


    generateMaze(cols, rows) {
        let maze = Array(rows).fill().map(() => Array(cols).fill(1));
        let stack = [{ x: 1, y: 1 }];
        maze[1][1] = 0;

        while (stack.length) {
            let { x, y } = stack.pop();
            Phaser.Utils.Array.Shuffle([{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }]).forEach(({ x: dx, y: dy }) => {
                let nx = x + dx, ny = y + dy;
                if (nx > 0 && ny > 0 && nx < cols - 1 && ny < rows - 1 && maze[ny][nx] === 1) {
                    maze[ny][nx] = 0;
                    maze[y + dy / 2][x + dx / 2] = 0;
                    stack.push({ x: nx, y: ny });
                }
            });
        }
        return maze;
    }

    collectObject(player, object) {
        object.destroy();
        this.collectedObjects++;
        this.hudScene.updateObjectCount(this.collectedObjects, 5); // Update HUD with the correct count
    }

}
class HudScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HudScene' });
        this.objectCountText = null; // Initialize objectCountText
    }

    create() {
        const { width } = this.sys.game.config;

        this.objectCountText = this.add.text(20, 20, 'Objets: 0/5', {
            font: '30px Arial',
            fill: '#ffffff'
        }).setScrollFactor(0);
    }

    updateObjectCount(count, total) {
        if (this.objectCountText) {
            this.objectCountText.setText(`Objets: ${count}/${total}`);
        }
    }

    reset() {
        if (this.objectCountText) {
            this.objectCountText.setText('Objets: 0/5');
        }
    }
}

class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create() {
        const { width, height } = this.sys.game.config;

        this.add.text(width / 2, 100, 'Paramètres - Configurer les touches', { font: '30px Arial', fill: '#fff' }).setOrigin(0.5);

        let yPos = 200;
        Object.keys(keyBindings).forEach((action) => {
            const text = this.add.text(width / 2, yPos, `${action.toUpperCase()} : ${keyBindings[action]}`, { font: '25px Arial', fill: '#ff0' })
                .setOrigin(0.5)
                .setInteractive();

            text.on('pointerdown', () => {
                this.waitForKeyPress(action, text);
            });

            yPos += 60;
        });

        this.add.text(width / 2, height - 100, 'Retour', { font: '25px Arial', fill: '#f00' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('MenuScene'));
    }

    waitForKeyPress(action, textElement) {
        this.input.keyboard.once('keydown', (event) => {
            keyBindings[action] = event.key.toUpperCase();
            textElement.setText(`${action.toUpperCase()} : ${keyBindings[action]}`);
        });
    }
}
const keyBindings = {
    up: 'Z',
    down: 'S',
    left: 'Q',
    right: 'D'
};

const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [MenuScene, GameScene, SettingsScene, HudScene] // Ajouter les scènes ici

};

const game = new Phaser.Game(config);


