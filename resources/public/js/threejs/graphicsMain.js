"use strict";

// TODO refactor all program state global variables
// into one state-dictionary

// check for WebGL support
if (!Detector.webgl) {
  Detector.addGetWebGLMessage();
  document.getElementById("graphics-container").innerHTML = "";
}

// Map with different planet radiuses, textures etc.
// Could be moved into a database in the backend if there's many of these
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
  }
};


//all toggles could be merged into one toggle function taking an array as
//parameter
function toggleObjectsVisible(objectArray) {
  objectArray.forEach(function(element) {
    element.visible = !element.visible;
  });
}

function toggleSatelliteConnections() {
  satelliteConnections.forEach(function(element) {
    element.visible = !element.visible;
  });
}
function toggleSatellites() {
  satelliteMeshes.forEach(function(element) {
    element.visible = !element.visible;
  });
}
function toggleEquator() {
  equator[0].visible = !equator[0].visible;
  equator[1].visible = !equator[1].visible;
}
function togglePrimeMeridian() {
  primeMeridian[0].visible = !primeMeridian[0].visible;
  primeMeridian[1].visible = !primeMeridian[1].visible;
}
function toggleCoordinateAxes() {
  x_axis.visible = !x_axis.visible;
  y_axis.visible = !y_axis.visible;
  z_axis.visible = !z_axis.visible;
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
var gui, controls;

var camera_far_frustum;

function init() {

  scene = new THREE.Scene();

  var innerwidth = window.innerWidth;
  var innerheight = window.innerHeight;

  camera_far_frustum = 100000;

  camera = new THREE.PerspectiveCamera(
      70,
      innerwidth/innerheight,
      1,
      camera_far_frustum
  );

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(innerwidth, innerheight);

  var graphicsContainer = document.getElementById("graphics-container");
  graphicsContainer.appendChild(renderer.domElement);

  loadGUI();
  loadPlanet(PLANET_PARAMETERS.earth);
  loadCoordinateAxes(); // replace with THREE.AxisHelper

  controls = new THREE.OrbitControls(camera, renderer.domElement);

}

var satellitesGUI;

function loadGUI() {

  // TODO: add a reset camera button to center the earth back to 0 0 0

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
          planetRadius: -1, // Currently not an option, -1 defaults to Earth
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
          planetRadius: -1, // Currently not an option, -1 defaults to Earth
          start: start.position.toArray(),
          end: end.position.toArray() },
        function(response) { loadSatellites(response); }
      );
    }

    this.redraw = function() {
      // Redraw planet textures

      // TODO remove ambient light and sun
      removeGraphicsObjects([ planet, equator, primeMeridian ]);

      switch(this.planetName) {
        //case "Mars":
          //break;
        //case "Arda":
          //break;
        default:
          console.log("redraw default: Earth");
          loadPlanet(PLANET_PARAMETERS.earth);
          break;
      }
    };

    this.moveEndpointsMode = false;

    this.showSatellites = true;
    this.showConnections = true;
    this.showShortestPath = true;

    this.planetName = "Earth";
    this.showAxes = false;
    this.showEquator = false;
    this.showPrimeMeridian = false;
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

  var callFolder = gui.addFolder("Call");

  callFolder.add(satellitesGUI, "moveEndpointsMode")
    .onChange(toggleMoveEndpoints, satellitesGUI.moveEndpointsMode);

  var planetFolder = gui.addFolder("Planet");

  planetFolder.add(satellitesGUI, "planetName", [ "Earth" ]);
  planetFolder.add(satellitesGUI, "redraw");
  planetFolder.add(satellitesGUI, "showAxes")
    .onChange(toggleCoordinateAxes);
  planetFolder.add(satellitesGUI, "showEquator")
    .onChange(toggleEquator);
  planetFolder.add(satellitesGUI, "showPrimeMeridian")
    .onChange(togglePrimeMeridian);


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

  // The mobileTextures boolean variable is defined in graphics_content.html
  // template and gets its value depending on the choice in the dropdown menu
  // TODO: this could be removed completely and only use some light-medium
  // textures
  var planetTextures;
  if (!mobileTextures) {
    planetTextures = planetData.textures_HIGHRES;
  } else {
    planetTextures = planetData.textures_LOWRES;
  }

  if (planetTextures.mainTexture) {
    planetMaterial = new THREE.MeshPhongMaterial({
      map: textureLoader.load(planetTextures.mainTexture)
    });
  } else {
    console.log("no texture for planet found, rendering with empty texture.");
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

  if (planetData.name == "EARTH") {
    // earth tweaks to get the axes, equator and the prime meridian correct
    var half_PI = 0.5*Math.PI;
    planet.rotateY(-1.525);
    planet.rotateY(half_PI);
    planet.rotateX(half_PI);
  }

  camera.up = new THREE.Vector3(0, 0, 1);
  camera.position.x = 1.5*planetRadius;
  camera.position.y = 1.5*planetRadius;
  camera.position.z = 0;

  scene.add(planet);

  loadEquator(planetData.radius);
  loadPrimeMeridian(planetData.radius);

  loadEndpoints(planetData.radius, planet);

  loadLights(
    planetData.radius,
    planetData.ambientLight,
    planetData.starLight
  );

  console.log(planetData.name + " loaded");
}


