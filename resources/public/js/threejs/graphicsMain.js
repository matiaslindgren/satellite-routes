"use strict";

// TODO refactor all program state global variables
// into one state-dictionary

// check for WebGL support
if (!Detector.webgl) {
  Detector.addGetWebGLMessage();
  document.getElementById("graphics-container").innerHTML = "";
}

// Map with different planet radiuses, textures etc.
var PLANET_PARAMETERS = {
  earth: {
    name: "EARTH",
    radius: 6371.0,
    textures_HIGHRES: {
      mainTexture: "img/NASA_earth_july_HIGHRES.png",
      bumpMap: "img/NASA_earth_bump_HIGHRES.png"
    },
    textures_LOWRES: {
      mainTexture: "img/NASA_earth_july_LOWRES.png",
      bumpMap: "img/NASA_earth_bump_LOWRES.png"
    },
    ambientLight: 0.4,
    starLight: 1.0,
  },
  jupiter: {
    name: "JUPITER",
    radius: 69911.0,
    textures_LOWRES: {
      mainTexture: "img/4kjupiter.jpg"
    },
    ambientLight: 0.2,
    starLight: 0.8,
  },
  mars: {
    name: "MARS",
    radius: 3389.5,
    textures_LOWRES: {
      mainTexture: "img/MarsV3-Shaded-2k.jpg"
    },
    ambientLight: 0.5,
    starLight: 1.2,
  }
};

function toggleObjectsVisible(objectArray) {
  objectArray.forEach(function(element) {
    element.visible = !element.visible;
  });
}
function toggleMeridians() {
  toggleObjectsVisible(meridians);
}
function toggleSatellites() {
  toggleObjectsVisible(satelliteMeshes);
}
function toggleSatelliteConnections() {
  toggleObjectsVisible(satelliteConnections);
}
function toggleCoordinateAxes() {
  axisHelper.visible = !axisHelper.visible;
  axisHelperNeg.visible = !axisHelperNeg.visible;
}
function toggleSolutionPath() {
  var colorHex = satellitesGUI.showShortestPath ? 0x00ff00 : 0xff6600;
  connectionPath.forEach(function(element) {
    element.material.color.setHex(colorHex);
  });
}
function toggleMoveEndpoints(startListener) {

  if (startListener) {
    // Toggle mouse listener
    $("#graphics-container").on("mousemove", onMouseMove);

    // Make the endpoints glow like neon lights
    start.material.emissiveIntensity = 1;
    end.material.emissiveIntensity = 1;

  } else {
    // We don't want to generate thousands of unused events
    $("#graphics-container").off("mousemove");

    // Revert to normal color
    start.material.emissiveIntensity = 0;
    end.material.emissiveIntensity = 0;
  }
}


function removeGraphicsObjects(array) {
  // Removes all Object3D instances in array from the scene.
  // Assumes all instances are children of the scene.
  array.forEach(function(element) {
    scene.remove(element);
  });
}

var scene, camera, renderer;
var gui, controls, stats;

function init() {

  scene = new THREE.Scene();

  var innerwidth = window.innerWidth;
  var innerheight = window.innerHeight;

  camera = new THREE.PerspectiveCamera(
      70,
      innerwidth/innerheight,
      1,
      1000000
  );
  camera.up = new THREE.Vector3(0, 0, 1);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(innerwidth, innerheight);

  var graphicsContainer = document.getElementById("graphics-container");
  graphicsContainer.appendChild(renderer.domElement);

  // Load contents for canvas
  loadGUI();
  loadPlanet(PLANET_PARAMETERS.earth);

  // Move camera with mouse
  controls = new THREE.OrbitControls(camera, renderer.domElement);

  // FPS monitoring
  stats = new Stats();
  stats.showPanel(0);

  $("#stats-container").append(stats.dom);

}

var satellitesGUI;

