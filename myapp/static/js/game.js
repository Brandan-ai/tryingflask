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

  // 2. Create Audio arrays without fixed volume
  function createAudioArray(fileList) {
    return fileList.map(filename => {
      const audio = new Audio(`/static/${filename}`);
      audio.preload = 'auto';
      return audio;
    });
  }

  const rightSounds = createAudioArray(rightSoundFiles);
  const wrongSounds = createAudioArray(wrongSoundFiles);
  const uiSounds    = createAudioArray(uiSoundFiles);

  // 3. Play random sound at saved volume
  function playRandom(soundArray) {
    const idx = Math.floor(Math.random() * soundArray.length);
    const s = soundArray[idx];
    const savedVol = localStorage.getItem('user_volume');
    s.volume = savedVol !== null ? (savedVol / 100) : 1.0;
    s.currentTime = 0;
    s.play().catch(() => {});
  }

  // 4. DOM elements
  const setupDiv     = document.getElementById('setup');
  const quizDiv      = document.getElementById('quiz');
  const startBtn     = document.getElementById('start-btn');
  const lvlSelect    = document.getElementById('level-select');
  const topicSelect  = document.getElementById('topic-select');
  const questionText = document.getElementById('question-text');
  const answerCards  = Array.from(document.querySelectorAll('.card'));
  const timerEl      = document.getElementById('time');
  const backdrop     = document.getElementById('modal-backdrop');
  const modal        = document.getElementById('result-modal');
  const resultText   = document.getElementById('result-text');
  const retryBtn     = document.getElementById('retry-btn');
  const homeBtn      = document.getElementById('home-btn');

  let level, topic, questions, currentQ;
  let correctCount, totalQ = 10;
  let startTime, timerInterval;

  // 5. Random integer generator with biased zero
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

  // 6. Generate questions
  function genQuestions() {
    const qs = [];
    for (let i = 0; i < totalQ; i++) {
      let a, b, question, answer;
      if (level === 1) {
        do {
          a = genBiased(0, 9);
          b = genBiased(0, 9);
        } while (topic === 'addition' && a + b > 9);
        if (topic === 'subtraction' && a < b) [a, b] = [b, a];
      } else {
        do {
          a = Math.floor(Math.random() * 11) + 10; // [10,20]
          b = Math.floor(Math.random() * 11) + 10;
          if (topic === 'subtraction' && a < b) [a, b] = [b, a];
        } while ((topic === 'addition' ? a + b : a - b) < 9);
      }
      question = topic === 'addition' ? `${a} + ${b}` : `${a} - ${b}`;
      answer = eval(question);

      const opts = new Set([answer]);
      while (opts.size < 4) {
        let wrong = answer + (Math.floor(Math.random() * 9) - 4);
        if (wrong >= 0) opts.add(wrong);
      }

      qs.push({
        question,
        answer,
        options: Array.from(opts).sort(() => Math.random() - 0.5)
      });
    }
    return qs;
  }

  function showQuestion() {
    const { question, answer, options } = questions[currentQ];
    questionText.textContent = `Q${currentQ + 1}: ${question}`;
    answerCards.forEach((card, i) => {
      card.textContent = options[i];
      card.className = 'card';
      card.onclick = () => handleAnswer(card, options[i], answer);
    });
  }

  // 7. Answer handling
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
      if (currentQ < totalQ) showQuestion();
      else finishQuiz();
    }, delay);
  }

  // 8. Timer
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

  // 9. Finish quiz
  function finishQuiz() {
    const timeTaken = stopTimer();
    resultText.textContent = `You scored ${correctCount}/${totalQ} in ${timeTaken.toFixed(1)}s`;
    quizDiv.classList.add('hidden');
    backdrop.classList.remove('hidden');
    modal.classList.remove('hidden');

    fetch('/submit_results', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        level,
        topic,
        correct_count: correctCount,
        total_questions: totalQ,
        time_taken: timeTaken
      })
    });
  }

  // 10. Event listeners
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      playRandom(uiSounds);
      level = +lvlSelect.value;
      topic = topicSelect.value;
      questions = genQuestions();
      currentQ = 0;
      correctCount = 0;

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