var equator = [];

function loadEquator(planetRadius) {
  // redo this, bezier curves is probably not the best approach

  // heuristic to get bezier approximations of circles correct
  var c = 1.34*planetRadius;

  var equatorMaterial = new THREE.LineBasicMaterial({color : 0xff00ff});

  var equator1 = new THREE.CubicBezierCurve3(
      new THREE.Vector3(planetRadius + 5, 0, 0),
      new THREE.Vector3(planetRadius + 5, c, 0),
      new THREE.Vector3(-planetRadius - 5, c, 0),
      new THREE.Vector3(-planetRadius - 5, 0, 0)
  );
  var equatorGeom1 = new THREE.Geometry();
  equatorGeom1.vertices = equator1.getPoints(50);
  equator[0] = new THREE.Line(equatorGeom1, equatorMaterial);

  var equator2 = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-planetRadius - 5, 0, 0),
      new THREE.Vector3(-planetRadius - 5, -c, 0),
      new THREE.Vector3(planetRadius + 5, -c, 0),
      new THREE.Vector3(planetRadius + 5, 0, 0)
  );
  var equatorGeom2 = new THREE.Geometry();
  equatorGeom2.vertices = equator2.getPoints(50);
  equator[1] = new THREE.Line(equatorGeom2, equatorMaterial);

  equator[0].visible = satellitesGUI.showEquator;
  equator[1].visible = satellitesGUI.showEquator;

  scene.add(equator[0]);
  scene.add(equator[1]);

  console.log("equator loaded");

}

var primeMeridian = [];

function loadPrimeMeridian(planetRadius) {
  // redo this, bezier curves is probably not the best approach

  // heuristic to get bezier approximations of circles correct
  var c = 1.34*planetRadius;

  var meridianMaterial = new THREE.LineBasicMaterial({color : 0xff00ff});

  var meridian1 = new THREE.CubicBezierCurve3(
      new THREE.Vector3(planetRadius + 5, 0, 0),
      new THREE.Vector3(planetRadius + 5, 0, c),
      new THREE.Vector3(-planetRadius - 5, 0, c),
      new THREE.Vector3(-planetRadius - 5, 0, 0)
  );
  var meridianGeom1 = new THREE.Geometry();
  meridianGeom1.vertices = meridian1.getPoints(50);

  primeMeridian[0] = new THREE.Line(meridianGeom1, meridianMaterial);

  var meridian2 = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-planetRadius - 5, 0, 0),
      new THREE.Vector3(-planetRadius - 5, 0, -c),
      new THREE.Vector3(planetRadius + 5, 0, -c),
      new THREE.Vector3(planetRadius + 5, 0, 0)
  );
  var meridianGeom2 = new THREE.Geometry();
  meridianGeom2.vertices = meridian2.getPoints(50);

  primeMeridian[1] = new THREE.Line(meridianGeom2, meridianMaterial);

  primeMeridian[0].visible = satellitesGUI.showPrimeMeridian;
  primeMeridian[1].visible = satellitesGUI.showPrimeMeridian;

  scene.add(primeMeridian[0]);
  scene.add(primeMeridian[1]);

  console.log("prime meridian loaded");

}

// TODO: redraw planet currently ignores this function
function loadLights(planetRadius, ambientBrightness, starBrightness) {

  var ambientLight = new THREE.AmbientLight( 0xffffff, ambientBrightness );
  scene.add( ambientLight );

  var star = new THREE.PointLight( 0xffffff, starBrightness, 0 );
  star.position.set( 4*planetRadius, 4*planetRadius, 4*planetRadius);
  scene.add(star);

  console.log("lights loaded");
}




