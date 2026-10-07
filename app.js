// ==============================
// CAMERA LOG
// Offline-First + IndexedDB + Google Sheet Sync
// ==============================

const DB_NAME = "CameraLogDB";
const DB_VERSION = 3;

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzOV-hQA0bieDTC4gUDHBBqttxaqfRn1z2cjH-YTumaToaw2zdmtfwSNWdNNW9w3BGXkQ/exec";

let db = null;
let logs = [];
let syncInProgress = false;

// ==============================
// Current Session State
// ==============================

let sessionState = {
  project: {
    date: "",
    project: "",
    director: "",
    dp: "",
    camera: ""
  },

  scene: {
    scene: "",
    fps: "",
    shutter: "",
    iso: "",
    colorTemp: "",
    lut: "",
    resolution: "",
    format: "",
    aspectRatio: ""
  },

  shot: {
    shot: "",
    lens: "",
    filters: "",
    focus: "",
    height: "",
    tilt: "",
    stop: ""
  },

  // ROLL is a working state,
  // so it survives after SAVE.
  roll: ""
};

// ==============================
// Utility
// ==============================

function createSyncId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==============================
// IndexedDB
// ==============================

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = function (event) {
      const database = event.target.result;

      // Session state
      if (
        !database.objectStoreNames.contains("state")
      ) {
        database.createObjectStore("state", {
          keyPath: "id"
        });
      }

      // Log history
      let store;

      if (
        !database.objectStoreNames.contains("logs")
      ) {
        store = database.createObjectStore("logs", {
          autoIncrement: true
        });
      } else {
        store =
          event.target.transaction.objectStore(
            "logs"
          );
      }

      // Used to find a local log by SYNC_ID
      // when its status changes.
      if (!store.indexNames.contains("syncId")) {
        store.createIndex(
          "syncId",
          "syncId",
          {
            unique: true
          }
        );
      }
    };

    request.onsuccess = function (event) {
      db = event.target.result;

      db.onversionchange = function () {
        db.close();
      };

      console.log(
        "IndexedDB connected."
      );

      resolve(db);
    };

    request.onerror = function (event) {
      console.error(
        "IndexedDB connection failed:",
        event.target.error
      );

      reject(event.target.error);
    };
  });
}

// ==============================
// Save Current Session
// ==============================

function saveSession() {
  if (!db) {
    console.warn(
      "Database is not ready."
    );

    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["state"],
      "readwrite"
    );

    const store =
      transaction.objectStore("state");

    store.put({
      id: "currentSession",
      data: sessionState
    });

    transaction.oncomplete =
      function () {
        resolve();
      };

    transaction.onerror =
      function (event) {
        console.error(
          "Saving session failed:",
          event.target.error
        );

        reject(event.target.error);
      };
  });
}

// ==============================
// Load Current Session
// ==============================

function loadSession() {
  if (!db) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["state"],
      "readonly"
    );

    const store =
      transaction.objectStore("state");

    const request =
      store.get("currentSession");

    request.onsuccess = function () {
      if (request.result) {
        const saved =
          request.result.data;

        sessionState = {
          project: {
            ...sessionState.project,
            ...(saved.project || {})
          },

          scene: {
            ...sessionState.scene,
            ...(saved.scene || {})
          },

          shot: {
            ...sessionState.shot,
            ...(saved.shot || {})
          },

          roll:
            saved.roll || ""
        };

        console.log(
          "Session restored:",
          sessionState
        );
      }

      resolve();
    };

    request.onerror = function (event) {
      console.error(
        "Loading session failed:",
        event.target.error
      );

      reject(event.target.error);
    };
  });
}

// ==============================
// Save Log
// ==============================

function saveLogToDB(log) {
  if (!db) {
    return Promise.reject(
      new Error(
        "Database is not ready."
      )
    );
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["logs"],
      "readwrite"
    );

    const store =
      transaction.objectStore("logs");

    store.add(log);

    transaction.oncomplete =
      function () {
        resolve();
      };

    transaction.onerror =
      function (event) {
        console.error(
          "Saving log failed:",
          event.target.error
        );

        reject(event.target.error);
      };
  });
}

