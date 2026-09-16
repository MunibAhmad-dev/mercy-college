// Lightweight custom date picker -- replaces the native <input type="date">
// with a styled trigger button + popover calendar. Call initDatePicker(root)
// on a `.date-picker` element after it's attached to the DOM.

const DP_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dpPad(n) {
  return String(n).padStart(2, '0');
}

function initDatePicker(root) {
  const trigger = root.querySelector('.date-picker-trigger');
  const valueLabel = root.querySelector('.date-picker-value');
  const hiddenInput = root.querySelector('input[type="hidden"]');
  const panel = root.querySelector('.date-picker-panel');
  const monthSelect = root.querySelector('.dp-month');
  const yearSelect = root.querySelector('.dp-year');
  const daysGrid = root.querySelector('.date-picker-days');
  const prevBtn = root.querySelector('.dp-prev');
  const nextBtn = root.querySelector('.dp-next');

  const today = new Date();
  // Default view to ~18 years ago, a sensible starting point for a college applicant.
  let viewYear = today.getFullYear() - 18;
  let viewMonth = today.getMonth();
  let selectedYear = null, selectedMonth = null, selectedDay = null;

  monthSelect.innerHTML = DP_MONTH_NAMES.map((m, i) => `<option value="${i}">${m}</option>`).join('');

  const minYear = today.getFullYear() - 70;
  const maxYear = today.getFullYear() - 10;
  let yearOpts = '';
  for (let y = maxYear; y >= minYear; y--) yearOpts += `<option value="${y}">${y}</option>`;
  yearSelect.innerHTML = yearOpts;

  function render() {
    monthSelect.value = viewMonth;
    yearSelect.value = viewYear;
    daysGrid.innerHTML = '';

    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      daysGrid.appendChild(document.createElement('span'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dp-day';
      btn.textContent = d;

      const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && d === today.getDate();
      const isSelected = viewYear === selectedYear && viewMonth === selectedMonth && d === selectedDay;
      const isFuture = new Date(viewYear, viewMonth, d) > today;

      if (isToday) btn.classList.add('today');
      if (isSelected) btn.classList.add('selected');
      if (isFuture) btn.disabled = true;

      btn.addEventListener('click', () => {
        selectedYear = viewYear;
        selectedMonth = viewMonth;
        selectedDay = d;
        const iso = `${viewYear}-${dpPad(viewMonth + 1)}-${dpPad(d)}`;
        hiddenInput.value = iso;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        valueLabel.textContent = `${d} ${DP_MONTH_NAMES[viewMonth]} ${viewYear}`;
        valueLabel.classList.add('has-value');
        closePanel();
      });

      daysGrid.appendChild(btn);
    }
  }

  function onOutsideClick(e) {
    if (!root.contains(e.target)) closePanel();
  }

  function openPanel() {
    panel.hidden = false;
    render();
    document.addEventListener('click', onOutsideClick);
  }

  function closePanel() {
    panel.hidden = true;
    document.removeEventListener('click', onOutsideClick);
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.hidden) openPanel(); else closePanel();
  });

  monthSelect.addEventListener('click', (e) => e.stopPropagation());
  yearSelect.addEventListener('click', (e) => e.stopPropagation());
  monthSelect.addEventListener('change', () => { viewMonth = +monthSelect.value; render(); });
  yearSelect.addEventListener('change', () => { viewYear = +yearSelect.value; render(); });

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    render();
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    render();
  });

  return {
    getValue: () => hiddenInput.value,
  };
}