// COORDINATE SYSTEM
//
//
// THIS CAN BE REPLACED WITH THREE.AxisHelper
//
//
// X: RED
// Y: GREEN
// Z: BLUE

var x_axis;
var y_axis;
var z_axis;

function loadCoordinateAxes() {
  var x_material = new THREE.LineBasicMaterial({
    color: 0xff0000
  });
  var y_material = new THREE.LineBasicMaterial({
    color: 0x00ff00
  });
  var z_material = new THREE.LineBasicMaterial({
    color: 0x0000ff
  });
  var x_axis_geom = new THREE.Geometry();
  x_axis_geom.vertices.push(
      new THREE.Vector3( -camera_far_frustum, 0, 0),
      new THREE.Vector3( camera_far_frustum, 0, 0)
  );

  var y_axis_geom = new THREE.Geometry();
  y_axis_geom.vertices.push(
      new THREE.Vector3( 0, -camera_far_frustum, 0),
      new THREE.Vector3( 0, camera_far_frustum, 0)
  );
  var z_axis_geom = new THREE.Geometry();
  z_axis_geom.vertices.push(
      new THREE.Vector3( 0, 0, -camera_far_frustum),
      new THREE.Vector3( 0, 0, camera_far_frustum)
  );

  x_axis = new THREE.Line(x_axis_geom, x_material);
  y_axis = new THREE.Line(y_axis_geom, y_material);
  z_axis = new THREE.Line(z_axis_geom, z_material);

  x_axis.visible = y_axis.visible = z_axis.visible = satellitesGUI.showAxes;

  scene.add(x_axis);
  scene.add(y_axis);
  scene.add(z_axis);

  console.log("coordinate axes loaded");
}

function getBezierVertices(start, end) {
  // Returns a new set of points for a Bezier curve geometry
  // Used for dynamic updating of the Bezier curve

  var bezierMiddle = new THREE.Vector3().add(start).add(end);

  // Heuristic to approximate an aerial path from start to end as a Bezier
  // curve
  // Is currently doing a poor job
  var planetRadius = PLANET_PARAMETERS.earth.radius;
  var c = 0.15*Math.pow(start.distanceTo(end), 1.15);
  bezierMiddle.setLength(planetRadius + c);

  var bezierCurve = new THREE.QuadraticBezierCurve3(start, bezierMiddle, end);

  return bezierCurve.getPoints(50);
}

var start, end;
var startEndConnection;

function loadEndpoints(planetRadius, planetMesh) {

  // Cones to model start and end points
  var geometry = new THREE.CylinderGeometry(planetRadius/120, 0, planetRadius/20);
  // Pointy end towards earth
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

  var HelsinkiPos = new THREE.Vector3(3093.2, 1314.1, 5400);
  var CopenhagenPos = new THREE.Vector3(3768.8, 747.6, 5074.2);

  start.position.set(0, 0, 0);
  start.lookAt(HelsinkiPos);
  start.position.copy(HelsinkiPos);

  end.position.set(0, 0, 0);
  end.lookAt(CopenhagenPos);
  end.position.copy(CopenhagenPos);

  // AJAX HERE TO GET RANDOM START AND END POS FROM SERVER

  scene.add(start);
  scene.add(end);

  var bezierGeometry = new THREE.Geometry();
  bezierGeometry.vertices = getBezierVertices(start.position, end.position);
  var bezierMaterial = new THREE.LineBasicMaterial({color: 0xffff00 });
  startEndConnection = new THREE.Line(bezierGeometry, bezierMaterial);

  scene.add(startEndConnection);

  console.log("endpoints loaded");

}


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

      // Update connection path curve
      startEndConnection.geometry.vertices =
        getBezierVertices(start.position, end.position);
      startEndConnection.geometry.verticesNeedUpdate = true;
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
        var stringifiedData = JSON.stringify(satellitePositions);
        $.getJSON(
            "solve.json",
            stringifiedData,
            function(response) {
              if (response.parseError) {
                console.log("solve.json ERROR: ", response.parseError);
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

function onMouseUpDrag() {
  DRAG_OBJECT = {};
}

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

window.addEventListener('resize', function () {
  // Update canvas if the user resizes their window
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

init();
render();