// ==============================
// Update Local Log
// ==============================

function updateLogInDB(
  syncId,
  updates
) {
  if (!db) {
    return Promise.reject(
      new Error(
        "Database is not ready."
      )
    );
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["logs"],
      "readwrite"
    );

    const store =
      transaction.objectStore("logs");

    const request =
      store.openCursor();

    let found = false;

    request.onsuccess =
      function (event) {
        const cursor =
          event.target.result;

        if (!cursor) {
          if (!found) {
            console.warn(
              "Local log not found for SYNC_ID:",
              syncId
            );
          }

          return;
        }

        const value =
          cursor.value;

        if (
          value &&
          value.syncId === syncId
        ) {
          found = true;

          cursor.update({
            ...value,
            ...updates
          });

          return;
        }

        cursor.continue();
      };

    request.onerror =
      function (event) {
        reject(event.target.error);
      };

    transaction.oncomplete =
      function () {
        resolve(found);
      };

    transaction.onerror =
      function (event) {
        reject(event.target.error);
      };
  });
}

// ==============================
// Load Logs
// ==============================

function loadLogsFromDB() {
  if (!db) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["logs"],
      "readonly"
    );

    const store =
      transaction.objectStore("logs");

    const request =
      store.getAll();

    request.onsuccess =
      function () {
        logs =
          (request.result || [])
            .map((log) => ({
              ...log,

              // Old records were created
              // before sync status existed.
              // Treat them as already synced.
              syncStatus:
                log.syncStatus ||
                "synced"
            }));

        console.log(
          "Logs restored:",
          logs.length
        );

        resolve(logs);
      };

    request.onerror =
      function (event) {
        console.error(
          "Loading logs failed:",
          event.target.error
        );

        reject(event.target.error);
      };
  });
}

// ==============================
// Build Google Sheet Data
// ==============================

function buildGoogleSheetData(log) {
  return {
    SYNC_ID:
      log.syncId,

    DATE:
      log.project.date,

    PROJECT:
      log.project.project,

    DIRECTOR:
      log.project.director,

    DP:
      log.project.dp,

    Camera:
      log.project.camera,

    SCENE:
      log.scene.scene,

    SHOT:
      log.shot.shot,

    TAKE:
      log.take,

    ROLL:
      log.roll,

    CLIP:
      log.clip,

    LENS:
      log.shot.lens,

    FILTERS:
      log.shot.filters,

    FOCUS:
      log.shot.focus,

    HEIGHT:
      log.shot.height,

    TILT:
      log.shot.tilt,

    STOP:
      log.shot.stop,

    FPS:
      log.scene.fps,

    SHUTTER:
      log.scene.shutter,

    ISO:
      log.scene.iso,

    "Color Temp":
      log.scene.colorTemp,

    LUT:
      log.scene.lut,

    RESOLUTION:
      log.scene.resolution,

    FORMAT:
      log.scene.format,

    "ASPECT RATIO":
      log.scene.aspectRatio,

    NOTE:
      log.note
  };
}

// ==============================
// Send Log to Google Sheet
// ==============================
//
// Because Google Apps Script is
// cross-origin, the hidden iframe
// method cannot directly read the
// server's JSON response.
//
// Therefore:
//
// 1. IndexedDB is always primary.
// 2. Offline = PENDING.
// 3. Online = POST attempted.
// 4. SYNC_ID makes retrying safe.
// ==============================

