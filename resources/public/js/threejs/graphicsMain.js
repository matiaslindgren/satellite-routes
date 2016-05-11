"use strict";

var server_resp;
$("#load-button").bind({
  click: function() {
    $.getJSON( "app?3", function(response) { //query int should be manual
      server_resp = response;
      loadSatellites(response);
    });
  }
});

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
  var colorHex = controlsGUI.showSolutionPath ? 0x00ff00 : 0xff6600;
  connectionPath.forEach(function(element) {
    element.material.color.setHex(colorHex);
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


  loadEarth("img/earthHD.jpg");
  loadControls();
  loadEquator();
  loadPrimeMeridian();
  loadCoordinateAxes();
  loadLights();

  controls = new THREE.OrbitControls(camera, renderer.domElement);

}

var controlsGUI;

function loadControls() {

  var ControlsGUI = function() {
    this.showAxes = false;
    this.showEquator = false;
    this.showPrimeMeridian = false;
    this.showSatellites = true;
    this.showSatelliteConnections = true;
    this.showSolutionPath = true;
  };
  controlsGUI = new ControlsGUI();
  gui = new dat.GUI();
  gui.add(controlsGUI, "showAxes")
    .onChange(toggleCoordinateAxes);
  gui.add(controlsGUI, "showEquator")
    .onChange(toggleEquator);
  gui.add(controlsGUI, "showPrimeMeridian")
    .onChange(togglePrimeMeridian);
  gui.add(controlsGUI, "showSatellites")
    .onChange(toggleSatellites);
  gui.add(controlsGUI, "showSatelliteConnections")
    .onChange(toggleSatelliteConnections);
  gui.add(controlsGUI, "showSolutionPath")
    .onChange(toggleSolutionPath);

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
    alert("Satellite data has already been loaded."); // replace this with ajax red text at button
    return;
  }

  var sat_size = 150;
  var geo;
  var mat;

  data.nodes.forEach(function(element, index) {

    if (element.name == "START") {
      geo = new THREE.SphereGeometry(sat_size, 32, 32);
      mat = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    } else if (element.name == "END") {
      geo = new THREE.SphereGeometry(sat_size, 32, 32);
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

    satellite.visible = controlsGUI.showSatellites;

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

    line.visible = controlsGUI.showSatelliteConnections;

    if (element[3].is_solution_path)
      connectionPath.push(line);

    satelliteConnections[index] = line;

    scene.add(line);
  });

  if (controlsGUI.showSolutionPath)
    toggleSolutionPath();

  console.log("satellites loaded");
}

var earth;
function loadEarth(texturePath) {

  // EARTH AS A SPHERE
  var earth_geometry = new THREE.SphereGeometry(EARTH_RADIUS, 32, 32);
  var earth_material = new THREE.MeshPhongMaterial({
    map: new THREE.TextureLoader().load(texturePath)
  });
  earth = new THREE.Mesh(earth_geometry, earth_material);

  // tweaks to get the axes, equator and the prime meridian correct
  var half_PI = 0.5*Math.PI;
  earth.rotateY(-1.525);
  earth.rotateY(half_PI);
  earth.rotateX(half_PI);

  camera.up = new THREE.Vector3(0, 0, 1);
  camera.position.x = 1.5*EARTH_RADIUS;
  camera.position.y = 1.5*EARTH_RADIUS;
  camera.position.z = 0;

  scene.add(earth);

  console.log("earth loaded");
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

  equator[0].visible = controlsGUI.showEquator;
  equator[1].visible = controlsGUI.showEquator;

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

  primeMeridian[0].visible = controlsGUI.showPrimeMeridian;
  primeMeridian[1].visible = controlsGUI.showPrimeMeridian;

  scene.add(primeMeridian[0]);
  scene.add(primeMeridian[1]);

  console.log("prime meridian loaded");

}


function loadLights() {

  var ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 );
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

  x_axis.visible = y_axis.visible = z_axis.visible = controlsGUI.showAxes;

  scene.add(x_axis);
  scene.add(y_axis);
  scene.add(z_axis);

  console.log("coordinate axes loaded");
}

function render() {
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

init();
render();
