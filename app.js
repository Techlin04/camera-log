// ============================================
// CAMERA LOG
// IndexedDB Local Storage Version
// ============================================


// ============================================
// GLOBAL STATE
// ============================================

let projectState = {
  date: "",
  project: "",
  director: "",
  dp: "",
  camera: ""
};


let sceneState = {
  scene: "",

  fps: "",
  shutter: "",
  iso: "",
  colorTemp: "",
  lut: "",
  resolution: "",
  format: "",
  aspectRatio: ""
};


let shotState = {
  shot: "",

  lens: "",
  filters: "",
  focus: "",
  height: "",
  tilt: "",
  stop: ""
};


let logs = [];


// ============================================
// INDEXEDDB SETTINGS
// ============================================

const DB_NAME = "CameraLogDB";

const DB_VERSION = 1;

const STATE_STORE = "state";

const LOG_STORE = "logs";

let db;


// ============================================
// OPEN DATABASE
// ============================================

function openDatabase() {

  return new Promise(function (resolve, reject) {

    const request =
      indexedDB.open(DB_NAME, DB_VERSION);


    // First time database is created

    request.onupgradeneeded = function (event) {

      const database = event.target.result;


      // State store

      if (!database.objectStoreNames.contains(STATE_STORE)) {

        database.createObjectStore(
          STATE_STORE,
          { keyPath: "id" }
        );

      }


      // Log store

      if (!database.objectStoreNames.contains(LOG_STORE)) {

        database.createObjectStore(
          LOG_STORE,
          {
            keyPath: "id",
            autoIncrement: true
          }
        );

      }

    };


    request.onsuccess = function (event) {

      db = event.target.result;

      console.log("IndexedDB opened.");

      resolve(db);

    };


    request.onerror = function (event) {

      console.error(
        "IndexedDB error:",
        event.target.error
      );

      reject(event.target.error);

    };

  });

}


// ============================================
// SAVE CURRENT STATE
// ============================================

function saveStateToDB() {

  if (!db) return;


  return new Promise(function (resolve, reject) {

    const transaction =
      db.transaction(
        STATE_STORE,
        "readwrite"
      );


    const store =
      transaction.objectStore(STATE_STORE);


    store.put({
      id: "current",

      project: projectState,

      scene: sceneState,

      shot: shotState

    });


    transaction.oncomplete = function () {

      console.log("Current state saved.");

      resolve();

    };


    transaction.onerror = function (event) {

      console.error(
        "State save error:",
        event.target.error
      );

      reject(event.target.error);

    };

  });

}


// ============================================
// LOAD CURRENT STATE
// ============================================

function loadStateFromDB() {

  if (!db) return;


  return new Promise(function (resolve, reject) {

    const transaction =
      db.transaction(
        STATE_STORE,
        "readonly"
      );


    const store =
      transaction.objectStore(STATE_STORE);


    const request =
      store.get("current");


    request.onsuccess = function () {

      const data = request.result;


      if (data) {

        projectState =
          data.project || projectState;

        sceneState =
          data.scene || sceneState;

        shotState =
          data.shot || shotState;


        applyStateToForm();

      }


      resolve();

    };


    request.onerror = function (event) {

      console.error(
        "State load error:",
        event.target.error
      );

      reject(event.target.error);

    };

  });

}


// ============================================
// APPLY STATE TO FORM
// ============================================

function applyStateToForm() {

  // -------------------------
  // PROJECT
  // -------------------------

  document.getElementById("date").value =
    projectState.date || "";

  document.getElementById("project").value =
    projectState.project || "";

  document.getElementById("director").value =
    projectState.director || "";

  document.getElementById("dp").value =
    projectState.dp || "";

  document.getElementById("camera").value =
    projectState.camera || "";


  // -------------------------
  // SCENE
  // -------------------------

  document.getElementById("scene").value =
    sceneState.scene || "";

  document.getElementById("fps").value =
    sceneState.fps || "";

  document.getElementById("shutter").value =
    sceneState.shutter || "";

  document.getElementById("iso").value =
    sceneState.iso || "";

  document.getElementById("colorTemp").value =
    sceneState.colorTemp || "";

  document.getElementById("lut").value =
    sceneState.lut || "";

  document.getElementById("resolution").value =
    sceneState.resolution || "";

  document.getElementById("format").value =
    sceneState.format || "";

  document.getElementById("aspectRatio").value =
    sceneState.aspectRatio || "";


  // -------------------------
  // SHOT
  // -------------------------

  document.getElementById("shot").value =
    shotState.shot || "";

  document.getElementById("lens").value =
    shotState.lens || "";

  document.getElementById("filters").value =
    shotState.filters || "";

  document.getElementById("focus").value =
    shotState.focus || "";

  document.getElementById("height").value =
    shotState.height || "";

  document.getElementById("tilt").value =
    shotState.tilt || "";

  document.getElementById("stop").value =
    shotState.stop || "";


  // -------------------------
  // DISPLAY
  // -------------------------

  updateCurrentProject();

  updateCurrentScene();

  updateCurrentShot();

}


