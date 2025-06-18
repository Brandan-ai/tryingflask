// static/js/game.js

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sound file lists
  const rightSoundFiles = [
    'sfx/DullPop.mp3',
    'sfx/SharpPop.mp3',
    'sfx/ShortBubblePop.mp3'
  ];
  const wrongSoundFiles = [
    'sfx/OomfyNegative.mp3',
    'sfx/ShortNegative.mp3',
    'sfx/WeakNegative.mp3'
  ];
  const uiSoundFiles = [
    'sfx/Ding.mp3',
    'sfx/HighPitchPing.mp3',
    'sfx/UIClick.mp3'
  ];

  // 2. Create audio arrays
  function createAudioArray(files) {
    return files.map(name => {
      const a = new Audio(`/static/${name}`);
      a.preload = 'auto';
      return a;
    });
  }
  const rightSounds = createAudioArray(rightSoundFiles);
  const wrongSounds = createAudioArray(wrongSoundFiles);
  const uiSounds    = createAudioArray(uiSoundFiles);

  // 3. Play random sound at saved volume
  function playRandom(arr) {
    const idx = Math.floor(Math.random() * arr.length);
    const s = arr[idx];
    const vol = localStorage.getItem('user_volume');
    s.volume = vol != null ? (vol / 100) : 1.0;
    s.currentTime = 0;
    s.play().catch(() => {});
  }

  // 4. DOM refs
  const setupDiv     = document.getElementById('setup');
  const quizDiv      = document.getElementById('quiz');
  const startBtn     = document.getElementById('start-btn');
  const lvlSelect    = document.getElementById('level-select');
  const topicSelect  = document.getElementById('topic-select');
  const questionText = document.getElementById('question-text');
  const progressEl   = document.getElementById('progress');
  const answerCards  = Array.from(document.querySelectorAll('.card'));
  const timerEl      = document.getElementById('time');
  const backdrop     = document.getElementById('modal-backdrop');
  const modal        = document.getElementById('result-modal');
  const resultText   = document.getElementById('result-text');
  const bestTimeEl   = document.getElementById('best-time');
  const retryBtn     = document.getElementById('retry-btn');
  const homeBtn      = document.getElementById('home-btn');

  // 5. Quiz state
  let level, topic, questions, currentQ;
  let correctCount, totalQ = 10;
  let startTime, timerInterval;

  // 6. Biased random generator
  function genBiased(min, max) {
    while (true) {
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (n === 0 && min <= 0 && max >= 0) {
        if (Math.random() < 0.2) return 0;
      } else {
        return n;
      }
    }
  }

  // 7. Generate questions
  function genQuestions() {
    const qs = [];
    for (let i = 0; i < totalQ; i++) {
      let a, b, ans, question;
      if (level === 1) {
        do {
          a = genBiased(0, 9);
          b = genBiased(0, 9);
        } while (topic === 'addition' && a + b > 9);
        if (topic === 'subtraction' && a < b) [a, b] = [b, a];
      } else {
        do {
          a = Math.floor(Math.random() * 11) + 10;
          b = Math.floor(Math.random() * 11) + 10;
          if (topic === 'subtraction' && a < b) [a, b] = [b, a];
        } while ((topic === 'addition' ? a + b : a - b) < 9);
      }
      question = topic === 'addition' ? `${a} + ${b}` : `${a} - ${b}`;
      ans = eval(question);
      const opts = new Set([ans]);
      while (opts.size < 4) {
        let w = ans + (Math.floor(Math.random() * 9) - 4);
        if (w >= 0) opts.add(w);
      }
      qs.push({
        question,
        answer: ans,
        options: Array.from(opts).sort(() => Math.random() - 0.5)
      });
    }
    return qs;
  }

  // 8. Show question + update progress
  function showQuestion() {
    progressEl.textContent = `${correctCount}/${currentQ}`;
    const { question, answer, options } = questions[currentQ];
    questionText.textContent = `Q${currentQ + 1}: ${question}`;
    answerCards.forEach((c, i) => {
      c.textContent = options[i];
      c.className = 'card';
      c.onclick = () => handleAnswer(c, options[i], answer);
    });
  }

  // 9. Handle answer
  function handleAnswer(card, picked, correct) {
    answerCards.forEach(c => (c.onclick = null));
    let delay;
    if (picked === correct) {
      playRandom(rightSounds);
      card.classList.add('correct');
      correctCount++;
      delay = 1000;
    } else {
      playRandom(wrongSounds);
      card.classList.add('wrong');
      answerCards
        .find(c => +c.textContent === correct)
        .classList.add('correct');
      delay = 2500;
    }
    setTimeout(() => {
      currentQ++;
      currentQ < totalQ ? showQuestion() : finishQuiz();
    }, delay);
  }

  // 10. Timer
  function startTimer() {
    clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
      timerEl.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
    }, 100);
  }
  function stopTimer() {
    clearInterval(timerInterval);
    return (Date.now() - startTime) / 1000;
  }

  // 11. Finish quiz
  function finishQuiz() {
    const timeTaken = stopTimer();
    resultText.textContent = `You scored ${correctCount}/${totalQ} in ${timeTaken.toFixed(1)}s`;
    setupDiv.classList.add('hidden');
    quizDiv.classList.add('hidden');
    backdrop.classList.remove('hidden');
    modal.classList.remove('hidden');

    fetch('/submit_results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        topic,
        correct_count: correctCount,
        total_questions: totalQ,
        time_taken: timeTaken
      })
    })
      .then(r => r.json())
      .then(json => {
        const acc = correctCount / totalQ;
        const rcol = Math.round(255 * (1 - acc));
        const gcol = Math.round(255 * acc);
        const bg = `rgba(${rcol},${gcol},0,0.2)`;
        const border = `rgb(${rcol},${gcol},0)`;
        const rc = document.getElementById('result-content');
        rc.style.backgroundColor = bg;
        rc.style.border = `4px solid ${border}`;
        if (json.best_time != null) {
          bestTimeEl.textContent = `Your best time for this quiz: ${json.best_time.toFixed(1)}s`;
        } else {
          bestTimeEl.textContent = '';
        }
      })
      .catch(() => {});
  }

  // 12. Event listeners
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      playRandom(uiSounds);
      level = +lvlSelect.value;
      topic = topicSelect.value;
      questions = genQuestions();
      currentQ = 0;
      correctCount = 0;
      progressEl.textContent = `${correctCount}/${currentQ}`;
      setupDiv.classList.add('hidden');
      quizDiv.classList.remove('hidden');
      showQuestion();
      startTimer();
    });
  }
  if (retryBtn) {
    retryBtn.addEventListener('click', e => {
      e.preventDefault();
      playRandom(uiSounds);
      modal.classList.add('hidden');
      backdrop.classList.add('hidden');
      currentQ = 0;
      correctCount = 0;
      progressEl.textContent = `${correctCount}/${currentQ}`;
      questions = genQuestions();
      quizDiv.classList.remove('hidden');
      showQuestion();
      startTimer();
    });
  }
  if (homeBtn) {
    homeBtn.addEventListener('click', e => {
      e.preventDefault();
      playRandom(uiSounds);
      window.location.href = homeBtn.getAttribute('data-home-url');
    });
  }
});