function sendToGoogleSheet(log) {
  return new Promise((resolve) => {
    if (!navigator.onLine) {
      console.log(
        "Browser is offline. Log remains PENDING."
      );

      resolve(false);
      return;
    }

    if (!log.syncId) {
      console.error(
        "Cannot sync log without SYNC_ID."
      );

      resolve(false);
      return;
    }

    const data =
      buildGoogleSheetData(log);

    let iframe = null;
    let form = null;
    let finished = false;

    const finish =
      (success) => {
        if (finished) {
          return;
        }

        finished = true;

        if (form) {
          form.remove();
        }

        if (iframe) {
          iframe.remove();
        }

        resolve(success);
      };

    try {
      // ======================================
      // Create hidden iframe
      // ======================================

      iframe =
        document.createElement(
          "iframe"
        );

      const iframeName =
        "cameraLogSubmit_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .slice(2, 7);

      iframe.name =
        iframeName;

      iframe.style.display =
        "none";

      document.body.appendChild(
        iframe
      );

      // ======================================
      // Create POST Form
      // ======================================

      form =
        document.createElement(
          "form"
        );

      form.method =
        "POST";

      form.action =
        GOOGLE_SCRIPT_URL;

      form.target =
        iframeName;

      form.style.display =
        "none";

      // ======================================
      // Put JSON into data
      // ======================================

      const input =
        document.createElement(
          "input"
        );

      input.type =
        "hidden";

      input.name =
        "data";

      input.value =
        JSON.stringify(data);

      form.appendChild(
        input
      );

      document.body.appendChild(
        form
      );

      console.log(
        "Sending Camera Log to Google Sheet:",
        data
      );

      form.submit();

      // We cannot read the
      // cross-origin response.
      //
      // Treat the request as submitted
      // after the normal Apps Script
      // processing window.

      setTimeout(() => {
        if (!navigator.onLine) {
          console.warn(
            "Connection went offline during sync. Keeping log PENDING."
          );

          finish(false);
          return;
        }

        console.log(
          "Google Sheet sync request submitted:",
          log.syncId
        );

        finish(true);
      }, 2000);

    } catch (error) {
      console.error(
        "Google Sheet sync request failed:",
        error
      );

      finish(false);
    }
  });
}

// ==============================
// Sync One Log
// ==============================

async function syncSingleLog(log) {
  if (!log || !log.syncId) {
    return false;
  }

  if (
    log.syncStatus ===
    "synced"
  ) {
    return true;
  }

  if (!navigator.onLine) {
    return false;
  }

  const success =
    await sendToGoogleSheet(
      log
    );

  if (success) {
    log.syncStatus =
      "synced";

    try {
      await updateLogInDB(
        log.syncId,
        {
          syncStatus:
            "synced"
        }
      );
    } catch (error) {
      console.error(
        "Failed to update local sync status:",
        error
      );
    }

    renderHistory();

    return true;
  }

  log.syncStatus =
    "pending";

  renderHistory();

  return false;
}

// ==============================
// Sync All Pending Logs
// ==============================

async function syncPendingLogs() {
  if (syncInProgress) {
    return;
  }

  if (!navigator.onLine) {
    return;
  }

  const pendingLogs =
    logs.filter(
      (log) =>
        log &&
        log.syncStatus ===
          "pending"
    );

  if (
    pendingLogs.length === 0
  ) {
    return;
  }

  syncInProgress =
    true;

  console.log(
    "Pending logs to sync:",
    pendingLogs.length
  );

  try {
    for (
      const log of pendingLogs
    ) {
      if (!navigator.onLine) {
        break;
      }

      await syncSingleLog(
        log
      );
    }

  } catch (error) {
    console.error(
      "Pending log sync failed:",
      error
    );

  } finally {
    syncInProgress =
      false;

    renderHistory();
  }
}

// ==============================
// Read Form → Session State
// ==============================

function readFormToState() {
  sessionState.project = {
    date:
      document.getElementById(
        "date"
      ).value,

    project:
      document.getElementById(
        "project"
      ).value,

    director:
      document.getElementById(
        "director"
      ).value,

    dp:
      document.getElementById(
        "dp"
      ).value,

    camera:
      document.getElementById(
        "camera"
      ).value
  };

  sessionState.scene = {
    scene:
      document.getElementById(
        "scene"
      ).value,

    fps:
      document.getElementById(
        "fps"
      ).value,

    shutter:
      document.getElementById(
        "shutter"
      ).value,

    iso:
      document.getElementById(
        "iso"
      ).value,

    colorTemp:
      document.getElementById(
        "colorTemp"
      ).value,

    lut:
      document.getElementById(
        "lut"
      ).value,

    resolution:
      document.getElementById(
        "resolution"
      ).value,

    format:
      document.getElementById(
        "format"
      ).value,

    aspectRatio:
      document.getElementById(
        "aspectRatio"
      ).value
  };

  sessionState.shot = {
    shot:
      document.getElementById(
        "shot"
      ).value,

    lens:
      document.getElementById(
        "lens"
      ).value,

    filters:
      document.getElementById(
        "filters"
      ).value,

    focus:
      document.getElementById(
        "focus"
      ).value,

    height:
      document.getElementById(
        "height"
      ).value,

    tilt:
      document.getElementById(
        "tilt"
      ).value,

    stop:
      document.getElementById(
        "stop"
      ).value
  };

  sessionState.roll =
    document.getElementById(
      "roll"
    ).value;
}

