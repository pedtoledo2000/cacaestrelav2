// constantes do jogo
const TEMPO_INICIAL = 30;
const TAMANHO_ALVO = 50;
const ALTURA_PLACAR = 70;
const TEMPO_BASE_ALVO = 1500;
const MAX_ALVOS_SIMULTANEOS = 3;
const CORES_ESTRELAS = ["#ffffff", "#ffe81f", "#4bd5ec", "#ff9ff3", "#a29bfe"];
const CHAVE_RANKING = "cacaEstelarRankingTop5";
const CHAVE_ULTIMO_PILOTO = "cacaEstelarUltimoPiloto";

// Variáveis jogo
let pontos = 0;
let tempo = TEMPO_INICIAL;
let nomePiloto = "Piloto";
let intervaloCronometro = null;
let jogoAtivo = false;
const timersAlvos = new Set();

// pegando elementos do html
const spanPilotoAtual = document.getElementById("pilotoAtual");
const spanPontos = document.getElementById("pontos");
const spanTempo = document.getElementById("tempo");
const spanPontuacaoFinal = document.getElementById("pontuacaoFinal");
const telaInicial = document.getElementById("telaInicial");
const telaFim = document.getElementById("telaFim");
const inputNome = document.getElementById("inputNome");
const btnIniciar = document.getElementById("btnIniciar");
const btnReiniciar = document.getElementById("btnReiniciar");
const btnLimparRanking = document.getElementById("btnLimparRanking");
const boxRankingInicial = document.getElementById("boxRankingInicial");
const listaRankingInicial = document.getElementById("listaRankingInicial");
const listaRankingFim = document.getElementById("listaRankingFim");

// audios
const audioFundo = document.getElementById("audioFundo");
const audioLaser = document.getElementById("audioLaser");
const audioImpactoNave = document.getElementById("audioImpactoNave");
const audioExplosao = document.getElementById("audioExplosao");
const audioBonusTempo = document.getElementById("audioBonusTempo");

// quantidade de estrelas de acordo com o tamanho da tela
function calcularQuantidadeEstrelas() {
    const areaTela = window.innerWidth * window.innerHeight;
    return Math.max(30, Math.floor(areaTela / 15000));
}

// cria as estrelas no fundo
function criarEstrelas() {
    const numStars = calcularQuantidadeEstrelas();

    for (let cont = 0; cont < numStars; cont++) {
        const star = document.createElement("div");
        const x = Math.floor(Math.random() * window.innerWidth);
        const y = Math.floor(Math.random() * window.innerHeight);
        const corSorteada = CORES_ESTRELAS[Math.floor(Math.random() * CORES_ESTRELAS.length)];

        star.className = "star";
        star.style.left = `${x}px`;
        star.style.top = `${y}px`;
        star.style.backgroundColor = corSorteada;
        star.style.animationDelay = `${(Math.random() * 2).toFixed(2)}s`;

        document.body.append(star);
    }
}

// refaz as estrelas se mudar o tamanho da janela
window.addEventListener("resize", function () {
    document.querySelectorAll(".star").forEach(function (s) {
        s.remove();
    });
    criarEstrelas();
});

// retorna x, y dentro da tela sem bater no placar nem em outro alvo
function posicaoAleatoria() {
    const limiteX = Math.max(0, window.innerWidth - TAMANHO_ALVO);
    const limiteSuperiorY = ALTURA_PLACAR;
    const limiteInferiorY = Math.max(limiteSuperiorY, window.innerHeight - TAMANHO_ALVO);
    const alvosAtivos = document.querySelectorAll(".alvo");

    let x = 0;
    let y = limiteSuperiorY;

    for (let tentativa = 0; tentativa < 15; tentativa++) {
        x = Math.floor(Math.random() * limiteX);
        y = Math.floor(Math.random() * (limiteInferiorY - limiteSuperiorY)) + limiteSuperiorY;

        let sobrepos = false;
        alvosAtivos.forEach(function (outro) {
            const outroX = parseInt(outro.style.left, 10) || 0;
            const outroY = parseInt(outro.style.top, 10) || 0;
            const distancia = Math.hypot(x - outroX, y - outroY);

            if (distancia < TAMANHO_ALVO + 10) {
                sobrepos = true;
            }
        });

        if (!sobrepos) break;
    }

    return [x, y];
}

