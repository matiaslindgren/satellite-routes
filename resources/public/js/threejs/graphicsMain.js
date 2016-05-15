"use strict";

//all toggles could be merged into one toggle function taking an array as
//parameter
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
  var colorHex = satellitesGUI.showSolutionPath ? 0x00ff00 : 0xff6600;
  connectionPath.forEach(function(element) {
    element.material.color.setHex(colorHex);
  });
}

function removeGraphicsObjects(array) {
  // Removes all Object3D instances from the scene.
  // Assumes all instances are children of the scene.
  array.forEach(function(element) {
    scene.remove(element);
  });
}

var scene, camera, renderer;
var gui, controls;

var EARTH_RADIUS = 6371.0;
var camera_far_frustum;

function init() {

  scene = new THREE.Scene();

  var innerwidth = window.innerWidth;
  var innerheight = window.innerHeight;
  
  camera_far_frustum = 100000;

  camera = new THREE.PerspectiveCamera(
      80,
      innerwidth/innerheight,
      1,
      camera_far_frustum
  );

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(innerwidth, innerheight);

  var container = document.getElementById("graphics-container");
  container.appendChild(renderer.domElement);

  var mainTexturePath;
  var bumpMapPath;

  // The mobileTextures boolean variable is defined in graphics_content.html
  // template and gets its value depending on the choice in the dropdown menu
  if (!mobileTextures) {
    mainTexturePath = "img/NASA_earth_july_HIGHRES_2.png";
    bumpMapPath = "img/NASA_earth_bump_HIGHRES_2.png";
  } else {
    mainTexturePath = "img/NASA_earth_july_LOWRES.png";
    bumpMapPath = "img/NASA_earth_bump_LOWRES.png";
  }

  var planetParameters = {
    name: "EARTH",
    radius: EARTH_RADIUS,
    mainTexture: mainTexturePath,
    bumpMap: bumpMapPath
  }

  loadPlanet(planetParameters);
  loadControls();
  loadEquator();
  loadPrimeMeridian();
  loadCoordinateAxes();
  loadLights();

  controls = new THREE.OrbitControls(camera, renderer.domElement);

}

var satellitesGUI;