function loadGUI() {

  var SatelliteSystem = function() {
    this.satelliteCount = 5;
    this.minAltitude = 300.0;
    this.maxAltitude = 700.0;

    this.generateSatellites = function() {

      $.getJSON(
        "generator.json",
        { satelliteCount: this.satelliteCount,
          minAltitude: this.minAltitude,
          maxAltitude: this.maxAltitude,
          planetRadius: PLANET_PARAMETERS[this.planetName.toLowerCase()].radius,
          start: start.position.toArray(),
          end: end.position.toArray() },
        function(response) { loadSatellites(response); }
      );
    }

    this.altitude = 0.0;
    this.polyhedron = "cube";

    this.generateConstellation = function() {
      // Request generation of polyhedron coordinates from server
      // and load satellites at the returned coordinates.
      // Also sends the current start and end positions.

      $.getJSON(
        "generator.json",
        { polyhedron: this.polyhedron,
          altitude: this.altitude,
          planetRadius: PLANET_PARAMETERS[this.planetName.toLowerCase()].radius,
          start: start.position.toArray(),
          end: end.position.toArray() },
        function(response) { loadSatellites(response); }
      );
    }


    this.moveEndpointsMode = false;

    this.showSatellites = true;
    this.showConnections = true;
    this.showShortestPath = true;

    this.planetName = "Earth";
    this.showAxes = false;
    this.showMeridians = false;

    this.redraw = function(planetName) {
      // Redraw everything

      while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }

      controls.reset();

      switch(planetName) {
        case "Jupiter":
          console.log("redraw Jupiter");
          loadPlanet(PLANET_PARAMETERS.jupiter);
          break;
        case "Mars":
          console.log("redraw Mars");
          loadPlanet(PLANET_PARAMETERS.mars);
          break;
        default:
          console.log("redraw default: Earth");
          loadPlanet(PLANET_PARAMETERS.earth);
          break;
      }
    };

  };

  satellitesGUI = new SatelliteSystem();

  gui = new dat.GUI({ autoPlace: false, width: 300 });
  $("#gui-container").append(gui.domElement);
  //$("#gui-container").draggable(); //renders the gui unusable,
  //needs a drag area

  // FILL THE DAT GUI

  var satFolder = gui.addFolder("Satellites");

  satFolder.add(satellitesGUI, "showSatellites")
    .onChange(toggleSatellites);
  satFolder.add(satellitesGUI, "showConnections")
    .onChange(toggleSatelliteConnections);
  satFolder.add(satellitesGUI, "showShortestPath")
    .onChange(toggleSolutionPath);

  var randSatFl = satFolder.addFolder("Random generation");
  var constellationFl = satFolder.addFolder("Constellations");
  var validPolyhedrons = [
    "tetrahedron",
    "cube",
    "octahedron",
    "dodecahedron",
    "icosahedron"
  ];

  randSatFl.add(satellitesGUI, "satelliteCount", 0, 100).step(1);
  randSatFl.add(satellitesGUI, "minAltitude", 0, 49999).step(1);
  randSatFl.add(satellitesGUI, "maxAltitude", 1, 50000).step(1);
  randSatFl.add(satellitesGUI, "generateSatellites");

  constellationFl.add(satellitesGUI, "altitude", 0, 50000).step(1);
  constellationFl.add(satellitesGUI, "polyhedron", validPolyhedrons);
  constellationFl.add(satellitesGUI, "generateConstellation");

  var callFolder = gui.addFolder("Move endpoints");

  callFolder.add(satellitesGUI, "moveEndpointsMode")
    .onChange(toggleMoveEndpoints);

  var planetFolder = gui.addFolder("Planet");
  var validPlanets = [
    "Earth",
    "Mars",
    "Jupiter"
  ];

  planetFolder.add(satellitesGUI, "planetName", validPlanets)
    .onChange(satellitesGUI.redraw);
  planetFolder.add(satellitesGUI, "showAxes")
    .onChange(toggleCoordinateAxes);
  planetFolder.add(satellitesGUI, "showMeridians")
    .onChange(toggleMeridians);


  console.log("controls loaded");
}

var satelliteMeshes = [];
var satelliteConnections = [];
var connectionPath = [];

