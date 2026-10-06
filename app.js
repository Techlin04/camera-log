// ================================
// CAMERA LOG - BASIC UI LOGIC
// ================================


// ---------- Current Project ----------

let projectState = {
  date: "",
  project: "",
  director: "",
  dp: "",
  camera: ""
};


// ---------- Current Scene ----------

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


// ---------- Current Shot ----------

let shotState = {
  shot: "",

  lens: "",
  filters: "",
  focus: "",
  height: "",
  tilt: "",
  stop: ""
};


// ---------- Log History ----------

let logs = [];


// ==================================
// INITIALIZE
// ==================================

document.addEventListener("DOMContentLoaded", function () {

  console.log("Camera Log App loaded");

});


// ==================================
// TOGGLE SECTION
// ==================================

function toggleSection(id) {

  const element = document.getElementById(id);

  if (!element) return;

  if (element.style.display === "none") {
    element.style.display = "";
  } else {
    element.style.display = "none";
  }

}


// ==================================
// EDIT SCENE
// ==================================

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

  updateCurrentScene();

}


// ==================================
// EDIT SHOT
// ==================================

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

  updateCurrentShot();

}


// ==================================
// UPDATE CURRENT SCENE DISPLAY
// ==================================

function updateCurrentScene() {

  const sceneElement =
    document.getElementById("currentScene");

  sceneElement.textContent =
    sceneState.scene || "—";

}


// ==================================
// UPDATE CURRENT SHOT DISPLAY
// ==================================

function updateCurrentShot() {

  const shotElement =
    document.getElementById("currentShot");

  shotElement.textContent =
    shotState.shot || "—";

}


// ==================================
// SAVE TAKE
// ==================================

function saveTake() {

  // Save Project information

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


  // Save Scene information

  editScene();


  // Save Shot information

  editShot();


  // Create Take record

  const take = {

    date: projectState.date,

    project: projectState.project,

    director: projectState.director,

    dp: projectState.dp,

    camera: projectState.camera,

    scene: sceneState.scene,

    shot: shotState.shot,

    take:
      document.getElementById("take").value,

    roll:
      document.getElementById("roll").value,

    clip:
      document.getElementById("clip").value,

    lens: shotState.lens,

    filters: shotState.filters,

    focus: shotState.focus,

    height: shotState.height,

    tilt: shotState.tilt,

    stop: shotState.stop,

    fps: sceneState.fps,

    shutter: sceneState.shutter,

    iso: sceneState.iso,

    colorTemp: sceneState.colorTemp,

    lut: sceneState.lut,

    resolution: sceneState.resolution,

    format: sceneState.format,

    aspectRatio: sceneState.aspectRatio,

    note:
      document.getElementById("note").value

  };


  // Add to history

  logs.push(take);


  // Display history

  renderHistory();


  // Clear Take fields ONLY

  document.getElementById("take").value = "";

  document.getElementById("roll").value = "";

  document.getElementById("clip").value = "";

  document.getElementById("note").value = "";


  console.log("Take saved:", take);

}


// ==================================
// RENDER LOG HISTORY
// ==================================

function renderHistory() {

  const container =
    document.getElementById("logHistory");

  container.innerHTML = "";


  if (logs.length === 0) {

    container.innerHTML =
      '<p class="empty">No logs yet.</p>';

    return;

  }


  // Newest first

  const reversed =
    [...logs].reverse();


  reversed.forEach(function (log) {

    const item =
      document.createElement("div");


    item.style.padding = "12px 0";

    item.style.borderBottom =
      "1px solid #333";


    item.innerHTML = `

      <strong>
        Scene ${log.scene}
        / Shot ${log.shot}
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


// ==================================
// NEW PROJECT
// ==================================

function newProject() {

  const confirmed =
    confirm(
      "Start a new project?\n\n" +
      "Current project information will be cleared."
    );


  if (!confirmed) return;


  // Clear Project

  document.getElementById("date").value = "";

  document.getElementById("project").value = "";

  document.getElementById("director").value = "";

  document.getElementById("dp").value = "";

  document.getElementById("camera").value = "";


  // Clear Scene

  document.getElementById("scene").value = "";

  document.getElementById("fps").value = "";

  document.getElementById("shutter").value = "";

  document.getElementById("iso").value = "";

  document.getElementById("colorTemp").value = "";

  document.getElementById("lut").value = "";

  document.getElementById("resolution").value = "";

  document.getElementById("format").value = "";

  document.getElementById("aspectRatio").value = "";


  // Clear Shot

  document.getElementById("shot").value = "";

  document.getElementById("lens").value = "";

  document.getElementById("filters").value = "";

  document.getElementById("focus").value = "";

  document.getElementById("height").value = "";

  document.getElementById("tilt").value = "";

  document.getElementById("stop").value = "";


  // Clear Take

  document.getElementById("take").value = "";

  document.getElementById("clip").value = "";

  document.getElementById("note").value = "";


  // Reset states

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


  logs = [];


  updateCurrentScene();

  updateCurrentShot();

  renderHistory();


  document.getElementById("currentProject")
    .textContent = "No Project";

}