function loadControls() {

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
          planetRadius: this.planetRadius },
        function(response) { loadSatellites(response); }
      );
    }

    this.altitude = 0.0;

    this.tetrahedron = function() {
      $.getJSON(
        "generator.json", 
        { polyhedron: "tetrahedron",
          altitude: this.altitude,
          planetRadius: this.planetRadius },
        function(response) { loadSatellites(response); }
      );
    };
    this.cube = function() {
      $.getJSON(
        "generator.json", 
        { polyhedron: "cube",
          altitude: this.altitude,
          planetRadius: this.planetRadius },
        function(response) { loadSatellites(response); }
      );
    };
    this.octahedron = function() {
      $.getJSON(
        "generator.json", 
        { polyhedron: "octahedron",
          altitude: this.altitude,
          planetRadius: this.planetRadius },
        function(response) { loadSatellites(response); }
      );
    };
    this.dodecahedron = function() {
      $.getJSON(
        "generator.json", 
        { polyhedron: "dodecahedron",
          altitude: this.altitude,
          planetRadius: this.planetRadius },
        function(response) { loadSatellites(response); }
      );
    };
    this.icosahedron = function() {
      $.getJSON(
        "generator.json", 
        { polyhedron: "icosahedron",
          altitude: this.altitude,
          planetRadius: this.planetRadius },
        function(response) { loadSatellites(response); }
      );
    };


    this.showSatellites = true;
    this.showConnections = true;
    this.showSolutionPath = true;

    this.planetRadius = EARTH_RADIUS;
    this.showAxes = false;
    this.showEquator = false;
    this.showPrimeMeridian = false;
    this.highQualityTextures = !mobileTextures;
  };

  satellitesGUI = new SatelliteSystem();

  gui = new dat.GUI({ autoPlace: false, width: 300 });
  $("#gui-container").append(gui.domElement);
  //$("#gui-container").draggable(); //renders the gui unusable, 
  //needs a drag area

  var satFolder = gui.addFolder("Satellites");
  var randSatFl = satFolder.addFolder("Random generation");
  var constellationFl = satFolder.addFolder("Constellations");

  randSatFl.add(satellitesGUI, "satelliteCount", 0, 100).step(1);
  randSatFl.add(satellitesGUI, "minAltitude", 0, 9999).step(1);
  randSatFl.add(satellitesGUI, "maxAltitude", 1, 10000).step(1);
  randSatFl.add(satellitesGUI, "generateSatellites");

  constellationFl.add(satellitesGUI, "altitude", 0, 10000).step(1);
  constellationFl.add(satellitesGUI, "tetrahedron");
  constellationFl.add(satellitesGUI, "cube");
  constellationFl.add(satellitesGUI, "octahedron");
  constellationFl.add(satellitesGUI, "dodecahedron");
  constellationFl.add(satellitesGUI, "icosahedron");

  satFolder.add(satellitesGUI, "showSatellites")
    .onChange(toggleSatellites);
  satFolder.add(satellitesGUI, "showConnections")
    .onChange(toggleSatelliteConnections);
  satFolder.add(satellitesGUI, "showSolutionPath")
    .onChange(toggleSolutionPath);
  
  var planetFolder = gui.addFolder("Planet");

  //planetFolder.add(satellitesGUI, "planetRadius", 100, 20000).step(1);
  planetFolder.add(satellitesGUI, "showAxes")
    .onChange(toggleCoordinateAxes);
  planetFolder.add(satellitesGUI, "showEquator")
    .onChange(toggleEquator);
  planetFolder.add(satellitesGUI, "showPrimeMeridian")
    .onChange(togglePrimeMeridian);
  planetFolder.add(satellitesGUI, "highQualityTextures")
    .onChange(console.log("GUI texture change not implemented, please use the dropdown"));


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

  if (satelliteMeshes.length > 0) 
    removeGraphicsObjects(satelliteMeshes);
  if (satelliteConnections.length > 0) 
    removeGraphicsObjects(satelliteConnections);
  if (connectionPath.length > 0) 
    removeGraphicsObjects(connectionPath);
  

  var sat_size = 150;
  var geo;
  var mat;

  data.nodes.forEach(function(element, index) {

    if (element.name == "START") {
      geo = new THREE.SphereGeometry(sat_size/2, 4, 4);
      mat = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    } else if (element.name == "END") {
      geo = new THREE.SphereGeometry(sat_size/2, 4, 4);
      mat = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    } else {
      geo = new THREE.BoxGeometry(sat_size, sat_size, sat_size);
      mat = new THREE.MeshLambertMaterial({ color: 0xcc0099 });
    }

    var satellite = new THREE.Mesh(geo, mat);
    
    satellite.position.x = element.pos[0];
    satellite.position.y = element.pos[1];
    satellite.position.z = element.pos[2];
    
    satelliteMeshes[index] = satellite;

    satellite.visible = satellitesGUI.showSatellites;

    satellite.lookAt(new THREE.Vector3(0, 0, 0));

    scene.add(satellite);

  });

  // CONNECTIONS BETWEEN SATELLITES
  
  var line_geometry;

  data.edges.forEach(function(element, index) {
    line_geometry = new THREE.Geometry();
    line_geometry.vertices.push(
        new THREE.Vector3(
          element[0].pos[0],
          element[0].pos[1],
          element[0].pos[2]
          ),
        new THREE.Vector3(
          element[1].pos[0],
          element[1].pos[1],
          element[1].pos[2]
          )
    );

    var line_material = new THREE.LineBasicMaterial({ color: 0xff6600 });
    var line = new THREE.Line(line_geometry, line_material);

    line.visible = satellitesGUI.showConnections;

    if (element[3].is_solution_path)
      connectionPath.push(line);

    satelliteConnections[index] = line;

    scene.add(line);
  });

  if (satellitesGUI.showSolutionPath)
    toggleSolutionPath();

  console.log("satellites loaded");
}

