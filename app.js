// ==============================
// CAMERA LOG
// IndexedDB Persistence Version
// ==============================

const DB_NAME = "CameraLogDB";
const DB_VERSION = 2;

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz9ciA4Nk41eiEPbsu77X-m2KD1kqhd64MuwTMfxg9-D9aDE4dlwsHzQB3rOSSwQRHUMw/exec";

let db = null;
let logs = [];

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
// IndexedDB
// ==============================

function openDatabase() {
  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {

      const database = event.target.result;

      // Session state
      if (!database.objectStoreNames.contains("state")) {
        database.createObjectStore("state", {
          keyPath: "id"
        });
      }

      // Log history
      if (!database.objectStoreNames.contains("logs")) {
        database.createObjectStore("logs", {
          autoIncrement: true
        });
      }
    };

    request.onsuccess = function (event) {
      db = event.target.result;
      console.log("IndexedDB connected.");
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
    console.warn("Database is not ready.");
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      ["state"],
      "readwrite"
    );

    const store = transaction.objectStore("state");

    store.put({
      id: "currentSession",
      data: sessionState
    });

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function (event) {
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

    const store = transaction.objectStore("state");

    const request = store.get("currentSession");

    request.onsuccess = function () {

      if (request.result) {

        const saved = request.result.data;

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

          roll: saved.roll || ""
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
      new Error("Database is not ready.")
    );
  }

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      ["logs"],
      "readwrite"
    );

    const store = transaction.objectStore("logs");

    store.add(log);

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function (event) {

      console.error(
        "Saving log failed:",
        event.target.error
      );

      reject(event.target.error);
    };
  });
}

// ==============================
// Send Log to Google Sheet
// ==============================

// ==============================
// Send Log to Google Sheet
// ==============================