// ==============================
// Apply Session State → Form
// ==============================

function applyStateToForm() {
  // Project

  document.getElementById(
    "date"
  ).value =
    sessionState.project.date ||
    "";

  document.getElementById(
    "project"
  ).value =
    sessionState.project.project ||
    "";

  document.getElementById(
    "director"
  ).value =
    sessionState.project.director ||
    "";

  document.getElementById(
    "dp"
  ).value =
    sessionState.project.dp ||
    "";

  document.getElementById(
    "camera"
  ).value =
    sessionState.project.camera ||
    "";

  // Scene

  document.getElementById(
    "scene"
  ).value =
    sessionState.scene.scene ||
    "";

  document.getElementById(
    "fps"
  ).value =
    sessionState.scene.fps ||
    "";

  document.getElementById(
    "shutter"
  ).value =
    sessionState.scene.shutter ||
    "";

  document.getElementById(
    "iso"
  ).value =
    sessionState.scene.iso ||
    "";

  document.getElementById(
    "colorTemp"
  ).value =
    sessionState.scene.colorTemp ||
    "";

  document.getElementById(
    "lut"
  ).value =
    sessionState.scene.lut ||
    "";

  document.getElementById(
    "resolution"
  ).value =
    sessionState.scene.resolution ||
    "";

  document.getElementById(
    "format"
  ).value =
    sessionState.scene.format ||
    "";

  document.getElementById(
    "aspectRatio"
  ).value =
    sessionState.scene.aspectRatio ||
    "";

  // Shot

  document.getElementById(
    "shot"
  ).value =
    sessionState.shot.shot ||
    "";

  document.getElementById(
    "lens"
  ).value =
    sessionState.shot.lens ||
    "";

  document.getElementById(
    "filters"
  ).value =
    sessionState.shot.filters ||
    "";

  document.getElementById(
    "focus"
  ).value =
    sessionState.shot.focus ||
    "";

  document.getElementById(
    "height"
  ).value =
    sessionState.shot.height ||
    "";

  document.getElementById(
    "tilt"
  ).value =
    sessionState.shot.tilt ||
    "";

  document.getElementById(
    "stop"
  ).value =
    sessionState.shot.stop ||
    "";

  // Roll

  document.getElementById(
    "roll"
  ).value =
    sessionState.roll ||
    "";
}

// ==============================
// Update Display Labels
// ==============================

function updateCurrentLabels() {

  const projectLabel =
    document.getElementById("currentProject");

  const projectSummary =
    document.getElementById("projectSummary");

  const sceneLabel =
    document.getElementById("currentScene");

  const shotLabel =
    document.getElementById("currentShot");


  // PROJECT

  const projectName =
    sessionState.project.project ||
    "No Project";

  if (projectLabel) {
    projectLabel.textContent =
      projectName;
  }

  if (projectSummary) {

    const director =
      sessionState.project.director;

    const dp =
      sessionState.project.dp;

    const camera =
      sessionState.project.camera;

    const details = [
      director,
      dp,
      camera
    ].filter(Boolean);

    projectSummary.textContent =
      details.length > 0
        ? `${projectName} · ${details.join(" · ")}`
        : projectName;
  }


  // SCENE

  if (sceneLabel) {

    sceneLabel.textContent =
      sessionState.scene.scene ||
      "No Scene";
  }


  // SHOT

  if (shotLabel) {

    shotLabel.textContent =
      sessionState.shot.shot ||
      "No Shot";
  }
}