var planet;
function loadPlanet(planetData) {

  var planetRadius = 6000;
  if (planetData.radius) {
    planetRadius = planetData.radius;
  }

  var planet_geometry = new THREE.SphereGeometry(planetRadius, 32, 32);

  var planet_material = null;
  var texture_loader = new THREE.TextureLoader();

  if (planetData.mainTexture) {
    planet_material = new THREE.MeshPhongMaterial({
      map: texture_loader.load(planetData.mainTexture)
    });
  } else {
    console.log("no texture for planet found, rendering with MeshPhongMaterial.");
    planet_material = new THREE.MeshPhongMaterial();
  }

  if (planetData.bumpMap) {
    planet_material.bumpMap = texture_loader.load(planetData.bumpMap);
    planet_material.bumpScale = planetRadius*0.02;
  }
  if (planetData.specularMap) {
    planet_material.specularMap = texture_loader.load(planetData.specularMap);
  }
  if (planetData.normalMap) {
    planet_material.normalMap = texture_loader.load(planetData.normalMap);
  }

  planet = new THREE.Mesh(planet_geometry, planet_material);

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

  console.log(planetData.name + " loaded");
}


// heuristic to get bezier approximations of circles correct
var c = 1.34*EARTH_RADIUS;
var equator = [];

function loadEquator() {

  var equator_material = new THREE.LineBasicMaterial({color : 0xff00ff});

  var equator1 = new THREE.CubicBezierCurve3(
      new THREE.Vector3(EARTH_RADIUS + 5, 0, 0),
      new THREE.Vector3(EARTH_RADIUS + 5, c, 0),
      new THREE.Vector3(-EARTH_RADIUS - 5, c, 0),
      new THREE.Vector3(-EARTH_RADIUS - 5, 0, 0)
  );
  var equator_geom1 = new THREE.Geometry();
  equator_geom1.vertices = equator1.getPoints(50);
  equator[0] = new THREE.Line(equator_geom1, equator_material);

  var equator2 = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-EARTH_RADIUS - 5, 0, 0),
      new THREE.Vector3(-EARTH_RADIUS - 5, -c, 0),
      new THREE.Vector3(EARTH_RADIUS + 5, -c, 0),
      new THREE.Vector3(EARTH_RADIUS + 5, 0, 0)
  );
  var equator_geom2 = new THREE.Geometry();
  equator_geom2.vertices = equator2.getPoints(50);
  equator[1] = new THREE.Line(equator_geom2, equator_material);

  equator[0].visible = satellitesGUI.showEquator;
  equator[1].visible = satellitesGUI.showEquator;

  scene.add(equator[0]);
  scene.add(equator[1]);

  console.log("equator loaded");

}

var primeMeridian = [];

function loadPrimeMeridian() {

  var meridian_material = new THREE.LineBasicMaterial({color : 0xff00ff});

  var meridian1 = new THREE.CubicBezierCurve3(
      new THREE.Vector3(EARTH_RADIUS + 5, 0, 0),
      new THREE.Vector3(EARTH_RADIUS + 5, 0, c),
      new THREE.Vector3(-EARTH_RADIUS - 5, 0, c),
      new THREE.Vector3(-EARTH_RADIUS - 5, 0, 0)
  );
  var meridian_geom1 = new THREE.Geometry();
  meridian_geom1.vertices = meridian1.getPoints(50);

  primeMeridian[0] = new THREE.Line(meridian_geom1, meridian_material);

  var meridian2 = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-EARTH_RADIUS - 5, 0, 0),
      new THREE.Vector3(-EARTH_RADIUS - 5, 0, -c),
      new THREE.Vector3(EARTH_RADIUS + 5, 0, -c),
      new THREE.Vector3(EARTH_RADIUS + 5, 0, 0)
  );
  var meridian_geom2 = new THREE.Geometry();
  meridian_geom2.vertices = meridian2.getPoints(50);

  primeMeridian[1] = new THREE.Line(meridian_geom2, meridian_material);

  primeMeridian[0].visible = satellitesGUI.showPrimeMeridian;
  primeMeridian[1].visible = satellitesGUI.showPrimeMeridian;

  scene.add(primeMeridian[0]);
  scene.add(primeMeridian[1]);

  console.log("prime meridian loaded");

}


function loadLights() {

  var ambientLight = new THREE.AmbientLight( 0xffffff, 0.4 );
  scene.add( ambientLight );

  var sun = new THREE.PointLight( 0xffffff, 1, 0 );
  sun.position.set( 4*EARTH_RADIUS, 4*EARTH_RADIUS, 4*EARTH_RADIUS);
  scene.add(sun);

  console.log("lights loaded");
}

// COORDINATE SYSTEM
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

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

window.addEventListener('resize', function () {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

init();
render();