// ============================================
// SAVE LOG TO INDEXEDDB
// ============================================

function saveLogToDB(log) {

  if (!db) return;


  return new Promise(function (resolve, reject) {

    const transaction =
      db.transaction(
        LOG_STORE,
        "readwrite"
      );


    const store =
      transaction.objectStore(LOG_STORE);


    store.add(log);


    transaction.oncomplete = function () {

      console.log("Log saved locally.");

      resolve();

    };


    transaction.onerror = function (event) {

      console.error(
        "Log save error:",
        event.target.error
      );

      reject(event.target.error);

    };

  });

}


// ============================================
// LOAD LOGS FROM INDEXEDDB
// ============================================

function loadLogsFromDB() {

  if (!db) return;


  return new Promise(function (resolve, reject) {

    const transaction =
      db.transaction(
        LOG_STORE,
        "readonly"
      );


    const store =
      transaction.objectStore(LOG_STORE);


    const request =
      store.getAll();


    request.onsuccess = function () {

      logs = request.result || [];

      renderHistory();

      resolve();

    };


    request.onerror = function (event) {

      console.error(
        "Log load error:",
        event.target.error
      );

      reject(event.target.error);

    };

  });

}


// ============================================
// INITIALIZE APP
// ============================================

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    console.log(
      "Camera Log App loaded."
    );


    try {

      await openDatabase();

      await loadStateFromDB();

      await loadLogsFromDB();


      console.log(
        "Camera Log local data loaded."
      );

    } catch (error) {

      console.error(
        "Initialization error:",
        error
      );

    }

  }
);


// ============================================
// TOGGLE SECTION
// ============================================

function toggleSection(id) {

  const element =
    document.getElementById(id);


  if (!element) return;


  if (element.style.display === "none") {

    element.style.display = "";

  } else {

    element.style.display = "none";

  }

}


// ============================================
// UPDATE PROJECT STATE
// ============================================

function updateProjectState() {

  projectState.date =
    document.getElementById("date").value;

  projectState.project =
    document.getElementById("project").value;

  projectState.director =
    document.getElementById("director").value;

  projectState.dp =
    document.getElementById("dp").value;

  projectState.camera =
    document.getElementById("camera").value;


  saveStateToDB();

  updateCurrentProject();

}


// ============================================
// UPDATE CURRENT PROJECT DISPLAY
// ============================================

function updateCurrentProject() {

  const element =
    document.getElementById(
      "currentProject"
    );


  if (!element) return;


  if (projectState.project) {

    element.textContent =
      projectState.project;

  } else {

    element.textContent =
      "No Project";

  }

}


// ============================================
// EDIT SCENE
// ============================================

function editScene() {

  sceneState.scene =
    document.getElementById("scene").value;

  sceneState.fps =
    document.getElementById("fps").value;

  sceneState.shutter =
    document.getElementById("shutter").value;

  sceneState.iso =
    document.getElementById("iso").value;

  sceneState.colorTemp =
    document.getElementById("colorTemp").value;

  sceneState.lut =
    document.getElementById("lut").value;

  sceneState.resolution =
    document.getElementById("resolution").value;

  sceneState.format =
    document.getElementById("format").value;

  sceneState.aspectRatio =
    document.getElementById("aspectRatio").value;


  saveStateToDB();

  updateCurrentScene();

}


// ============================================
// UPDATE CURRENT SCENE DISPLAY
// ============================================

function updateCurrentScene() {

  const element =
    document.getElementById(
      "currentScene"
    );


  if (!element) return;


  element.textContent =
    sceneState.scene || "—";

}


// ============================================
// EDIT SHOT
// ============================================

function editShot() {

  shotState.shot =
    document.getElementById("shot").value;

  shotState.lens =
    document.getElementById("lens").value;

  shotState.filters =
    document.getElementById("filters").value;

  shotState.focus =
    document.getElementById("focus").value;

  shotState.height =
    document.getElementById("height").value;

  shotState.tilt =
    document.getElementById("tilt").value;

  shotState.stop =
    document.getElementById("stop").value;


  saveStateToDB();

  updateCurrentShot();

}


// ============================================
// UPDATE CURRENT SHOT DISPLAY
// ============================================

function updateCurrentShot() {

  const element =
    document.getElementById(
      "currentShot"
    );


  if (!element) return;


  element.textContent =
    shotState.shot || "—";

}


// ============================================
// SAVE TAKE
// ============================================

