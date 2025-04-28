// static/app.js

let chart = null;

function toInputDate(d) {
  return d.toISOString().split('T')[0];
}

async function fetchVariables() {
  const res  = await axios.get('/');
  const vars = res.data.available_variables;
  const sel  = document.getElementById('variable');
  vars.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.text  = v;
    sel.add(opt);
  });
}

function showWarning(msg) {
  let alert = document.getElementById('alertBox');
  if (!alert) {
    alert = document.createElement('div');
    alert.className = 'alert alert-warning mt-3';
    alert.id = 'alertBox';
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.children[2]);
  }
  alert.innerText = msg;
  alert.style.display = 'block';
}

function hideWarning() {
  const alert = document.getElementById('alertBox');
  if (alert) {
    alert.style.display = 'none';
  }
}

async function updateChart() {
  hideWarning();

  const variable = document.getElementById('variable').value;
  const periods  = +document.getElementById('steps').value;

  const startEl  = document.getElementById('startDate');
  const endEl    = document.getElementById('endDate');
  const startRaw = startEl.value;
  const endRaw   = endEl.value;

  // 1) fetch forecast
  const res  = await axios.post('/forecast', { variable, periods });
  let data = res.data.forecast.map(d => ({
    date : new Date(d.date),
    value: d.value
  }));

  const dates = data.map(d => d.date);
  const minD  = new Date(Math.min(...dates));
  const maxD  = new Date(Math.max(...dates));

  startEl.min   = toInputDate(minD);
  startEl.max   = toInputDate(maxD);
  startEl.value = startRaw || toInputDate(minD);

  endEl.min     = toInputDate(minD);
  endEl.max     = toInputDate(maxD);
  endEl.value   = endRaw || toInputDate(maxD);

  // 2) Validate start date
  if (new Date(startEl.value) < minD) {
    showWarning(`⚠️ Start date is before forecasted data (${toInputDate(minD)})`);
  }

  // 3) apply manual range filter
  let filtered = data;
  if (startEl.value) {
    const s = new Date(startEl.value);
    filtered = filtered.filter(d => d.date >= s);
  }
  if (endEl.value) {
    const e = new Date(endEl.value);
    filtered = filtered.filter(d => d.date <= e);
  }

  const labels = filtered.map(d => d.date);
  const values = filtered.map(d => d.value);

  // 4) destroy old chart
  if (chart) {
    chart.destroy();
    chart = null;
  }

  // 5) figure out unit label (very basic)
  let unit = '';
  if (variable.toLowerCase().includes('temp')) {
    unit = '°C';
  } else if (variable.toLowerCase().includes('sea') || variable.toLowerCase().includes('msl')) {
    unit = 'm';
  }

  // 6) draw new chart
  const ctx = document.getElementById('forecastChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${variable} Forecast`,
        data: values,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: false
      }]
    },
    options: {
      scales: {
        x: {
          type: 'time',
          time: { unit: 'month' }
        },
        y: {
          title: {
            display: true,
            text: unit
          }
        }
      }
    }
  });
}

window.addEventListener('load', async () => {
  await fetchVariables();
  await updateChart();
  document.getElementById('updateBtn').onclick = updateChart;
});