function sendToGoogleSheet(log) {

  return new Promise((resolve) => {

    // Create hidden iframe
    const iframe =
      document.createElement("iframe");

    const iframeName =
      "googleSheetSubmit_" +
      Date.now();

    iframe.name = iframeName;

    iframe.style.display = "none";

    document.body.appendChild(iframe);


    // Create hidden form
    const form =
      document.createElement("form");

    form.method = "POST";

    form.action =
      GOOGLE_SCRIPT_URL;

    form.target =
      iframeName;

    form.style.display = "none";


    // Data that will be sent
    const data = {

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


    // Send JSON as one form field
    const input =
      document.createElement("input");

    input.type = "hidden";

    input.name = "data";

    input.value =
      JSON.stringify(data);

    form.appendChild(input);


    document.body.appendChild(form);


    // Submit to Apps Script
    form.submit();


    console.log(
      "Google Sheet submission sent."
    );


    // Give Apps Script time to receive the request.
    setTimeout(() => {

      form.remove();

      iframe.remove();

      console.log(
        "Google Sheet submission completed."
      );

      resolve(true);

    }, 1500);

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

    const store = transaction.objectStore("logs");

    const request = store.getAll();

    request.onsuccess = function () {

      logs = request.result || [];

      console.log(
        "Logs restored:",
        logs.length
      );

      resolve(logs);
    };

    request.onerror = function (event) {

      console.error(
        "Loading logs failed:",
        event.target.error
      );

      reject(event.target.error);
    };
  });
}


// ==============================
// Read Form → Session State
// ==============================

function readFormToState() {

  sessionState.project = {

    date:
      document.getElementById("date").value,

    project:
      document.getElementById("project").value,

    director:
      document.getElementById("director").value,

    dp:
      document.getElementById("dp").value,

    camera:
      document.getElementById("camera").value
  };


  sessionState.scene = {

    scene:
      document.getElementById("scene").value,

    fps:
      document.getElementById("fps").value,

    shutter:
      document.getElementById("shutter").value,

    iso:
      document.getElementById("iso").value,

    colorTemp:
      document.getElementById("colorTemp").value,

    lut:
      document.getElementById("lut").value,

    resolution:
      document.getElementById("resolution").value,

    format:
      document.getElementById("format").value,

    aspectRatio:
      document.getElementById("aspectRatio").value
  };


  sessionState.shot = {

    shot:
      document.getElementById("shot").value,

    lens:
      document.getElementById("lens").value,

    filters:
      document.getElementById("filters").value,

    focus:
      document.getElementById("focus").value,

    height:
      document.getElementById("height").value,

    tilt:
      document.getElementById("tilt").value,

    stop:
      document.getElementById("stop").value
  };


  sessionState.roll =
    document.getElementById("roll").value;
}


// ==============================
// Apply Session State → Form
// ==============================

function applyStateToForm() {

  // Project

  document.getElementById("date").value =
    sessionState.project.date || "";

  document.getElementById("project").value =
    sessionState.project.project || "";

  document.getElementById("director").value =
    sessionState.project.director || "";

  document.getElementById("dp").value =
    sessionState.project.dp || "";

  document.getElementById("camera").value =
    sessionState.project.camera || "";


  // Scene

  document.getElementById("scene").value =
    sessionState.scene.scene || "";

  document.getElementById("fps").value =
    sessionState.scene.fps || "";

  document.getElementById("shutter").value =
    sessionState.scene.shutter || "";

  document.getElementById("iso").value =
    sessionState.scene.iso || "";

  document.getElementById("colorTemp").value =
    sessionState.scene.colorTemp || "";

  document.getElementById("lut").value =
    sessionState.scene.lut || "";

  document.getElementById("resolution").value =
    sessionState.scene.resolution || "";

  document.getElementById("format").value =
    sessionState.scene.format || "";

  document.getElementById("aspectRatio").value =
    sessionState.scene.aspectRatio || "";


  // Shot

  document.getElementById("shot").value =
    sessionState.shot.shot || "";

  document.getElementById("lens").value =
    sessionState.shot.lens || "";

  document.getElementById("filters").value =
    sessionState.shot.filters || "";

  document.getElementById("focus").value =
    sessionState.shot.focus || "";

  document.getElementById("height").value =
    sessionState.shot.height || "";

  document.getElementById("tilt").value =
    sessionState.shot.tilt || "";

  document.getElementById("stop").value =
    sessionState.shot.stop || "";


  // Roll

  document.getElementById("roll").value =
    sessionState.roll || "";
}


// ==============================
// Update Display Labels
// ==============================

function updateCurrentLabels() {

  const projectLabel =
    document.getElementById("currentProject");

  const sceneLabel =
    document.getElementById("currentScene");

  const shotLabel =
    document.getElementById("currentShot");


  if (projectLabel) {

    projectLabel.textContent =
      sessionState.project.project ||
      "No Project";
  }


  if (sceneLabel) {

    sceneLabel.textContent =
      sessionState.scene.scene ||
      "No Scene";
  }


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

  clearTimeout(saveTimer);

  saveTimer = setTimeout(async () => {

    readFormToState();

    try {
      await saveSession();

      console.log("Session automatically saved.");

    } catch (error) {

      console.error(
        "Automatic session save failed:",
        error
      );
    }

  }, 300);
}


// ==============================
// Section Toggle
// ==============================

function toggleSection(sectionId) {

  const section =
    document.getElementById(sectionId);

  if (!section) {
    return;
  }

  section.classList.toggle("collapsed");
}


// ==============================
// Edit Scene
// ==============================

function editScene() {

  readFormToState();

  const scene =
    document.getElementById("scene").value;

  sessionState.scene.scene = scene;

  updateCurrentLabels();

  saveSession();
}


// ==============================
// Edit Shot
// ==============================

function editShot() {

  readFormToState();

  const shot =
    document.getElementById("shot").value;

  sessionState.shot.shot = shot;

  updateCurrentLabels();

  saveSession();
}


// ==============================
// SAVE TAKE
// ==============================

async function saveTake() {

  // First capture EVERYTHING currently visible.
  readFormToState();

  const take =
    document.getElementById("take").value;

  const clip =
    document.getElementById("clip").value;

  const note =
    document.getElementById("note").value;


  // ============================
  // Create complete snapshot
  // ============================

  const log = {

    savedAt:
      new Date().toISOString(),

    project: {
      ...sessionState.project
    },

    scene: {
      ...sessionState.scene
    },

    shot: {
      ...sessionState.shot
    },

    take: take,

    roll: sessionState.roll,

    clip: clip,

    note: note
  };


  try {
    // ============================
    // 1. Save to local IndexedDB
    // ============================

    await saveLogToDB(log);

    logs.push(log);

    renderHistory();


    // ============================
    // 2. Send to Google Sheet
    // ============================

    const googleSheetSuccess =
      await sendToGoogleSheet(log);


    if (!googleSheetSuccess) {

      console.warn(
        "Log was saved locally, but Google Sheet sync failed."
      );

      alert(
        "已儲存在本機，但 Google Sheet 同步失敗。"
      );
    }


    // ============================
    // Clear ONLY Take / Clip / Note
    // ============================

    document.getElementById("take").value = "";

    document.getElementById("clip").value = "";

    document.getElementById("note").value = "";


    // IMPORTANT:
    // ROLL is intentionally NOT cleared.


    // Save the remaining working state.
    readFormToState();

    await saveSession();


    console.log("Take saved successfully.");

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
    document.getElementById("history");

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
    .forEach((log) => {

      const item =
        document.createElement("div");

      item.className =
        "history-item";


      const scene =
        log.scene?.scene || "";

      const shot =
        log.shot?.shot || "";

      const take =
        log.take || "";

      const roll =
        log.roll || "";

      const clip =
        log.clip || "";

      const note =
        log.note || "";


      item.innerHTML = `

        <div class="history-title">
          Scene ${scene}
          / Shot ${shot}
          / Take ${take}
        </div>

        <div class="history-details">
          ROLL: ${roll || "-"}
          &nbsp; | &nbsp;
          CLIP: ${clip || "-"}
        </div>

        ${
          note
            ? `<div class="history-note">${note}</div>`
            : ""
        }

      `;


      history.appendChild(item);
    });
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


  document.getElementById("take").value = "";

  document.getElementById("clip").value = "";

  document.getElementById("note").value = "";


  // IMPORTANT:
  // At this stage we only reset the CURRENT SESSION.
  // Existing Log History is intentionally preserved.

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


  fields.forEach((id) => {

    const element =
      document.getElementById(id);

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
  });
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
