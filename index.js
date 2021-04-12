const { Telegraf } = require("telegraf");
const fs = require("fs");

//The string is the bot token. The 'bot' object will be the link between server-side and Telegram.
const bot = new Telegraf("1609713158:AAFFu8RHnlupmT3raOAg7vsfcRiazuaMIkk");

bot.command('play', ctx => {

    //Taking out the number of players selected.
    const playersCount = parseInt(ctx.message.text.split(" ")[1]);

    //Checking if the number of players is valid.
    if (!isNaN(playersCount)) {

        //Singleplayer
        if (playersCount < 2) {
            ctx.reply("Single Player mode selected! Try to guess my code! :)");
            generateSingleplayer(ctx);
        }
        //Multiplayer
        else {
            ctx.reply("Multiplayer mode selected! I'll now wait for the initiator of the game to send me a message! :)");
            createGame(ctx, playersCount);
        }
    } 
    else {
        ctx.reply("I don't understand :/ ")
    }
});

bot.command('set', ctx => {
    if (typeof code !== 'undefined'){
        ctx.reply("There is no game in progress. /help for commands to start the game!");
    }
    else{
        const code = parseInt(ctx.message.text.split(" ")[1]);

        if (!isNaN(code)) {
            linkCode(ctx, code);
        } 
        else {
            ctx.reply("Sorry, your code is invalid. :/");
        }
    }
})

bot.command('stop', ctx => {
    const gameData = getGameData(ctx);
    if (typeof gameData == 'undefined' || gameData.code == null || gameData.code == undefined){
        ctx.reply("There is no game in progress. /help for commands to start the game!");
    }

    else{
        ctx.reply("Ok, we shall end the game here!\nThe code was " + gameData.code + "!");
        deleteGame(ctx);
    }
})

bot.command('help', ctx => {
    ctx.reply("/help - Lists the commands available for the bot" + 
    "\n/rules - Lists the rules for the game" +
    "\n/play (no. of players) - Starts game with number of guessers" + 
    "\n/set (4-digit number) - Sets the code to be guessed (Can be done in direct message to the bot)" + 
    "\n/stop - Stops the game (Game must be started first!)")
})

bot.command('rules', ctx => {
    ctx.reply("Mastermind is a difficult puzzle game, in which players try to guess the code the bot / other players come up with." + 
    "\nIn single player, the bot will generate a code and the player will begin guessing." + 
    "\nIn multiplayer, the initiator of the game will send the bot a code in direct message through the command /set (4-digit code)" +
    "\n\n1. The initiator of the game will send /play (no. of players) in direct message to the bot / in the group chat with bot and other players." +
    "\n\n2. In single player, the bot will generate the code and the player can start guessing." + 
    "\nIn multiplayer, the initiator can send the command /set (4-digit number) in direct message to the bot (to avoid exposing code in the group chat)." +
    "\n\n3. During the guessing phase, the bot will only recognize 4-digit number responses, and will response with the past guesses, along with 2 numbers after the guess." +
    "\nThe first digit represents the number of digits that are in the code, but may be in the wrong position." +
    "\nThe second digit represents the number of digits that are in the code AND are in the right position." +
    "\n\nE.g. if the code is 5678 and you guess 5812, the bot will respond with 5812 2️⃣:1️⃣ as there are 2 digits that are in the code and only 1 of them are in the correct position." +
    "\n\n\nYou have 12 guesses * no. of guessers total to guess the code. Have fun!!")
})

bot.on('message', ctx => {
    const code = parseInt(ctx.message.text);

    if (!isNaN(code) && code > 999 && code < 10000) {

        const gameData = getGameData(ctx);

        if (gameData) {
            handleGuess(ctx, code);
        }

    }

})

const linkCode = (ctx, code) => {
    const gameData = getGameData(ctx);

    if (gameData) {
        const chatId = gameData.chatId;
        gameData.code = code;
        setGameData(gameData);
        userId = ctx.message.from.id;
        bot.telegram.sendMessage(chatId, "I'm ready! 👌");
    } 

    else {
        ctx.reply('Sorry, you are not the initiator of any game. 😬');
    }

}

const getGameData = ctx => {
    const data = JSON.parse(fs.readFileSync('games.json')).data;
    for (const game of data) {
        if (game.initiatorId == ctx.message.from.id || game.chatId == ctx.message.chat.id) {
            return game;
        }
    }
    return undefined
}

