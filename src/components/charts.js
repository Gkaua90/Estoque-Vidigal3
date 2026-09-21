import Chart from 'chart.js/auto';

let CHART_INSTANCES = [];

export function destroyCharts() {
  CHART_INSTANCES.forEach(c => { try { c.destroy(); } catch (e) { /* noop */ } });
  CHART_INSTANCES = [];
}

export function paintChart(canvasId, type, labels, datasets, horizontal = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (labels.length === 0) {
    parent.innerHTML = '<div class="chart-empty">Sem dados suficientes ainda.</div>';
    return;
  }
  Chart.defaults.font.family = "'Work Sans', sans-serif";
  Chart.defaults.color = '#6E655F';
  const ch = new Chart(canvas, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      plugins: { legend: { display: type === 'doughnut', position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
      scales: type === 'doughnut' ? {} : {
        x: { ticks: { font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { font: { size: 10 } }, grid: { color: '#EFE9E0' } },
      },
    },
  });
  CHART_INSTANCES.push(ch);
}

export function chartPalette() {
  return ['#6B1F2A', '#9C7A3C', '#4E6142', '#3B5C73', '#B85C6B', '#8A5A22', '#7A6E64'];
}