function loadSatellites(data) {
  /*
   * Constructs the graphical representation from satellite data.
   * Start and end points should be provided with the satellites.
   */

  if (satelliteMeshes.length > 0) {
    removeGraphicsObjects(satelliteMeshes);
    satelliteMeshes = [];
  }
  if (satelliteConnections.length > 0) {
    removeGraphicsObjects(satelliteConnections);
    satelliteConnections = [];
  }
  if (connectionPath.length > 0) {
    removeGraphicsObjects(connectionPath);
    connectionPath = [];
  }

  var sat_size = 150;
  var geometry;
  var material;

  var planetCenter = new THREE.Vector3(0, 0, 0);

  data.nodes.forEach(function(element, index) {

    if (element.name === "START" || element.name === "END")
      geometry = new THREE.BoxGeometry(0, 0, 0);
    else
      geometry = new THREE.BoxGeometry(sat_size, sat_size, sat_size);
    material = new THREE.MeshLambertMaterial({ color: 0xcc0099 });

    var satellite = new THREE.Mesh(geometry, material);
    satellite.name = element.name;
    satellite.position.fromArray(element.pos);
    satellite.visible = satellitesGUI.showSatellites;
    satellite.lookAt(planetCenter);

    satelliteMeshes.push(satellite);
    scene.add(satellite);

  });

  satelliteConnections.needsServerUpdate = false;

  // CONNECTIONS BETWEEN SATELLITES

  var line_geometry;

  data.edges.forEach(function(element, index) {

    line_geometry = new THREE.Geometry();
    line_geometry.vertices.push(
        new THREE.Vector3().fromArray(element[0].pos),
        new THREE.Vector3().fromArray(element[1].pos)
    );

    var line_material = new THREE.LineBasicMaterial({ color: 0xff6600 });
    var line = new THREE.Line(line_geometry, line_material);

    line.visible = satellitesGUI.showConnections;

    if (element[3].is_solution_path)
      connectionPath.push(line);

    satelliteConnections[index] = line;

    scene.add(line);
  });

  if (satellitesGUI.showShortestPath)
    toggleSolutionPath();

  console.log("satellites loaded");
}

var planet;
function loadPlanet(planetData) {

  var planetRadius = 0;
  if (planetData.radius) {
    planetRadius = planetData.radius;
  }

  var planetGeometry = new THREE.SphereGeometry(planetRadius, 32, 32);

  var planetMaterial = null;
  var textureLoader = new THREE.TextureLoader();

  var planetTextures = planetData.textures_LOWRES;

  if (planetTextures.mainTexture) {
    planetMaterial = new THREE.MeshPhongMaterial({
      map: textureLoader.load(planetTextures.mainTexture)
    });
    console.log("planet texture loaded");
  } else {
    console.warn("no texture for planet found, rendering with empty texture");
    planetMaterial = new THREE.MeshPhongMaterial();
  }

  if (planetTextures.bumpMap) {
    planetMaterial.bumpMap = textureLoader.load(planetTextures.bumpMap);
    planetMaterial.bumpScale = planetRadius*0.02;
  }
  if (planetTextures.specularMap) {
    planetMaterial.specularMap = textureLoader.load(planetTextures.specularMap);
  }
  if (planetTextures.normalMap) {
    planetMaterial.normalMap = textureLoader.load(planetTextures.normalMap);
  }

  planet = new THREE.Mesh(planetGeometry, planetMaterial);
  planet.planetName = planetData.name;

  // tweaks to get the axes, equator and the prime meridian correct
  var half_PI = 0.5*Math.PI;
  planet.rotateY(-1.525);
  planet.rotateY(half_PI);
  planet.rotateX(half_PI);

  camera.position.x = 1.5*planetRadius;
  camera.position.y = 1.5*planetRadius;
  camera.position.z = 0;

  scene.add(planet);

  loadMeridians(planetData.radius);
  loadCoordinateAxes(planetData.radius);

  loadEndpoints(planetData.radius, planet);

  loadLights(
    planetData.radius,
    planetData.ambientLight,
    planetData.starLight
  );

  console.log(planetData.name + " loaded");
}

var meridians = [];