const setGameData = gameData => {
    const data = JSON.parse(fs.readFileSync('games.json'));

    for (let i = 0; i < data.data.length; i++) {
        if (data.data[i].chatId == gameData.chatId) {
            data.data[i] = gameData;
        }
    }

    fs.writeFileSync('games.json', JSON.stringify(data));
}

const createGame = (ctx, playersCount, code) => {
    const data = JSON.parse(fs.readFileSync('games.json'));

    const gameData = {
        initiatorId: ctx.message.from.id,
        chatId: ctx.message.chat.id,
        previousGuesses: [],
        playersCount: playersCount,
        userId: ctx.message.from.id,
        code: code
    }

    data.data.push(gameData);
    fs.writeFileSync('games.json', JSON.stringify(data));
}

const deleteGame = ctx => {
    const data = JSON.parse(fs.readFileSync('games.json'));

    for (let i = 0; i < data.data.length; i++) {
        if (data.data[i].chatId == ctx.message.chat.id) {
            data.data.splice(i, 1);
        }
    }

    fs.writeFileSync('games.json', JSON.stringify(data));
}

const handleGuess = (ctx, code) => {
    const gameData = getGameData(ctx);

    if (gameData.code != null) {
        if ((ctx.message.from.id == gameData.userId) && gameData.playersCount >= 2) {
            ctx.reply('Sorry, you are the initiator of this game and cannot play. 😬');
        }
        else if((ctx.message.from.id != gameData.userId) && gameData.playersCount == 1){
            ctx.reply('Sorry, this is a single player game and you are not the initiator of the game!');
        }

        else {
            if (code == gameData.code) {
                generateWin(ctx);
                deleteGame(ctx);
            }
            else {
                let score = []
                let realCode = String(gameData.code);
                let guessCode = String(code);
                let goodNumbers = 0;
                let exactNumbers = 0;
        
                for (const _ of realCode) {
                    score.push({ goodNumber: 0, exactNumber: 0 });
                }
        
                for (let i = 0; i < guessCode.length; i++) {
        
                    console.log(realCode + ' ' + guessCode)
        
                    if (realCode.includes(guessCode[i])) {
        
                        for (let j = 0; j < realCode.length; j++) {
                            if (realCode[j] == guessCode[i] && score[j].goodNumber < 1) {
                                score[j].goodNumber = 1;
                                break;
                            }
                        }
        
                        if (realCode[i] == guessCode[i]) {
                            score[i].exactNumber = 1;
                        }
        
                    }
                }
        
                for (const state of score) {
                    goodNumbers += state.goodNumber;
                    exactNumbers += state.exactNumber;
                }
        
                generateLose(ctx, code, goodNumbers, exactNumbers)
            }
        }
    }
    else {
        ctx.reply('Please start the game first!');
    }
}

const generateWin = ctx => {
    bot.telegram.sendMessage(ctx.message.chat.id, "Well done " + ctx.message.from.first_name + "! You won ✨")
}

const generateLose = (ctx, code, goodNumbers, exactNumbers) => {
    const gameData = getGameData(ctx);
    gameData.previousGuesses.push({ code: code, goodNumbers: goodNumbers, exactNumbers: exactNumbers });

    playersCount = gameData.playersCount;
    if (gameData.playersCount == 1){
        playersCount = 2;
    }
    if (gameData.previousGuesses.length < 12 * (playersCount - 1)) {
        let loseString = '';

        for (let i = 0; i <  gameData.previousGuesses.length; i++) {
            const previousGuess = gameData.previousGuesses[i];
            loseString += (i+1)+") "+previousGuess.code + ' ' + findEmoji(previousGuess.goodNumbers) + ':' + findEmoji(previousGuess.exactNumbers) + '\n';
        }

        bot.telegram.sendMessage(ctx.message.chat.id, loseString)
        setGameData(gameData);
    }
    else {
        bot.telegram.sendMessage(ctx.message.chat.id, "Guessers lose this game! 😫\nSolution was: " + gameData.code + "!");
        deleteGame(ctx)
    }
}

const generateSingleplayer = ctx => {

    let code = Math.floor(Math.random() * 10000);

    while (code < 1000) {
        code = Math.floor(Math.random() * 10000)
    }

    createGame(ctx, 1, code);
}

const findEmoji = number => {
    switch (number) {
        case 0:
            return '0️⃣';
        case 1:
            return '1️⃣';
        case 2:
            return '2️⃣';
        case 3:
            return '3️⃣';
        case 4:
            return '4️⃣';
        default:
            return '0️⃣';
    }
}

bot.launch()