async function saveTake() {

  // -------------------------
  // Update current state
  // -------------------------

  updateProjectState();

  editScene();

  editShot();


  // -------------------------
  // Create log
  // -------------------------

  const take = {

    createdAt:
      new Date().toISOString(),

    date:
      projectState.date,

    project:
      projectState.project,

    director:
      projectState.director,

    dp:
      projectState.dp,

    camera:
      projectState.camera,

    scene:
      sceneState.scene,

    shot:
      shotState.shot,

    take:
      document.getElementById("take").value,

    roll:
      document.getElementById("roll").value,

    clip:
      document.getElementById("clip").value,

    lens:
      shotState.lens,

    filters:
      shotState.filters,

    focus:
      shotState.focus,

    height:
      shotState.height,

    tilt:
      shotState.tilt,

    stop:
      shotState.stop,

    fps:
      sceneState.fps,

    shutter:
      sceneState.shutter,

    iso:
      sceneState.iso,

    colorTemp:
      sceneState.colorTemp,

    lut:
      sceneState.lut,

    resolution:
      sceneState.resolution,

    format:
      sceneState.format,

    aspectRatio:
      sceneState.aspectRatio,

    note:
      document.getElementById("note").value

  };


  // -------------------------
  // Save log locally
  // -------------------------

  await saveLogToDB(take);


  // Keep local memory in sync

  logs.push(take);


  renderHistory();


  // -------------------------
  // Clear Take fields
  // -------------------------

  document.getElementById("take").value = "";

  // IMPORTANT:
  // ROLL is intentionally NOT cleared.

  document.getElementById("clip").value = "";

  document.getElementById("note").value = "";


  console.log(
    "Take saved:",
    take
  );

}


// ============================================
// RENDER LOG HISTORY
// ============================================

function renderHistory() {

  const container =
    document.getElementById(
      "logHistory"
    );


  if (!container) return;


  container.innerHTML = "";


  if (logs.length === 0) {

    container.innerHTML =
      '<p class="empty">No logs yet.</p>';

    return;

  }


  const reversed =
    [...logs].reverse();


  reversed.forEach(function (log) {

    const item =
      document.createElement("div");


    item.style.padding =
      "12px 0";


    item.style.borderBottom =
      "1px solid #333";


    item.innerHTML = `

      <strong>

        Scene ${log.scene || "—"}

        / Shot ${log.shot || "—"}

      </strong>

      <br>

      <span style="color:#999">

        Take ${log.take || "—"}

        &nbsp;&nbsp;

        Roll ${log.roll || "—"}

        &nbsp;&nbsp;

        Clip ${log.clip || "—"}

      </span>

    `;


    container.appendChild(item);

  });

}


// ============================================
// NEW PROJECT
// ============================================

async function newProject() {

  const confirmed =
    confirm(
      "Start a new project?\n\n" +
      "Current project information and " +
      "current setup will be cleared."
    );


  if (!confirmed) return;


  // -------------------------
  // Clear Project
  // -------------------------

  document.getElementById("date").value = "";

  document.getElementById("project").value = "";

  document.getElementById("director").value = "";

  document.getElementById("dp").value = "";

  document.getElementById("camera").value = "";


  // -------------------------
  // Clear Scene
  // -------------------------

  document.getElementById("scene").value = "";

  document.getElementById("fps").value = "";

  document.getElementById("shutter").value = "";

  document.getElementById("iso").value = "";

  document.getElementById("colorTemp").value = "";

  document.getElementById("lut").value = "";

  document.getElementById("resolution").value = "";

  document.getElementById("format").value = "";

  document.getElementById("aspectRatio").value = "";


  // -------------------------
  // Clear Shot
  // -------------------------

  document.getElementById("shot").value = "";

  document.getElementById("lens").value = "";

  document.getElementById("filters").value = "";

  document.getElementById("focus").value = "";

  document.getElementById("height").value = "";

  document.getElementById("tilt").value = "";

  document.getElementById("stop").value = "";


  // -------------------------
  // Clear Take
  // -------------------------

  document.getElementById("take").value = "";

  document.getElementById("roll").value = "";

  document.getElementById("clip").value = "";

  document.getElementById("note").value = "";


  // -------------------------
  // Reset states
  // -------------------------

  projectState = {

    date: "",
    project: "",
    director: "",
    dp: "",
    camera: ""

  };


  sceneState = {

    scene: "",

    fps: "",
    shutter: "",
    iso: "",
    colorTemp: "",
    lut: "",
    resolution: "",
    format: "",
    aspectRatio: ""

  };


  shotState = {

    shot: "",

    lens: "",
    filters: "",
    focus: "",
    height: "",
    tilt: "",
    stop: ""

  };


  // -------------------------
  // Clear current state DB
  // -------------------------

  await saveStateToDB();


  // -------------------------
  // Update display
  // -------------------------

  updateCurrentProject();

  updateCurrentScene();

  updateCurrentShot();


  console.log(
    "New project started."
  );

}