function loadMeridians(planetRadius) {

  var circleRadius = 1.01*planetRadius;
  var circleCurve = new THREE.EllipseCurve(
      0, 0,
      circleRadius, circleRadius,
      0, 2*Math.PI,
      false,
      0
  );

  var path = new THREE.Path(circleCurve.getPoints(250));
  var circleGeometry = path.createPointsGeometry(50);
  var meridianMaterial = new THREE.LineBasicMaterial({color : 0xff00ff});

  var primeMeridian = new THREE.Line(circleGeometry, meridianMaterial);
  var equator = new THREE.Line(circleGeometry, meridianMaterial);
  equator.rotateX(Math.PI/2);

  primeMeridian.visible = equator.visible = satellitesGUI.showMeridians;

  scene.add(primeMeridian);
  scene.add(equator);

  console.log("equator and prime meridian loaded");


  meridians.push(primeMeridian);
  meridians.push(equator);


}

var ambientLight;
var starLight;

function loadLights(planetRadius, ambientBrightness, starBrightness) {

  ambientLight = new THREE.AmbientLight( 0xffffff, ambientBrightness );
  scene.add(ambientLight);

  starLight = new THREE.PointLight( 0xffffff, starBrightness, 0 );
  starLight.position.set( 4*planetRadius, 4*planetRadius, 4*planetRadius);
  scene.add(starLight);

  console.log("lights loaded");
}

// COORDINATE SYSTEM
// X: RED
// Y: GREEN
// Z: BLUE

var axisHelper;
var axisHelperNeg;
function loadCoordinateAxes(planetRadius) {

  axisHelper = new THREE.AxisHelper(3*planetRadius);
  axisHelper.visible = satellitesGUI.showAxes;

  axisHelperNeg = new THREE.AxisHelper(3*planetRadius);
  axisHelper.geometry.scale(-1, -1, -1);
  axisHelperNeg.visible = satellitesGUI.showAxes;

  scene.add(axisHelper);
  scene.add(axisHelperNeg);

  console.log("coordinate axes loaded");
}

// ENDPOINTS OF CALL ROUTE
// START: GREEN
// END: PURPLE

var start, end;
function loadEndpoints(planetRadius, planetMesh) {

  // Cones to model start and end points
  var geometry = new THREE.CylinderGeometry(planetRadius/120, 0, planetRadius/20);
  // Pointy end towards planet surface
  geometry.rotateX(Math.PI/2);
  // Lift slightly up from the surface
  geometry.translate(0, 0, 125);

  // Green for start, purple for end
  var materialStart = new THREE.MeshPhongMaterial({
                        color: 0x339933,
                        emissive: 0x00ff00,
                        emissiveIntensity: 0
                    });
  var materialEnd = new THREE.MeshPhongMaterial({
                      color: 0x0000ff,
                      emissive: 0x00ffff,
                      emissiveIntensity: 0
                    });

  start = new THREE.Mesh(geometry, materialStart);
  end = new THREE.Mesh(geometry, materialEnd);

  var startPos, endPos;

  if (planetMesh.planetName === "EARTH") {
    // Helsinki to Copenhagen
    startPos = new THREE.Vector3(3093.2, 1314.1, 5400);
    endPos = new THREE.Vector3(3768.8, 747.6, 5074.2);
  } else {
    startPos = new THREE.Vector3(planetRadius, 0, 0);
    endPos = new THREE.Vector3(-planetRadius, 0, 0);
  }

  start.position.set(0, 0, 0);
  start.lookAt(startPos);
  start.position.copy(startPos);

  end.position.set(0, 0, 0);
  end.lookAt(endPos);
  end.position.copy(endPos);

  scene.add(start);
  scene.add(end);

  console.log("endpoints loaded");

}

// ENDPOINT DRAGGING MECHANISM
// Enables and disables mouse listeners.

var MOUSE_POS = new THREE.Vector2();
var DRAG_OBJECT = {};

