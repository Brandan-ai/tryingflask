// static/js/stats.js

document.addEventListener('DOMContentLoaded', () => {
  const showBtn = document.getElementById('showStatsBtn');
  const levelSelect = document.getElementById('levelSelect');
  const metricSelect = document.getElementById('metricSelect');
  const modal = document.getElementById('statsModal');
  const closeBtn = document.getElementById('closeModalBtn');

  showBtn.addEventListener('click', () => {
    const level = levelSelect.value;
    const metric = metricSelect.value;
    if (!level || !metric) {
      alert('Please select both a level and a metric.');
      return;
    }

    fetch(`/stats_data?level=${level}&metric=${metric}`)
      .then(res => res.json())
      .then(data => {
        if (window.statsChartInstance) {
          window.statsChartInstance.destroy();
        }

        const labels = data.timestamps.map(ts => {
          const dateObj = new Date(ts);
          return dateObj.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
          });
        });
        const values = data.values;

        modal.style.display = 'flex';
        const ctx = document.getElementById('statsChart').getContext('2d');
        window.statsChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: metric === 'accuracy' ? 'Accuracy (%)' : 'Time Taken (s)',
              data: values,
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
                title: {
                  display: true,
                  text: 'Date',
                  font: { size: 16 }
                },
                ticks: {
                  autoSkip: false,
                  font: { size: 14 }
                }
              },
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: metric === 'accuracy' ? 'Accuracy (%)' : 'Time Taken (s)',
                  font: { size: 16 }
                },
                ticks: {
                  font: { size: 14 }
                }
              }
            },
            plugins: {
              legend: {
                labels: {
                  font: { size: 14 }
                }
              },
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

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  window.addEventListener('click', e => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});
