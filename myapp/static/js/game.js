// static/js/game.js

document.addEventListener('DOMContentLoaded', () => {
  const setupDiv = document.getElementById('setup');
  const quizDiv = document.getElementById('quiz');
  const startBtn = document.getElementById('start-btn');
  const lvlSelect = document.getElementById('level-select');
  const topicSelect = document.getElementById('topic-select');
  const questionText = document.getElementById('question-text');
  const answerCards = Array.from(document.querySelectorAll('.card'));
  const timerEl = document.getElementById('time');
  const exitBtn = document.getElementById('exit-btn');
  const backdrop = document.getElementById('modal-backdrop');
  const modal = document.getElementById('result-modal');
  const resultText = document.getElementById('result-text');
  const retryBtn = document.getElementById('retry-btn');
  const homeBtn = document.getElementById('home-btn');

  let level, topic, questions, currentQ;
  let correctCount, totalQ = 10;
  let startTime, timerInterval;

  function genQuestions() {
    const maxVal = level === 1 ? 9 : 20;
    const qs = [];
    for (let i = 0; i < totalQ; i++) {
      let a = Math.floor(Math.random() * (maxVal + 1));
      let b = Math.floor(Math.random() * (maxVal + 1));
      if (topic === 'subtraction' && a < b) [a, b] = [b, a];
      const question = topic === 'addition' ? `${a} + ${b}` : `${a} - ${b}`;
      const answer = eval(question);
      const opts = new Set([answer]);
      while (opts.size < 4) {
        let wrong = answer + Math.floor(Math.random() * 5) - 2;
        if (wrong >= 0) opts.add(wrong);
      }
      qs.push({ question, answer, options: Array.from(opts).sort(() => Math.random() - 0.5) });
    }
    return qs;
  }

  function showQuestion() {
    const { question, answer, options } = questions[currentQ];
    questionText.textContent = `Q${currentQ+1}: ${question}`;
    answerCards.forEach((card, i) => {
      card.textContent = options[i];
      card.className = 'card';
      card.onclick = () => handleAnswer(card, options[i], answer);
    });
  }

  function handleAnswer(card, picked, correct) {
    answerCards.forEach(c => c.onclick = null);
    if (picked === correct) {
      card.classList.add('correct'); correctCount++;
    } else {
      card.classList.add('wrong');
      answerCards.find(c => +c.textContent === correct)
                 .classList.add('correct');
    }
    setTimeout(() => {
      currentQ++;
      if (currentQ < totalQ) showQuestion(); else finishQuiz();
    }, 800);
  }

  function startTimer() {
    clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
      timerEl.textContent = ((Date.now() - startTime)/1000).toFixed(1);
    }, 100);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    return (Date.now() - startTime)/1000;
  }

  function finishQuiz() {
    const timeTaken = stopTimer();
    resultText.textContent = `You scored ${correctCount}/${totalQ} in ${timeTaken.toFixed(1)}s`;
    quizDiv.classList.add('hidden');
    backdrop.classList.remove('hidden');
    modal.classList.remove('hidden');
    fetch('/submit_results', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ level, topic, correct_count: correctCount, total_questions: totalQ, time_taken: timeTaken })
    });
  }

  startBtn.addEventListener('click', () => {
    level = +lvlSelect.value; topic = topicSelect.value;
    questions = genQuestions(); currentQ = 0; correctCount = 0;
    setupDiv.classList.add('hidden'); quizDiv.classList.remove('hidden');
    showQuestion(); startTimer();
  });

  exitBtn.addEventListener('click', e => {
    e.preventDefault();
    if (confirm('Are you sure you want to exit the game?')) {
      window.location = '{{ url_for("home") }}';
    }
  });

  retryBtn.addEventListener('click', () => {
    modal.classList.add('hidden'); backdrop.classList.add('hidden');
    currentQ = 0; correctCount = 0;
    questions = genQuestions();
    quizDiv.classList.remove('hidden');
    showQuestion();
    startTimer();
  });

  homeBtn.addEventListener('click', () => {
    const homeUrl = homeBtn.getAttribute('data-home-url');
    window.location = homeUrl;
  });
});