// ==============================
// Save Current Session
// ==============================

let saveTimer = null;

function scheduleSessionSave() {
  clearTimeout(
    saveTimer
  );

  saveTimer =
    setTimeout(
      async () => {
        readFormToState();

        try {
          await saveSession();

          console.log(
            "Session automatically saved."
          );

        } catch (error) {
          console.error(
            "Automatic session save failed:",
            error
          );
        }
      },
      300
    );
}

// ==============================
// Section Toggle
// ==============================

function toggleSection(
  sectionId
) {
  const section =
    document.getElementById(
      sectionId
    );

  if (!section) {
    return;
  }

  section.classList.toggle(
    "collapsed"
  );
}

// ==============================
// Edit Scene
// ==============================

function editScene() {

  readFormToState();

  const scene =
    document.getElementById("scene").value;

  sessionState.scene.scene =
    scene;

  updateCurrentLabels();

  saveSession();

  toggleSection("sceneContent");
}

// ==============================
// Edit Shot
// ==============================

function editShot() {

  readFormToState();

  const shot =
    document.getElementById("shot").value;

  sessionState.shot.shot =
    shot;

  updateCurrentLabels();

  saveSession();

  toggleSection("shotContent");
}

// ==============================
// SAVE TAKE
// ==============================

async function saveTake() {
  // First capture EVERYTHING
  // currently visible.

  readFormToState();

  const take =
    document.getElementById(
      "take"
    ).value;

  const clip =
    document.getElementById(
      "clip"
    ).value;

  const note =
    document.getElementById(
      "note"
    ).value;

  // ============================
  // Create complete snapshot
  // ============================

  const log = {
    syncId:
      createSyncId(),

    savedAt:
      new Date().toISOString(),

    syncStatus:
      "pending",

    project: {
      ...sessionState.project
    },

    scene: {
      ...sessionState.scene
    },

    shot: {
      ...sessionState.shot
    },

    take:
      take,

    roll:
      sessionState.roll,

    clip:
      clip,

    note:
      note
  };

  try {
    // ============================
    // 1. ALWAYS save locally first
    // ============================

    await saveLogToDB(
      log
    );

    logs.push(log);

    renderHistory();

    // ============================
    // 2. Try Google Sheet sync
    // ============================

    const googleSheetSuccess =
      await syncSingleLog(
        log
      );

    if (
      !googleSheetSuccess
    ) {
      console.warn(
        "Log saved locally and remains PENDING."
      );

      if (!navigator.onLine) {
        console.log(
          "Offline: will sync automatically when connection returns."
        );
      }
    }

    // ============================
    // 3. Clear ONLY Take / Clip / Note
    // ============================

    document.getElementById(
      "take"
    ).value = "";

    document.getElementById(
      "clip"
    ).value = "";

    document.getElementById(
      "note"
    ).value = "";

    // IMPORTANT:
    // ROLL is intentionally NOT cleared.

    // Save remaining working state.

    readFormToState();

    await saveSession();

    renderHistory();

    console.log(
      "Take saved successfully:",
      log.syncId
    );

  } catch (error) {
    console.error(
      "Save Take failed:",
      error
    );

    alert(
      "SAVE 失敗，請查看瀏覽器 Console。"
    );
  }
}

// ==============================
// Render History
// ==============================

