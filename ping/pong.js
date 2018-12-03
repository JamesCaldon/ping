const c = document.createElement("canvas");

const ctx = c.getContext('2d');



c.width = window.innerWidth;
c.height = window.innerHeight;

document.body.appendChild(c);
document.body.style.margin = "0px";
ctx.globalAlpha = 0.01;
socket = null;
totalScripts = 0;
scriptsLoaded = 0;

localPaddle = 0;

function addScript(src) {
    totalScripts += 1;
    s = document.createElement("script");
    s.setAttribute('src',src);
    document.head.appendChild(s);
    s.onload = function() {
        scriptsLoaded += 1;
        if (totalScripts == scriptsLoaded) {
            init();
        }
    }
    
}

addScript("https://code.jquery.com/jquery-1.11.1.js");
addScript("/socket.io/socket.io.js");

function createPlayer(keyUp = "w", keyDown = "s") {
    return {
        score: 0,
        upKey: keyUp,
        downKey: keyDown
    }
}

function createBall() {
    return {
        x: c.width/2,
        y: c.height/2,
        radius: 5,
        xvelocity: 0,
        yvelocity: 0
    };
}

function createPaddle(xc, yc) {
    return {
        x: xc * c.width,
        y: yc * c.height,
        length: 128*2,
        lineWidth: 8,
        speed: 10,
        canmove: 0,
        shadowBlur: 2,
        shadowColor: "red",
        move: function() {
            var topCollision = (this.y + ((this.speed+this.length/2) * this.canmove) <= c.height); 
            if (topCollision && this.y + ((this.speed+this.length/2) * this.canmove) >= 0) {
                this.y += (this.speed * this.canmove);
            } else if (topCollision) {
                this.y = this.length/2;
            } else {
                this.y = c.height- this.length/2;
            }
        },
        pulseTimer: 20,
        pulse: function() {

            if (this.pulseTimer-- > 2) {
                var pulseBound = this.pulse.bind(this);
                this.shadowBlur = this.pulseTimer;
                requestAnimFrame(pulseBound);
            }

            else this.pulseTimer = 20;

        }

    };
}

ball = createBall();

paddles = [createPaddle(0.05,0.5), createPaddle(0.95,0.5)];
stop = false;
players = [createPlayer(), createPlayer("ArrowUp", "ArrowDown")]
window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000/60);
    };
})();

function animate() {


    displayCanvas();
    if (!stop) {
        displayBall();
    }
    displayPaddles();

    displayScore();



    requestAnimFrame(function() {animate()});
}


function displayCanvas() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
}

function displayBall() {
    debug();
    scoreCollision();
    if (ballPaddlesCollision()) {
        ball.xvelocity = -ball.xvelocity;
    }
    if (verticalBallCollision()) {
        ball.yvelocity = -ball.yvelocity;
    }
    ball.x += ball.xvelocity;
    ball.y += ball.yvelocity;
    paddles.forEach(paddle => {
        if(between(ball.y, paddle.y-paddle.length/2, paddle.y+paddle.length/2) && between(ball.x+ball.xvelocity, paddle.x-ball.xvelocity, paddle.x+ball.xvelocity)) {

            ctx.shadowBlur = paddle.shadowBlur;
            ctx.shadowColor = paddle.shadowColor;
            ctx.beginPath();
            ctx.moveTo(paddle.x,paddle.y-paddle.length/2);
            ctx.lineTo(ball.x, ball.y);
            ctx.lineTo(paddle.x,paddle.y+paddle.length/2);
            ctx.stroke();
            ctx.fill();

        }
    });
    ctx.beginPath();
    ctx.shadowColor = "";
    ctx.arc(ball.x, ball.y, ball.radius, 0, 360, false);
    ctx.fillStyle = "white";
    ctx.fill();
}

function scoreCollision() {
    if (ball.x <= 0) {socket.emit("ClientNextRound", 1); stop = true};
    if (ball.x >= c.width) {socket.emit("ClientNextRound", 0); stop = true};
}

function nextRound(playerIndex) {
    ball.yvelocity = 0;
    ball.x = c.width/2;
    ball.y = c.height/2;
    paddles.forEach(paddle => {
        paddle.y = c.height/2;
    });
    players[playerIndex].score += 1;
}
function ballPaddlesCollision() {
    var collision = false;
    paddles.forEach(paddle => {

        if (between(paddle.x, ball.x, ball.x+ball.xvelocity) && (between(ball.y, paddle.y+paddle.length/2, paddle.y-paddle.length/2))) {
            ball.yvelocity += Math.floor(((ball.y-paddle.y)/paddle.length)*20);
            paddle.pulse();
            collision = true;
        }

    });
    return collision;
}

