// static/js/stats.js
document.addEventListener('DOMContentLoaded', () => {
  const showBtn       = document.getElementById('showStatsBtn');
  const levelSelect   = document.getElementById('levelSelect');
  const metricSelect  = document.getElementById('metricSelect');
  const chartModal    = document.getElementById('statsModal');
  const closeChartBtn = document.getElementById('closeModalBtn');
  const errorModal    = document.getElementById('errorModal');
  const closeErrorBtn = document.getElementById('closeErrorBtn');

  function openModal(modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal(modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  showBtn.addEventListener('click', () => {
    const level  = levelSelect.value;
    const metric = metricSelect.value;
    if (!level || !metric) {
      alert('Please select both a level and a metric.');
      return;
    }

    fetch(`/stats_data?level=${level}&metric=${metric}`)
      .then(res => res.json())
      .then(data => {
        // if not enough points, show error modal
        if (data.values.length < 5) {
          closeModal(chartModal);
          openModal(errorModal);
          return;
        }

        // destroy old chart if exists
        if (window.statsChartInstance) {
          window.statsChartInstance.destroy();
        }

        // build labels
        const labels = data.timestamps.map(ts => {
          const d = new Date(ts);
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        const uniqueIndices = labels.reduce((acc, lbl, idx) => {
          if (idx === 0 || lbl !== labels[idx - 1]) acc.push(idx);
          return acc;
        }, []);

        openModal(chartModal);
        const ctx = document.getElementById('statsChart').getContext('2d');
        window.statsChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: metric === 'accuracy' ? 'Accuracy (%)' : 'Time Taken (s)',
              data: data.values,
              fill: false,
              borderWidth: 2,
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: 'category',
                title: { display: true, text: 'Date', font: { size: 16 } },
                ticks: {
                  autoSkip: false,
                  font: { size: 14 },
                  callback(value, index) {
                    return uniqueIndices.includes(index) ? this.getLabelForValue(value) : '';
                  }
                }
              },
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: metric === 'accuracy' ? 'Accuracy (%)' : 'Time Taken (s)',
                  font: { size: 16 }
                },
                ticks: { font: { size: 14 } }
              }
            },
            plugins: {
              legend: { labels: { font: { size: 14 } } },
              tooltip: {
                bodyFont: { size: 14 },
                titleFont: { size: 16 }
              }
            }
          }
        });
      })
      .catch(err => console.error(err));
  });

  closeChartBtn.addEventListener('click', () => closeModal(chartModal));
  closeErrorBtn.addEventListener('click', () => closeModal(errorModal));

  window.addEventListener('click', e => {
    if (e.target === chartModal) closeModal(chartModal);
    if (e.target === errorModal) closeModal(errorModal);
  });
});
