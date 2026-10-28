(function () {
  "use strict";

  const SENTENCE = "맑은 하늘 아래 바람이 조용히 불어온다.";
  const CANVAS_WIDTH = 1400;
  const CANVAS_HEIGHT = 420;
  const BRUSH = {
    color: "#000000",
    width: 4,
    lineCap: "round",
    lineJoin: "round"
  };

  const landingView = document.querySelector("#landing-view");
  const writingView = document.querySelector("#writing-view");
  const participantIdElement = document.querySelector("#participant-id");
  const writingParticipantIdElement = document.querySelector("#writing-participant-id");
  const startButton = document.querySelector("#start-button");
  const canvas = document.querySelector("#handwriting-canvas");
  const canvasHint = document.querySelector("#canvas-hint");
  const writingStatus = document.querySelector("#writing-status");
  const resetButton = document.querySelector("#reset-button");
  const completeButton = document.querySelector("#complete-button");
  const writingActions = document.querySelector("#writing-actions");
  const completionPanel = document.querySelector("#completion-panel");
  const saveLocationMessage = document.querySelector("#save-location-message");
  const jsonFilenameElement = document.querySelector("#json-filename");
  const pngFilenameElement = document.querySelector("#png-filename");
  const newSessionButton = document.querySelector("#new-session-button");
  const context = canvas.getContext("2d");

  const state = {
    participantId: createParticipantId(),
    strokes: [],
    currentStroke: null,
    resetCount: 0,
    startedAt: null,
    startedAtPerformance: null,
    completed: false
  };

  function createParticipantId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `anon-${window.crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
    }

    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return `anon-${values[0].toString(16).padStart(8, "0")}`;
    }

    return `anon-${Math.random().toString(16).slice(2, 10).padEnd(8, "0")}`;
  }

  function prepareCanvas() {
    context.save();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.restore();
    context.strokeStyle = BRUSH.color;
    context.fillStyle = BRUSH.color;
    context.lineWidth = BRUSH.width;
    context.lineCap = BRUSH.lineCap;
    context.lineJoin = BRUSH.lineJoin;
  }

  function beginWritingSession() {
    state.startedAt = new Date();
    state.startedAtPerformance = performance.now();
    landingView.hidden = true;
    writingView.hidden = false;
    prepareCanvas();
    canvas.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: round((event.clientX - rect.left) * (CANVAS_WIDTH / rect.width), 2),
      y: round((event.clientY - rect.top) * (CANVAS_HEIGHT / rect.height), 2),
      t: round(performance.now() - state.startedAtPerformance, 1)
    };
  }

  function round(value, decimalPlaces) {
    const multiplier = 10 ** decimalPlaces;
    return Math.round(value * multiplier) / multiplier;
  }

  function drawDot(point) {
    context.beginPath();
    context.arc(point.x, point.y, BRUSH.width / 2, 0, Math.PI * 2);
    context.fill();
  }

  function drawSegment(from, to) {
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  function beginStroke(event) {
    if (state.completed || event.button !== 0) {
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(event);
    state.currentStroke = {
      strokeId: state.strokes.length + 1,
      points: [point]
    };
    state.strokes.push(state.currentStroke);
    drawDot(point);
    updateWritingControls();
  }

  function continueStroke(event) {
    if (!state.currentStroke || state.completed) {
      return;
    }

    if ((event.buttons & 1) !== 1) {
      endStroke();
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(event);
    const points = state.currentStroke.points;
    const previousPoint = points[points.length - 1];
    points.push(point);
    drawSegment(previousPoint, point);
  }

  function endStroke() {
    state.currentStroke = null;
  }

  function updateWritingControls() {
    const hasInk = state.strokes.length > 0;
    canvasHint.classList.toggle("is-hidden", hasInk);
    resetButton.disabled = !hasInk || state.completed;
    completeButton.disabled = !hasInk || state.completed;
    writingStatus.classList.toggle("has-ink", hasInk && !state.completed);

    if (!state.completed) {
      writingStatus.querySelector("span").textContent = hasInk
        ? `${state.strokes.length}개 획을 기록했습니다`
        : "입력을 기다리고 있습니다";
    }
  }

  function resetWriting() {
    if (state.completed || state.strokes.length === 0) {
      return;
    }

    state.strokes = [];
    state.currentStroke = null;
    state.resetCount += 1;
    prepareCanvas();
    updateWritingControls();
  }

  function compactTimestamp(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function canvasToPngBlob() {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("PNG 파일을 만들 수 없습니다."));
      }, "image/png");
    });
  }

  async function saveResultFiles(jsonBlob, jsonFilename, pngBlob, pngFilename) {
    downloadBlob(jsonBlob, jsonFilename);
    window.setTimeout(function () {
      downloadBlob(pngBlob, pngFilename);
    }, 350);
    return "브라우저의 Downloads 폴더에 저장을 시작했습니다.";
  }

  async function completeWriting() {
    if (state.completed || state.strokes.length === 0) {
      return;
    }

    endStroke();
    completeButton.disabled = true;
    writingStatus.querySelector("span").textContent = "저장 폴더를 선택해 주세요";
    const completedAt = new Date();
    const durationMs = Math.round(performance.now() - state.startedAtPerformance);
    const fileBase = `handwriting_${state.participantId}_${compactTimestamp(completedAt)}`;
    const jsonFilename = `${fileBase}.json`;
    const pngFilename = `${fileBase}.png`;
    const payload = {
      schemaVersion: "1.0",
      participantId: state.participantId,
      sentence: SENTENCE,
      inputDevice: "mouse",
      startedAt: state.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: durationMs,
      resetCount: state.resetCount,
      canvas: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: "#ffffff"
      },
      brush: BRUSH,
      strokes: state.strokes
    };

    const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8"
    });

    try {
      const pngBlob = await canvasToPngBlob();
      const locationMessage = await saveResultFiles(
        jsonBlob,
        jsonFilename,
        pngBlob,
        pngFilename
      );

      state.completed = true;
      saveLocationMessage.textContent = locationMessage;
    } catch (error) {
      if (error && error.name === "AbortError") {
        writingStatus.querySelector("span").textContent = "폴더 선택이 취소되었습니다";
      } else {
        writingStatus.querySelector("span").textContent = "파일을 저장하지 못했습니다. 다시 시도해 주세요";
      }
      completeButton.disabled = false;
      return;
    }

    canvas.classList.add("is-locked");
    writingStatus.classList.remove("has-ink");
    writingStatus.classList.add("is-complete");
    writingStatus.querySelector("span").textContent = "작성이 완료되었습니다";
    resetButton.disabled = true;
    completeButton.disabled = true;
    jsonFilenameElement.textContent = jsonFilename;
    pngFilenameElement.textContent = pngFilename;
    writingActions.hidden = true;
    completionPanel.hidden = false;
  }

  participantIdElement.textContent = state.participantId;
  writingParticipantIdElement.textContent = state.participantId;
  startButton.disabled = false;
  prepareCanvas();

  startButton.addEventListener("click", beginWritingSession);
  resetButton.addEventListener("click", resetWriting);
  completeButton.addEventListener("click", completeWriting);
  newSessionButton.addEventListener("click", function () {
    window.location.reload();
  });
  canvas.addEventListener("mousedown", beginStroke);
  canvas.addEventListener("mousemove", continueStroke);
  canvas.addEventListener("mouseup", endStroke);
  canvas.addEventListener("mouseleave", endStroke);
  window.addEventListener("mouseup", endStroke);
})();