function verticalBallCollision() {
    return (between(0, ball.y, ball.y+ball.yvelocity) || between(c.height, ball.y, ball.y+ball.yvelocity));
}

function between(x, a, b) {
    return (x-a)*(x-b)<=0;
}
function debug() {
    ctx.fillStyle = "white";
	ctx.fillText("Ball X: " + ball.x.toFixed(0),10,50);
	ctx.fillText("Ball Y: " + ball.y,10,70);
	for (var i = 0; i < paddles.length; i++) {
		ctx.fillText("Paddle " + (i+1) + " x: " + paddles[i].x.toFixed(0), 10, 90+ i*20)
		ctx.fillText("Paddle " + (i+1) + " y: " + paddles[i].y, 10, 130+ i*20)
	}
}

function displayScore() {
    ctx.shadowColor = "red";
    ctx.shadowBlur = 0;
    ctx.font = "200px Arial"
    ctx.fillStyle = "white";
    ctx.globalAlpha = 0.2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(players[0].score, c.width*0.15, c.height*0.5);
    ctx.fillText(players[1].score, c.width*0.85, c.height*0.5);
    ctx.fillText(localPaddle+1, c.width*0.5, c.height*0.5);
    ctx.globalAlpha = 1;
}

function displayPaddles() {
    paddles.forEach(paddle => {
        paddle.move();
        ctx.shadowColor = paddle.shadowColor;
        ctx.shadowBlur = paddle.shadowBlur;
        ctx.beginPath();
        ctx.moveTo(paddle.x,paddle.y-paddle.length/2);
        ctx.lineTo(paddle.x,paddle.y+paddle.length/2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = paddle.lineWidth;
        ctx.lineCap = "round";
        ctx.stroke(); 
    });

}

addEventListener("keydown", (event) => keydown(event.key));
addEventListener("keyup", (event) => keyup(event.key));

function keydown(e) {
    switch (e) {
        case players[localPaddle].upKey:
            paddles[localPaddle].canmove = -1;
            if (socket != null && socket.connected) {
                socket.emit("ClientPaddleMoveUp");
            }
            break;
        case players[localPaddle].downKey:
            paddles[localPaddle].canmove = 1;
            if (socket != null && socket.connected) {
                socket.emit("ClientPaddleMoveDown");
            }
            break;
        default:
            break;
    }
}


function keyup(e) {
    switch (e) {
        case players[localPaddle].upKey:
            if (paddles[localPaddle].canmove === -1) {
                paddles[localPaddle].canmove = 0;
            }
            if (socket != null && socket.connected) {
                socket.emit("ClientPaddleStopMoveUp");
            }
            break;
        case players[localPaddle].downKey:
            if (paddles[localPaddle].canmove === 1) {
                paddles[localPaddle].canmove = 0;
            }
            if (socket != null && socket.connected) {
                socket.emit("ClientPaddleStopMoveDown");
            }
            break;
        default:
            break;
    }
}

animated = false;
function init() {
    socket = io();
    socket.on("ServerPaddleMoveDown", function (paddleIndex) {
        console.log(paddleIndex);
        paddles[paddleIndex].canmove = 1;
    });

    socket.on("ServerPaddleMoveUp", function (paddleIndex) {
        paddles[paddleIndex].canmove = -1;
    });

    socket.on("ServerPaddleStopMoveDown", function (paddleIndex) {
        if (paddles[paddleIndex].canmove == 1) {
            paddles[paddleIndex].canmove = 0;
        }
    });

    socket.on("ServerPaddleStopMoveUp", function (paddleIndex) {
        if (paddles[paddleIndex].canmove == -1) {
            paddles[paddleIndex].canmove = 0;
        }
    });

    socket.on("ServerPlayerPaddleIndex", function (paddleIndex) {
        localPaddle = paddleIndex;
        players[paddleIndex].upKey = "w";
        players[paddleIndex].downKey = "s";
    });

    socket.on("ServerSync", function (paddleIndex, ballx, bally, paddley) {
        /*
        ball.x = ballx;
        ball.y = bally;
        paddles[paddleIndex].y = paddley;
        */
        
    });

    socket.on("GameReady", function () {
        if (animated) return;
        animated = true;
        animate();
    });

    socket.on("ServerNextRound", function (winner) {
        stop = false;
        nextRound(winner);
    });

    setInterval(() => {
        socket.emit("ClientSync", ball.x, ball.y, paddles[localPaddle].y);
        console.log("Sync!");
    }, 500);
}