function onMouseMove(event) {

  event.preventDefault();

  // Relative position because there's a navbar above the canvas
  // Take also relative of x in case a vertical navbar is added
  var graphicsContainer = $("#graphics-container");
  var relativeX = event.clientX - graphicsContainer.offset().left;
  var relativeY = event.clientY - graphicsContainer.offset().top;

  MOUSE_POS.x = (relativeX/renderer.domElement.clientWidth)*2 - 1;
  MOUSE_POS.y = -(relativeY/renderer.domElement.clientHeight)*2 + 1;

  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(MOUSE_POS, camera);

  var intersectPlanet = raycaster.intersectObject(planet);

  if (!$.isEmptyObject(DRAG_OBJECT)) {
    if (intersectPlanet.length > 0) {
      // Move pointer where the mouse is dragged

      DRAG_OBJECT.pointer.position.set(0,0,0);
      var planetMesh = intersectPlanet[0];
      var faceNormal = planetMesh.face.normal;
      // Flip z axis and swap it with the y axis
      var lookAtVec = new THREE.Vector3(faceNormal.x, -faceNormal.z, faceNormal.y);
      DRAG_OBJECT.pointer.lookAt(lookAtVec);
      DRAG_OBJECT.pointer.position.copy(planetMesh.point);

      satelliteMeshes.needsServerUpdate = true;

    }
    return;
  }

  var intersectPointer = raycaster.intersectObjects([start, end]);

  if (intersectPointer.length > 0 && intersectPlanet.length > 0) {
    // Raycaster intersects a pointer and the planet
    // Enable dragging pointer across planet surface by mousedown

    intersectPointer[0].object.material.emissiveIntensity = 0;

    if (controls.enabled) {
      // Start listening on mousedown for dragging the pointers
      controls.enabled = false;
      $("#graphics-container").on(
          "mousedown",
          onMouseDownDrag
        );
      $("#graphics-container").on(
          "mouseup",
          onMouseUpDrag
        );
    }

  } else {

    if ($.isEmptyObject(DRAG_OBJECT) && !controls.enabled) {
      // Dragging finished, remove listeners and update satellite edges
      controls.enabled = true;
      $("#graphics-container").off("mousedown");
      $("#graphics-container").off("mouseup");

      if (satelliteMeshes.needsServerUpdate) {

        var satellitePositions = new Array();

        satelliteMeshes.forEach(function(element) {

          var position;

          if (element.name === "START") {
            position = start.position.toArray();
          } else if (element.name === "END") {
            position = end.position.toArray();
          } else {
            position = element.position.toArray();
          }

          satellitePositions.push({
            name: element.name,
            pos: position
          });

        });
        var planetRadius = PLANET_PARAMETERS[satellitesGUI.planetName.toLowerCase()].radius;
        var requestData = {
          planetRadius: planetRadius,
          satellites: satellitePositions
        };
        var stringifiedData = JSON.stringify(requestData);
        $.getJSON(
            "solve.json",
            stringifiedData,
            function(response) {
              if (response.parseError) {
                console.warn("solve.json ERROR: ", response.parseError);
              } else {
                loadSatellites(response);
              }
            }
            );
        satelliteMeshes.needsServerUpdate = false;
      }

    }

    if (start.material.emissiveIntensity < 1)
      start.material.emissiveIntensity = 1;
    if (end.material.emissiveIntensity < 1)
      end.material.emissiveIntensity = 1;

  }

}

// When mousedown is detected, updates the DRAG_OBJECT contents with
// the current objects under the mouse.
function onMouseDownDrag() {

  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(MOUSE_POS, camera);

  var intersectPointer = raycaster.intersectObjects([start, end]);
  var intersectPlanet = raycaster.intersectObject(planet);

  if (intersectPointer.length > 0) {
    DRAG_OBJECT.pointer = intersectPointer[0].object;
  }
  if (intersectPlanet.length > 0) {
    DRAG_OBJECT.planetMesh = intersectPlanet[0];
  }

}

// When mouseup is detected, stop dragging.
function onMouseUpDrag() {
  DRAG_OBJECT = {};
}

function render() {
  requestAnimationFrame(render);

  stats.begin();
  renderer.render(scene, camera);
  stats.end();
}

window.addEventListener('resize', function () {
  // Update canvas if the user resizes their window
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

init();
render();
