(() => {
  "use strict";

  const money = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const decimal = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const navToggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector("#menu-principal");

  if (navToggle && menu) {
    navToggle.addEventListener("click", () => {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("is-open", !open);
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navToggle.setAttribute("aria-expanded", "false");
        menu.classList.remove("is-open");
      });
    });
  }

  const partCards = [...document.querySelectorAll(".part-card")];
  const formulaParts = [...document.querySelectorAll("[data-formula]")];

  const activateFormulaPart = (part) => {
    partCards.forEach((card) => card.classList.toggle("is-active", card.dataset.part === part));
    formulaParts.forEach((symbol) => symbol.classList.toggle("is-active", symbol.dataset.formula === part));
  };

  partCards.forEach((card) => {
    card.addEventListener("mouseenter", () => activateFormulaPart(card.dataset.part));
    card.addEventListener("focus", () => activateFormulaPart(card.dataset.part));
    card.addEventListener("click", () => activateFormulaPart(card.dataset.part));
  });

  const capitalInput = document.querySelector("#capital-input");
  const rateInput = document.querySelector("#rate-input");
  const periodInput = document.querySelector("#period-input");
  const capitalOutput = document.querySelector("#capital-output");
  const rateOutput = document.querySelector("#rate-output");
  const periodOutput = document.querySelector("#period-output");
  const compoundTotal = document.querySelector("#compound-total");
  const compoundInterest = document.querySelector("#compound-interest");
  const simpleTotal = document.querySelector("#simple-total");
  const simpleInterest = document.querySelector("#simple-interest");
  const differenceTotal = document.querySelector("#difference-total");
  const periodTableBody = document.querySelector("#period-table-body");
  const chartSummary = document.querySelector("#chart-summary");
  const chart = document.querySelector("#growth-chart");
  const resetSimulator = document.querySelector("#reset-simulator");

  let chartAnimation = null;
  let lastSeries = null;

  const buildSeries = (capital, rate, periods) => {
    const simple = [];
    const compound = [];
    for (let period = 0; period <= periods; period += 1) {
      simple.push(capital * (1 + rate * period));
      compound.push(capital * (1 + rate) ** period);
    }
    return { simple, compound };
  };

  const roundedRect = (context, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  };

  const drawChart = (series, progress = 1) => {
    if (!chart) return;
    const rect = chart.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, rect.width);
    const height = Math.max(260, rect.height);

    if (chart.width !== Math.round(width * ratio) || chart.height !== Math.round(height * ratio)) {
      chart.width = Math.round(width * ratio);
      chart.height = Math.round(height * ratio);
    }

    const context = chart.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 22, bottom: 40, left: 68 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...series.compound, ...series.simple, 1) * 1.08;
    const count = series.compound.length - 1;
    const visibleIndex = Math.max(1, Math.ceil(count * progress));
    const xFor = (index) => padding.left + (index / Math.max(count, 1)) * innerWidth;
    const yFor = (value) => padding.top + innerHeight - (value / maxValue) * innerHeight;

    context.save();
    context.lineWidth = 1;
    context.strokeStyle = "rgba(18, 61, 98, 0.10)";
    context.fillStyle = "#60747c";
    context.font = "12px Segoe UI, sans-serif";
    context.textAlign = "right";
    context.textBaseline = "middle";

    for (let step = 0; step <= 4; step += 1) {
      const value = (maxValue / 4) * step;
      const y = yFor(value);
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      context.fillText(money.format(value).replace(",00", ""), padding.left - 9, y);
    }

    context.textAlign = "center";
    context.textBaseline = "top";
    const labelStep = count <= 12 ? 2 : count <= 24 ? 4 : Math.ceil(count / 6);
    for (let index = 0; index <= count; index += labelStep) {
      const x = xFor(index);
      context.beginPath();
      context.moveTo(x, padding.top);
      context.lineTo(x, padding.top + innerHeight);
      context.stroke();
      context.fillText(String(index), x, padding.top + innerHeight + 10);
    }

    context.fillStyle = "#60747c";
    context.fillText("meses", padding.left + innerWidth / 2, height - 15);
    context.restore();

    const drawLine = (values, color, glow) => {
      context.save();
      context.beginPath();
      values.slice(0, visibleIndex + 1).forEach((value, index) => {
        const x = xFor(index);
        const y = yFor(value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = color;
      context.shadowBlur = 12;
      context.shadowColor = glow;
      context.stroke();
      context.shadowBlur = 0;

      values.slice(0, visibleIndex + 1).forEach((value, index) => {
        if (index !== 0 && index !== visibleIndex && index % Math.max(1, Math.ceil(count / 8)) !== 0) return;
        context.beginPath();
        context.arc(xFor(index), yFor(value), index === visibleIndex ? 5.5 : 3.5, 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = "#ffffff";
        context.stroke();
      });
      context.restore();
    };

    drawLine(series.simple, "#1489cc", "rgba(20, 137, 204, 0.24)");
    drawLine(series.compound, "#128c61", "rgba(18, 140, 97, 0.26)");

    const compoundEnd = series.compound[visibleIndex];
    const labelX = Math.min(width - 126, xFor(visibleIndex) - 88);
    const labelY = Math.max(10, yFor(compoundEnd) - 42);
    context.save();
    roundedRect(context, labelX, labelY, 112, 30, 12);
    context.fillStyle = "rgba(0, 63, 67, 0.9)";
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "700 12px Segoe UI, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(money.format(compoundEnd), labelX + 56, labelY + 15);
    context.restore();
  };

  const animateChart = (series) => {
    if (chartAnimation) cancelAnimationFrame(chartAnimation);
    if (prefersReducedMotion.matches) {
      drawChart(series, 1);
      return;
    }
    const start = performance.now();
    const duration = 620;
    const tick = (time) => {
      const raw = Math.min(1, (time - start) / duration);
      const eased = 1 - (1 - raw) ** 3;
      drawChart(series, eased);
      if (raw < 1) chartAnimation = requestAnimationFrame(tick);
    };
    chartAnimation = requestAnimationFrame(tick);
  };

  const renderTable = (series) => {
    if (!periodTableBody) return;
    const totalPeriods = series.compound.length - 1;
    const periods = totalPeriods <= 24
      ? Array.from({ length: totalPeriods + 1 }, (_, index) => index)
      : [...Array.from({ length: 7 }, (_, index) => index), null, totalPeriods - 2, totalPeriods - 1, totalPeriods];

    periodTableBody.replaceChildren();
    periods.forEach((period) => {
      const row = document.createElement("tr");
      if (period === null) {
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = "… períodos intermediários …";
        cell.style.textAlign = "center";
        row.append(cell);
      } else {
        const values = [
          period === 0 ? "Início" : String(period),
          money.format(series.simple[period]),
          money.format(series.compound[period]),
          money.format(series.compound[period] - series.simple[period]),
        ];
        values.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });
      }
      periodTableBody.append(row);
    });
  };

  const updateSimulator = (animate = true) => {
    if (!capitalInput || !rateInput || !periodInput) return;
    const capital = Number(capitalInput.value);
    const ratePercent = Number(rateInput.value);
    const rate = ratePercent / 100;
    const periods = Number(periodInput.value);
    const series = buildSeries(capital, rate, periods);
    const simpleEnd = series.simple.at(-1);
    const compoundEnd = series.compound.at(-1);

    capitalOutput.textContent = money.format(capital);
    rateOutput.textContent = `${decimal.format(ratePercent)}%`;
    periodOutput.textContent = `${periods} ${periods === 1 ? "mês" : "meses"}`;
    compoundTotal.textContent = money.format(compoundEnd);
    compoundInterest.textContent = `${money.format(compoundEnd - capital)} em juros`;
    simpleTotal.textContent = money.format(simpleEnd);
    simpleInterest.textContent = `${money.format(simpleEnd - capital)} em juros`;
    differenceTotal.textContent = money.format(compoundEnd - simpleEnd);
    chartSummary.textContent = `Após ${periods} ${periods === 1 ? "mês" : "meses"}, juros simples resultam em ${money.format(simpleEnd)} e juros compostos em ${money.format(compoundEnd)}.`;

    renderTable(series);
    lastSeries = series;
    if (animate) animateChart(series);
    else drawChart(series, 1);
  };

  [capitalInput, rateInput, periodInput].filter(Boolean).forEach((input) => {
    input.addEventListener("input", () => updateSimulator(false));
    input.addEventListener("change", () => updateSimulator(true));
  });

  resetSimulator?.addEventListener("click", () => {
    capitalInput.value = "100";
    rateInput.value = "10";
    periodInput.value = "12";
    updateSimulator(true);
  });

  const resizeObserver = chart && "ResizeObserver" in window
    ? new ResizeObserver(() => lastSeries && drawChart(lastSeries, 1))
    : null;
  if (chart && resizeObserver) resizeObserver.observe(chart);

  updateSimulator(true);

  const ruleRate = document.querySelector("#rule-rate");
  const ruleResult = document.querySelector("#rule-result");
  const updateRule = () => {
    const rate = Number(ruleRate.value);
    if (!Number.isFinite(rate) || rate <= 0) {
      ruleResult.textContent = "Informe uma taxa maior que zero.";
      return;
    }
    const years = 72 / rate;
    const value = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: years < 10 ? 1 : 0 }).format(years);
    ruleResult.textContent = `Aproximadamente ${value} ${years < 1.5 ? "ano" : "anos"} para dobrar.`;
  };
  ruleRate?.addEventListener("input", updateRule);
  updateRule();

  const quizQuestions = [...document.querySelectorAll(".quiz-question")];
  const quizScore = document.querySelector("#quiz-score");
  const quizState = new Map();

  const refreshScore = () => {
    const answered = quizState.size;
    const correct = [...quizState.values()].filter(Boolean).length;
    if (answered < quizQuestions.length) {
      quizScore.textContent = `${answered} de ${quizQuestions.length} respondida${answered === 1 ? "" : "s"}. Continue!`;
      return;
    }
    const messages = [
      "Vale revisar os conceitos e tentar novamente.",
      "Bom começo — você já identificou um ponto importante.",
      "Muito bem! Falta apenas um detalhe.",
      "Excelente! Você entendeu o mecanismo.",
    ];
    quizScore.textContent = `${correct} de ${quizQuestions.length} corretas. ${messages[correct]}`;
  };

  quizQuestions.forEach((question, questionIndex) => {
    const correctAnswer = question.dataset.answer;
    const feedback = question.querySelector(".quiz-feedback");
    const buttons = [...question.querySelectorAll("[data-option]")];
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const isCorrect = button.dataset.option === correctAnswer;
        quizState.set(questionIndex, isCorrect);
        buttons.forEach((choice) => {
          choice.disabled = true;
          if (choice.dataset.option === correctAnswer) choice.classList.add("is-correct");
        });
        if (!isCorrect) button.classList.add("is-wrong");
        feedback.textContent = isCorrect
          ? "Correto! O saldo acumulado vira a nova base."
          : "Quase. Observe a alternativa destacada em verde.";
        refreshScore();
      });
    });
  });

  const motionToggle = document.querySelector("#motion-toggle");
  const officialExample = document.querySelector(".official-example");
  const officialBarStage = document.querySelector("#official-bar-stage");
  const officialMonthOutput = document.querySelector("#official-month");
  const officialSimpleBar = document.querySelector("#official-simple-bar");
  const officialCompoundBar = document.querySelector("#official-compound-bar");
  const officialSimpleValue = document.querySelector("#official-simple-value");
  const officialCompoundValue = document.querySelector("#official-compound-value");
  const officialSimpleInterest = document.querySelector("#official-simple-interest");
  const officialCompoundInterest = document.querySelector("#official-compound-interest");
  const officialInsight = document.querySelector("#official-insight");
  const officialReplay = document.querySelector("#official-replay");
  const officialProgressDots = [...document.querySelectorAll("[data-official-month]")];

  const officialSeries = [
    { simple: 1000, compound: 1000, insight: "Ponto de partida: os dois cálculos começam com o mesmo capital." },
    { simple: 1050, compound: 1050, insight: "No primeiro mês, os dois saldos ainda são iguais." },
    { simple: 1100, compound: 1102.5, insight: "No segundo mês, os juros compostos passam a render sobre R$ 1.050,00." },
    { simple: 1150, compound: 1157.63, insight: "A nova base faz a diferença crescer um pouco a cada mês." },
    { simple: 1200, compound: 1215.51, insight: "No quarto mês, a diferença acumulada já chega a R$ 15,51." },
    { simple: 1250, compound: 1276.28, insight: "No quinto mês, o efeito da capitalização fica mais visível." },
    { simple: 1300, compound: 1340.1, insight: "No sexto mês, a capitalização composta abre uma diferença de R$ 40,10." },
  ];

  let officialMonthIndex = 6;
  let officialTimer = null;
  let officialInView = false;

  const motionOverrideActive = () => document.body.classList.contains("motion-override");
  const reducedMotionActive = () => prefersReducedMotion.matches && !motionOverrideActive();
  const officialHeight = (value) => `${(value / 1340.1) * 88}%`;

  const renderOfficialMonth = (month, pulse = true) => {
    if (!officialBarStage || !officialSimpleBar || !officialCompoundBar) return;
    const point = officialSeries[month];
    officialMonthIndex = month;
    officialMonthOutput.textContent = String(month);
    officialSimpleValue.textContent = money.format(point.simple);
    officialCompoundValue.textContent = money.format(point.compound);
    officialSimpleInterest.textContent = `+ ${money.format(point.simple - 1000)}`;
    officialCompoundInterest.textContent = `+ ${money.format(point.compound - 1000)}`;
    officialInsight.textContent = point.insight;
    officialSimpleBar.style.setProperty("--bar-height", officialHeight(point.simple));
    officialCompoundBar.style.setProperty("--bar-height", officialHeight(point.compound));
    officialBarStage.style.setProperty("--month-progress", `${(month / 6) * 100}%`);
    officialProgressDots.forEach((dot) => {
      dot.classList.toggle("is-active", Number(dot.dataset.officialMonth) <= month);
    });
    officialCompoundBar.classList.toggle("is-finale", month === 6);
    officialBarStage.setAttribute(
      "aria-label",
      `Mês ${month} de 6: juros simples em ${money.format(point.simple)} e juros compostos em ${money.format(point.compound)}.`
    );

    if (pulse && !reducedMotionActive()) {
      officialSimpleBar.classList.remove("is-stepping");
      officialCompoundBar.classList.remove("is-stepping");
      requestAnimationFrame(() => {
        officialSimpleBar.classList.add("is-stepping");
        officialCompoundBar.classList.add("is-stepping");
      });
    }
  };

  const stopOfficialLoop = () => {
    if (officialTimer) window.clearTimeout(officialTimer);
    officialTimer = null;
  };

  const canRunOfficialLoop = () =>
    officialInView && !reducedMotionActive() && !document.body.classList.contains("motion-paused");

  const scheduleOfficialLoop = () => {
    stopOfficialLoop();
    if (!canRunOfficialLoop()) return;
    const delay = officialMonthIndex === 6 ? 1900 : 1050;
    officialTimer = window.setTimeout(() => {
      renderOfficialMonth(officialMonthIndex === 6 ? 0 : officialMonthIndex + 1);
      scheduleOfficialLoop();
    }, delay);
  };

  const restartOfficialLoop = () => {
    stopOfficialLoop();
    renderOfficialMonth(reducedMotionActive() ? 6 : 0, false);
    scheduleOfficialLoop();
  };

  if (motionToggle && prefersReducedMotion.matches) {
    motionToggle.textContent = "Ativar movimento";
    motionToggle.setAttribute("aria-label", "Ativar as animações desta seção");
  }

  motionToggle?.addEventListener("click", () => {
    if (reducedMotionActive()) {
      document.body.classList.add("motion-override");
      document.body.classList.remove("motion-paused");
      motionToggle.setAttribute("aria-pressed", "false");
      motionToggle.setAttribute("aria-label", "Pausar as animações desta seção");
      motionToggle.textContent = "Pausar movimento";
      restartOfficialLoop();
      return;
    }

    const paused = document.body.classList.toggle("motion-paused");
    motionToggle.setAttribute("aria-pressed", String(paused));
    motionToggle.setAttribute("aria-label", paused ? "Retomar as animações desta seção" : "Pausar as animações desta seção");
    motionToggle.textContent = paused ? "Retomar movimento" : "Pausar movimento";
    if (paused) stopOfficialLoop();
    else scheduleOfficialLoop();
  });

  officialReplay?.addEventListener("click", restartOfficialLoop);

  if (officialExample && "IntersectionObserver" in window) {
    const officialObserver = new IntersectionObserver(
      ([entry]) => {
        officialInView = entry.isIntersecting;
        if (officialInView) restartOfficialLoop();
        else stopOfficialLoop();
      },
      { threshold: 0.22 }
    );
    officialObserver.observe(officialExample);
  } else if (officialExample) {
    officialInView = true;
    restartOfficialLoop();
  }

  prefersReducedMotion.addEventListener?.("change", () => {
    if (prefersReducedMotion.matches) {
      document.body.classList.remove("motion-override");
      stopOfficialLoop();
      renderOfficialMonth(6, false);
      if (motionToggle) {
        motionToggle.textContent = "Ativar movimento";
        motionToggle.setAttribute("aria-label", "Ativar as animações desta seção");
        motionToggle.setAttribute("aria-pressed", "false");
      }
    } else if (officialInView) {
      document.body.classList.remove("motion-paused");
      if (motionToggle) {
        motionToggle.textContent = "Pausar movimento";
        motionToggle.setAttribute("aria-label", "Pausar as animações desta seção");
        motionToggle.setAttribute("aria-pressed", "false");
      }
      restartOfficialLoop();
    }
  });

  const tiltScenes = [...document.querySelectorAll("[data-tilt-scene]")];
  tiltScenes.forEach((scene) => {
    const isBar = scene.classList.contains("bar-stage");
    const base = isBar
      ? "perspective(1000px) rotateX(0deg) rotateY(0deg)"
      : "perspective(1100px) rotateX(2deg) rotateY(-2deg)";

    scene.addEventListener("pointermove", (event) => {
      if (prefersReducedMotion.matches || document.body.classList.contains("motion-paused")) return;
      const rect = scene.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      const rotateY = px * 10;
      const rotateX = -py * 9;
      scene.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    scene.addEventListener("pointerleave", () => {
      scene.style.transform = base;
    });
  });

  const revealTargets = [
    ...document.querySelectorAll(
      ".section-heading, .formula-layout, .unit-alert, .timeline-card, .comparison-note, .lab-grid, .period-details, .factor-card, .motion-copy, .official-example-copy, .decision-card, .credit-checklist, .rule-card, .myth-card, .quiz-question, .source-list li"
    ),
  ];

  revealTargets.forEach((target, index) => {
    target.dataset.reveal = "";
    target.style.transitionDelay = `${Math.min((index % 4) * 70, 210)}ms`;
  });

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealTargets.forEach((target) => revealObserver.observe(target));
  }
})();


