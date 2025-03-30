
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#000",
    parent: 'game-container',
    physics: {
        default: "arcade",
        arcade: { debug: false }
    },
    scene: {
        preload,
        create,
        update
    }
};

//cfgs base
const game = new Phaser.Game(config);
let player1, player2, ball;
let cursors1, cursors2, spaceKey;
let ballLaunched = false;
let gameStarted = false;
let player1Score = 0;
let player2Score = 0;
let scoreText;

//pontos de vida dos jogadores
let player1Lives = 3;
let player2Lives = 3;
let livesText1, livesText2;

//quiz
let quizActive = false;
let currentPlayer = null;
let quizContainer, quizText, quizOptions, quizFeedback;

//outros
let gameOverText;

function preload() {
    this.textures.generate('paddle', { data: ['3333'], pixelWidth: 10 });
    this.textures.generate('ball', { data: ['3333', '3333', '3333', '3333'], pixelWidth: 4 });
}

function create() {
    this.add.rectangle(5, 300, 10, 600, 0xffffff); //parede esquerda
    this.add.rectangle(795, 300, 10, 600, 0xffffff); //parede direita
    this.add.rectangle(400, 5, 800, 10, 0x888888); //parede superior
    this.add.rectangle(400, 595, 800, 10, 0x888888); //parede inferior

    //rede
    for (let y = 20; y < 580; y += 30) {
        this.add.rectangle(400, y, 8, 15, 0x888888);
    }

    //raquetes e bola
    player1 = this.physics.add.sprite(50, 300, "paddle").setScale(1, 8);
    player2 = this.physics.add.sprite(750, 300, "paddle").setScale(1, 8); 
    ball = this.physics.add.sprite(400, 300, "ball").setScale(1);

    player1.setImmovable(true);
    player2.setImmovable(true);
    ball.setCollideWorldBounds(true);
    ball.setBounce(1, 1);
    ball.setVelocity(0, 0);

    cursors1 = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S
    });

    cursors2 = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN
    });

    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.physics.add.collider(ball, player1, ballHitPaddle, null, this);
    this.physics.add.collider(ball, player2, ballHitPaddle, null, this);

    let leftWall = this.add.rectangle(0, 300, 10, 600, 0x000000);
    let rightWall = this.add.rectangle(800, 300, 10, 600, 0x000000);

    this.physics.add.existing(leftWall, true);
    this.physics.add.existing(rightWall, true);

    this.physics.add.collider(ball, leftWall, () => handleWallCollision("direita"), null, this);
    this.physics.add.collider(ball, rightWall, () => handleWallCollision("esquerda"), null, this);

    //texto de pontuação
    scoreText = this.add.text(400, 50, '0 - 0', {
        fontSize: '32px',
        fill: '#fff',
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    //texto de vidas dos jogadores
    livesText1 = this.add.text(100, 50, 'Vidas: 3', {
        fontSize: '20px',
        fill: '#fff',
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    livesText2 = this.add.text(700, 50, 'Vidas: 3', {
        fontSize: '20px',
        fill: '#fff',
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    //texto de instruções na tela inicial
    this.startText = this.add.text(400, 300, 'Pressione ESPAÇO para iniciar', {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    //Game Over (inicialmente invisível)
    gameOverText = this.add.text(400, 300, '', {
        fontSize: '48px',
        fill: '#ff0000',
        fontFamily: 'Arial',
        backgroundColor: '#000',
        padding: { left: 20, right: 20, top: 10, bottom: 10 }
    }).setOrigin(0.5);
    gameOverText.setVisible(false);

    //interface do quiz (inicialmente invisível)
    createQuizInterface(this);
}


function update() {
    if (quizActive) { //jogo não interagível enquanto o quiz está sendo respondido
        return;
    }

    if (!gameStarted) {
        if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
            startGame();
            this.startText.setVisible(false);
        }
    } else {
        if (cursors1.up.isDown && player1.y > 50) {
            player1.y -= 5;
        } else if (cursors1.down.isDown && player1.y < 550) {
            player1.y += 5;
        }

        if (cursors2.up.isDown && player2.y > 50) {
            player2.y -= 5;
        } else if (cursors2.down.isDown && player2.y < 550) {
            player2.y += 5;
        }

        limitBallSpeed();
    }
}

function startGame() {
    ball.setVelocity(-200, Phaser.Math.Between(-100, 100));
    gameStarted = true;
    gameOverText.setVisible(false);
}

function ballHitPaddle(ball, paddle) {
    let relativeImpact = (ball.y - paddle.y) / (paddle.height / 2);
    let bounceAngle = relativeImpact * 75;
    let newVelocityX = (ball.x < config.width / 2) ? 300 : -300;
    let newVelocityY = Math.tan(Phaser.Math.DegToRad(bounceAngle)) * Math.abs(newVelocityX);
    ball.setVelocity(newVelocityX, newVelocityY);

    increaseBallSpeed(ball); //bola aumenta velocidade smp q acerta raquetes (+dificuldade)
}

function increaseBallSpeed(ball) { //+10% de velocidade a cada acerto
    let velocityX = ball.body.velocity.x;
    let velocityY = ball.body.velocity.y;
    ball.setVelocity(velocityX * 1.1, velocityY * 1.1);

    limitBallSpeed();
}

function limitBallSpeed() { //pra n ficar injogavel
    if (Math.abs(ball.body.velocity.x) > 400) {
        ball.setVelocityX((ball.body.velocity.x > 0) ? 400 : -400);
    }
    if (Math.abs(ball.body.velocity.y) > 300) {
        ball.setVelocityY((ball.body.velocity.y > 0) ? 300 : -300);
    }
}

function handleWallCollision(side) { //determina qual jogador errou baseado em qual parede a bola atingiu
    console.log(`⚠️ Bola bateu na parede ${side}`);

    if (side === "esquerda") {
        player2Score++;
        currentPlayer = 2; //j2 responde quiz
    } else {
        player1Score++;
        currentPlayer = 1; //j2 responde quiz
    }

    scoreText.setText(`${player1Score} - ${player2Score}`);

    ball.setVelocity(0, 0);
    showQuiz();
}


function resetGame() {
    player1Lives = 3;
    player2Lives = 3;
    player1Score = 0;
    player2Score = 0;
    updateLivesDisplay();
    scoreText.setText("0 - 0");
    restartRound();
}

function restartRound() {
    ball.setPosition(400, 300);
    ball.setVelocity(0, 0);
    gameStarted = false;
    player1.setPosition(50, 300);
    player2.setPosition(750, 300);

    game.scene.scenes[0].startText.setVisible(true);
}

function updateLivesDisplay() {
    livesText1.setText(`Vidas: ${player1Lives}`);
    livesText2.setText(`Vidas: ${player2Lives}`);

    //cor da vida muda conforme quantidade de vidas restantes
    if (player1Lives === 1) {
        livesText1.setStyle({ fill: '#ff0000' });
    } else if (player1Lives === 2) {
        livesText1.setStyle({ fill: '#ffff00' });
    } else {
        livesText1.setStyle({ fill: '#ffffff' });
    }

    if (player2Lives === 1) {
        livesText2.setStyle({ fill: '#ff0000' });
    } else if (player2Lives === 2) {
        livesText2.setStyle({ fill: '#ffff00' });
    } else {
        livesText2.setStyle({ fill: '#ffffff' });
    }
}

function checkGameOver() {
    if (player1Lives <= 0) {
        showGameOver(2); //j1 venceu
        return true;
    } else if (player2Lives <= 0) {
        showGameOver(1); //j2 venceu
        return true;
    }
    return false;
}

function showGameOver(winner) {
    gameOverText.setText(`JOGADOR ${winner} VENCEU!`);
    gameOverText.setVisible(true);

    game.scene.scenes[0].startText.setText('Jogador X Perdeu');
    game.scene.scenes[0].startText.setVisible(true); //instrucoes

    let restartText = game.scene.scenes[0].add.text(400, 380, 'Pressione espaço para jogar novamente', {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial'
    }).setOrigin(0.5);

    //espera pressionar espaco pra comecar
    game.scene.scenes[0].input.keyboard.on('keydown-SPACE', () => {
        resetGame();
        restartText.setVisible(false);
    });
}


// QUIZ
function createQuizInterface(scene) {
    quizContainer = scene.add.rectangle(400, 300, 600, 400, 0x333333).setAlpha(0.9);
    quizContainer.setVisible(false);

    //texto do quiz
    quizText = scene.add.text(400, 150, '', {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial',
        align: 'center',
        wordWrap: { width: 500 }
    }).setOrigin(0.5);
    quizText.setVisible(false);

    //opcoes
    quizOptions = [];
    const optionSpacing = 60;
    for (let i = 0; i < 4; i++) {
        let y = 250 + i * optionSpacing;
        let option = scene.add.text(400, y, '', {
            fontSize: '20px',
            fill: '#fff',
            fontFamily: 'Arial',
            backgroundColor: '#4a4a4a',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(0.5);

        option.setInteractive({ useHandCursor: true })
            .on('pointerover', () => option.setStyle({ fill: '#ff0' }))
            .on('pointerout', () => option.setStyle({ fill: '#fff' }))
            .on('pointerdown', () => checkAnswer(i));

        option.setVisible(false);
        quizOptions.push(option);
    }

    //quiz feedback
    quizFeedback = scene.add.text(400, 450, '', {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial',
        align: 'center'
    }).setOrigin(0.5);
    quizFeedback.setVisible(false);
}


//perguntas
let questions = {};

//popula perguntas
fetch('questions.json')
    .then(response => response.json())
    .then(data => {
        questions = data;
    })
    .catch(error => console.error("Erro ao carregar perguntas: ", error));

//pra armazenar perguntas ja feitas
let usedQuestions = {
    portugues: [],
    matematica: [],
    ingles: [],
    geografia: [],
    historia: [],
    ciencias: []
};

function getRandomQuestion() {
    const subjects = Object.keys(questions);  //pega todas as matérias disponíveis
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];

    return getRandomQuestionFromSubject(randomSubject);
}

function getRandomQuestionFromSubject(subject) {
    const availableQuestions = questions[subject].filter((question, index) => !usedQuestions[subject].includes(index));

    if (availableQuestions.length === 0) {
        //reinicia as usadas para a matéria
        usedQuestions[subject] = [];
        return getRandomQuestionFromSubject(subject);  //recursao pra pegar pergunta nova
    }

    const questionIndex = Math.floor(Math.random() * availableQuestions.length);
    const question = availableQuestions[questionIndex];

    //seta pergunta usada
    const actualIndex = questions[subject].indexOf(question);
    usedQuestions[subject].push(actualIndex);

    return question;
}

function showQuiz() {
    quizActive = true;

    const question = getRandomQuestion('portugues');

    quizText.setText(`Jogador ${currentPlayer}, responda:\n\n${question.question}`);

    //config opcoes
    for (let i = 0; i < 4; i++) {
        quizOptions[i].setText(`${String.fromCharCode(65 + i)}) ${question.options[i]}`);
        quizOptions[i].correctAnswer = (i === question.answer);
    }

    quizFeedback.setText('');

    //quiz elementos
    quizContainer.setVisible(true);
    quizText.setVisible(true);
    quizFeedback.setVisible(true);
    quizOptions.forEach(option => option.setVisible(true));
}


function checkAnswer(optionIndex) {
    const option = quizOptions[optionIndex];

    if (option.correctAnswer) {
        //resposta correta
        quizFeedback.setText('Correto! Continue jogando.');
        quizFeedback.setStyle({ fill: '#0f0' });

        setTimeout(() => {
            hideQuiz();
            restartRound();
        }, 2000);
    } else {
        //resposta incorreta - perde uma vida
        if (currentPlayer === 1) {
            player1Lives--;
        } else {
            player2Lives--;
        }

        updateLivesDisplay();

        //verifica se o jogador perdeu todas as vidas
        if (player1Lives <= 0 || player2Lives <= 0) {
            quizFeedback.setText('Incorreto! Você perdeu todas as vidas!');
            quizFeedback.setStyle({ fill: '#f00' });

            //Game Over
            setTimeout(() => {
                hideQuiz();
                showGameOver(currentPlayer === 1 ? 2 : 1);
            }, 500);
        } else {
            quizFeedback.setText(`Incorreto! Você perdeu uma vida. Vidas restantes: ${currentPlayer === 1 ? player1Lives : player2Lives}`);
            quizFeedback.setStyle({ fill: '#f00' });

            setTimeout(() => {
                hideQuiz();
                restartRound();
            }, 2000);
        }
    }
}

function hideQuiz() {
    quizActive = false;
    quizContainer.setVisible(false);
    quizText.setVisible(false);
    quizFeedback.setVisible(false);
    quizOptions.forEach(option => option.setVisible(false));
}