function renderHistory() {
  const history =
    document.getElementById(
      "history"
    );

  if (!history) {
    return;
  }

  history.innerHTML = "";

  if (logs.length === 0) {
    history.innerHTML =
      "<div class='empty-history'>No logs yet.</div>";

    return;
  }

  // Newest first

  [...logs]
    .reverse()
    .forEach(
      (log) => {
        const item =
          document.createElement(
            "div"
          );

        item.className =
          "history-item";

        const scene =
          log.scene?.scene ||
          "";

        const shot =
          log.shot?.shot ||
          "";

        const take =
          log.take ||
          "";

        const roll =
          log.roll ||
          "";

        const clip =
          log.clip ||
          "";

        const note =
          log.note ||
          "";

        const isPending =
          log.syncStatus ===
          "pending";

        const syncLabel =
          isPending
            ? "PENDING"
            : "SYNCED";

        item.innerHTML = `
          <div class="history-title">
            Scene ${escapeHtml(scene)}
            / Shot ${escapeHtml(shot)}
            / Take ${escapeHtml(take)}
          </div>

          <div class="history-details">
            ROLL: ${escapeHtml(
              roll || "-"
            )}
            &nbsp; | &nbsp;
            CLIP: ${escapeHtml(
              clip || "-"
            )}
            &nbsp; | &nbsp;
            <strong>${syncLabel}</strong>
          </div>

          ${
            note
              ? `<div class="history-note">${escapeHtml(note)}</div>`
              : ""
          }
        `;

        history.appendChild(
          item
        );
      }
    );
}

// ==============================
// NEW PROJECT
// ==============================

async function newProject() {
  const confirmed =
    confirm(
      "Start a new project?"
    );

  if (!confirmed) {
    return;
  }

  sessionState = {
    project: {
      date: "",
      project: "",
      director: "",
      dp: "",
      camera: ""
    },

    scene: {
      scene: "",
      fps: "",
      shutter: "",
      iso: "",
      colorTemp: "",
      lut: "",
      resolution: "",
      format: "",
      aspectRatio: ""
    },

    shot: {
      shot: "",
      lens: "",
      filters: "",
      focus: "",
      height: "",
      tilt: "",
      stop: ""
    },

    roll: ""
  };

  applyStateToForm();

  updateCurrentLabels();

  document.getElementById(
    "take"
  ).value = "";

  document.getElementById(
    "clip"
  ).value = "";

  document.getElementById(
    "note"
  ).value = "";

  // Existing Log History
  // is intentionally preserved.

  await saveSession();

  console.log(
    "New project session started."
  );
}

// ==============================
// Attach Auto-Save Listeners
// ==============================

function setupAutoSave() {
  const fields = [
    "date",
    "project",
    "director",
    "dp",
    "camera",

    "scene",
    "fps",
    "shutter",
    "iso",
    "colorTemp",
    "lut",
    "resolution",
    "format",
    "aspectRatio",

    "shot",
    "lens",
    "filters",
    "focus",
    "height",
    "tilt",
    "stop",

    "roll"
  ];

  fields.forEach(
    (id) => {
      const element =
        document.getElementById(
          id
        );

      if (!element) {
        return;
      }

      element.addEventListener(
        "input",
        scheduleSessionSave
      );

      element.addEventListener(
        "change",
        scheduleSessionSave
      );
    }
  );
}

// ==============================
// Network / Sync Listeners
// ==============================

function setupSyncListeners() {
  window.addEventListener(
    "online",
    async function () {
      console.log(
        "Network restored. Starting pending sync..."
      );

      await syncPendingLogs();
    }
  );

  window.addEventListener(
    "offline",
    function () {
      console.log(
        "Network offline. New logs will remain PENDING."
      );

      renderHistory();
    }
  );

  // Periodic retry.
  //
  // This also helps when
  // navigator.onLine says "online"
  // again after a temporary
  // connection problem.

  setInterval(
    syncPendingLogs,
    30000
  );
}

// ==============================
// Initialize App
// ==============================

document.addEventListener(
  "DOMContentLoaded",
  async function () {
    console.log(
      "Camera Log starting..."
    );

    try {
      await openDatabase();

      await loadSession();

      await loadLogsFromDB();

      applyStateToForm();

      updateCurrentLabels();

      renderHistory();

      setupAutoSave();

      setupSyncListeners();

      // If there are pending records
      // from a previous offline session,
      // try them immediately.

      await syncPendingLogs();

      console.log(
        "Camera Log ready."
      );

    } catch (error) {
      console.error(
        "Camera Log initialization failed:",
        error
      );

      alert(
        "Camera Log 初始化失敗，請開啟瀏覽器 Console 查看錯誤。"
      );
    }
  }
);