// Placar atualizar
function atualizarPlacar() {
    spanPilotoAtual.textContent = nomePiloto;
    spanPontos.textContent = pontos;
    spanTempo.textContent = tempo;
}

// mostrar tempo e pontos flutuando
function mostrarFeedback(x, y, texto, cor) {
    const msg = document.createElement("span");
    msg.className = "feedback-flutuante";
    msg.textContent = texto;
    msg.style.left = `${x}px`;
    msg.style.top = `${y}px`;
    msg.style.color = cor;

    document.body.append(msg);
    setTimeout(function () {
        msg.remove();
    }, 750);
}

// remove todos os alvos da tela e limpa os timers
function limparAlvosAtivos() {
    timersAlvos.forEach(function (timerId) {
        clearTimeout(timerId);
    });
    timersAlvos.clear();

    document.querySelectorAll(".alvo").forEach(function (alvo) {
        alvo.remove();
    });
}

// aumento de dificuldade
function calcularTempoAlvo() {
    return Math.max(700, TEMPO_BASE_ALVO - pontos * 40);
}

// Sistema de audio do jogo
function tocarSom(elementoAudio, volume = 0.85) {
    if (!elementoAudio) return;
    elementoAudio.volume = volume;
    elementoAudio.currentTime = 0;
    elementoAudio.play().catch(function () {});
}

function iniciarMusicaFundo() {
    if (!audioFundo) return;
    audioFundo.volume = 0.65; // musica do fundo
    if (audioFundo.paused) {
        audioFundo.play().catch(function () {});
    }
}

// som sempre ao clicar
document.addEventListener("mousedown", function () {
    if (!jogoAtivo) return;
    tocarSom(audioLaser, 0.4);
});

// sorteia se vem 1, 2 ou 3 alvos
function sortearQuantidadeAlvos() {
    const sorteio = Math.random();
    if (sorteio < 0.50) return 1;
    if (sorteio < 0.85) return 2;
    return 3;
}

// controla quando aparecem mais alvos na tela
function gerarOndaDeAlvos(forcarGeracao = false) {
    if (!jogoAtivo) return;

    const alvosNaTela = document.querySelectorAll(".alvo").length;
    if (alvosNaTela >= MAX_ALVOS_SIMULTANEOS) return;

    if (alvosNaTela === 0 || forcarGeracao) {
        const qtd = sortearQuantidadeAlvos();
        for (let i = 0; i < qtd; i++) {
            criarUnicoAlvo();
        }
    } else if (Math.random() < 0.35) {
        const vagas = MAX_ALVOS_SIMULTANEOS - alvosNaTela;
        const qtdExtra = Math.min(vagas, Math.random() < 0.7 ? 1 : 2);
        for (let i = 0; i < qtdExtra; i++) {
            criarUnicoAlvo();
        }
    }
}

// criando os alvos
function criarUnicoAlvo() {
    if (!jogoAtivo) return;

    const alvo = document.createElement("div");
    const [x, y] = posicaoAleatoria();
    const sorteio = Math.random();

    // % dos icones que vão aparecer
    let tipoAlvo = "nave";
    if (sorteio < 0.10) {
        tipoAlvo = "ampulheta";
    } else if (sorteio < 0.30) {
        tipoAlvo = "bomba";
    }

    if (tipoAlvo === "ampulheta") {
        alvo.className = "alvo alvo-ampulheta";
        alvo.textContent = "⏳";
    } else if (tipoAlvo === "bomba") {
        alvo.className = "alvo alvo-proibido";
        alvo.textContent = "💣";
    } else {
        alvo.className = "alvo";
        alvo.textContent = "🛸";
    }

    alvo.style.left = `${x}px`;
    alvo.style.top = `${y}px`;

    // alvo sai da tela se não clicar
    const timerId = setTimeout(function () {
        timersAlvos.delete(timerId);
        if (!jogoAtivo) return;

        alvo.remove();
        gerarOndaDeAlvos();
    }, calcularTempoAlvo());

    timersAlvos.add(timerId);

    // clique no alvo
    alvo.addEventListener("click", function () {
        if (!jogoAtivo) return;

        clearTimeout(timerId);
        timersAlvos.delete(timerId);
        alvo.remove();

        if (tipoAlvo === "ampulheta") {
            tempo += 3;
            tocarSom(audioBonusTempo, 0.20);
            mostrarFeedback(x, y, "+3s", "#ffd700");
        } else if (tipoAlvo === "bomba") {
            pontos = Math.max(0, pontos - 2);
            tocarSom(audioExplosao, 0.10);
            mostrarFeedback(x, y, "-2", "#ff4d4d");
        } else {
            pontos++;
            tocarSom(audioImpactoNave, 0.07);
            mostrarFeedback(x, y, "+1", "#4bd5ec");
        }

        atualizarPlacar();
        gerarOndaDeAlvos();
    });

    document.body.append(alvo);
}

// Sistema de pontuacao
function obterRanking() {
    try {
        const dados = localStorage.getItem(CHAVE_RANKING);
        return dados ? JSON.parse(dados) : [];
    } catch (e) {
        return [];
    }
}

// salva e ordena os 5 melhores
function salvarPontuacaoNoRanking(nome, pontuacao) {
    const ranking = obterRanking();
    ranking.push({
        nome: nome,
        pontos: pontuacao
    });

    ranking.sort(function (a, b) {
        return b.pontos - a.pontos;
    });

    const top5 = ranking.slice(0, 5);
    localStorage.setItem(CHAVE_RANKING, JSON.stringify(top5));
    return top5;
}

// monta a lista do ranking na tela
function preencherListaRanking(elementoLista, ranking) {
    elementoLista.innerHTML = "";

    if (ranking.length === 0) {
        const vazio = document.createElement("li");
        vazio.className = "list-group-item text-secondary justify-content-center";
        vazio.textContent = "Nenhuma pontuação registrada ainda.";
        elementoLista.append(vazio);
        return;
    }

    const medalhas = ["🥇", "🥈", "🥉", "4º", "5º"];

    ranking.forEach(function (item, indice) {
        const li = document.createElement("li");
        li.className = "list-group-item";

        const esquerda = document.createElement("span");
        esquerda.textContent = `${medalhas[indice]} ${item.nome}`;

        const direita = document.createElement("span");
        direita.className = "fw-bold text-warning";
        direita.textContent = `${item.pontos} pts`;

        li.append(esquerda, direita);
        elementoLista.append(li);
    });
}

function atualizarTelasRanking() {
    const ranking = obterRanking();
    preencherListaRanking(listaRankingFim, ranking);

    if (ranking.length > 0) {
        boxRankingInicial.classList.remove("d-none");
        preencherListaRanking(listaRankingInicial, ranking);
    } else {
        boxRankingInicial.classList.add("d-none");
    }
}

// fim de jogo
function finalizarJogo() {
    jogoAtivo = false;
    clearInterval(intervaloCronometro);
    limparAlvosAtivos();

    salvarPontuacaoNoRanking(nomePiloto, pontos);
    atualizarTelasRanking();

    spanPontuacaoFinal.textContent = pontos;
    telaFim.classList.remove("d-none");
    telaFim.classList.add("d-flex");
}

// inicia ou reinicia a partida
function iniciarJogo() {
    const nomeDigitado = inputNome.value.trim();
    nomePiloto = nomeDigitado !== "" ? nomeDigitado : "Piloto";
    localStorage.setItem(CHAVE_ULTIMO_PILOTO, nomeDigitado);

    pontos = 0;
    tempo = TEMPO_INICIAL;
    jogoAtivo = true;

    atualizarPlacar();
    limparAlvosAtivos();
    clearInterval(intervaloCronometro);

    telaInicial.classList.remove("d-flex");
    telaInicial.classList.add("d-none");
    telaFim.classList.remove("d-flex");
    telaFim.classList.add("d-none");

    iniciarMusicaFundo();
    gerarOndaDeAlvos(true);

    intervaloCronometro = setInterval(function () {
        tempo--;
        atualizarPlacar();

        if (tempo <= 0) {
            finalizarJogo();
        }
    }, 1000);
}

// botoes
btnIniciar.addEventListener("click", iniciarJogo);
btnReiniciar.addEventListener("click", iniciarJogo);

btnLimparRanking.addEventListener("click", function () {
    localStorage.removeItem(CHAVE_RANKING);
    atualizarTelasRanking();
});

// carrega o ultimo nome digitado e inicia o fundo
const ultimoPilotoSalvo = localStorage.getItem(CHAVE_ULTIMO_PILOTO);
if (ultimoPilotoSalvo) {
    inputNome.value = ultimoPilotoSalvo;
}

criarEstrelas();
atualizarTelasRanking();