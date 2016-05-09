
var server_resp;
$("#load-button").bind({
  click: function(event) {
    $.getJSON( "app?4", function(response) {
      server_resp = response;
      addSatellites(response);
    });
  }
});

$("#solve-button").bind({
  click: function(event) {
    $.getJSON( "solve", function(response) {
      server_resp = response;
      updateSolved(response);
    });
  }
});

var scene = new THREE.Scene();

var innerwidth = window.innerWidth;
var innerheight = window.innerHeight;

var camera_far_frustum = 100000;

var camera = new THREE.PerspectiveCamera(
    80,
    innerwidth/innerheight,
    1,
    camera_far_frustum
);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(innerwidth, innerheight);

var container = document.getElementById( "container");
container.appendChild(renderer.domElement);


var EARTH_RADIUS = 1.0*6371.0;

// SATELLITES AS BOXES

function addSatellites(data) {
  var satellites = data.nodes;

  var sat_size = 150;
  for (i = 0; i < satellites.length; i++) {

    var geo, mat;

    if (satellites[i].name == "START") {
      geo = new THREE.SphereGeometry(sat_size, 32, 32);
      mat = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    } else if (satellites[i].name == "END") {
      geo = new THREE.SphereGeometry(sat_size, 32, 32);
      mat = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    } else {
      geo = new THREE.BoxGeometry(sat_size, sat_size, sat_size);
      mat = new THREE.MeshLambertMaterial({ color: 0xcc0099 });
    }

    var satellite = new THREE.Mesh(geo, mat);
    
    satellite.position.x = satellites[i].pos[0];
    satellite.position.y = satellites[i].pos[1];
    satellite.position.z = satellites[i].pos[2];

    scene.add(satellite);

  }

  // VISIBILITY LINES

  var edges = data.edges;

  for (i = 0; i < edges.length; i++) {
    var line_geometry = new THREE.Geometry();
    line_geometry.vertices.push(
        new THREE.Vector3(
          edges[i][0].pos[0],
          edges[i][0].pos[1],
          edges[i][0].pos[2]
          ),
        new THREE.Vector3(
          edges[i][1].pos[0],
          edges[i][1].pos[1],
          edges[i][1].pos[2]
          )
    );

    var line_material = new THREE.LineBasicMaterial({ color: 0xff6600 });
    var line = new THREE.Line(line_geometry, line_material);
    scene.add(line);
  }

render();
}

function updateSolved(data) {
  console.log(data);
}

// EARTH AS SPHERE
var earth_geometry = new THREE.SphereGeometry(EARTH_RADIUS, 32, 32);
var earth_material = new THREE.MeshPhongMaterial({
  map: new THREE.TextureLoader().load("img/earthHD.jpg")
});
var earth = new THREE.Mesh(earth_geometry, earth_material);

scene.add(earth);

/*

var thing =  
    new THREE.Mesh(
      new THREE.SphereGeometry(100,5,5),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00
      })
    );
thing.position.z = 7000;
scene.add(thing
);    */

// heuristics to get the prime meridian and equator correct
earth.rotateY(-1.525);
var c = 1.34*EARTH_RADIUS;

var meridian_material = new THREE.LineBasicMaterial({color : 0xff00ff});

var equator1 = new THREE.CubicBezierCurve3(
    new THREE.Vector3(EARTH_RADIUS + 5, 0, 0),
    new THREE.Vector3(EARTH_RADIUS + 5, c, 0),
    new THREE.Vector3(-EARTH_RADIUS - 5, c, 0),
    new THREE.Vector3(-EARTH_RADIUS - 5, 0, 0)
);
var equator_geom1 = new THREE.Geometry();
equator_geom1.vertices = equator1.getPoints(50);

scene.add(new THREE.Line(equator_geom1, meridian_material));

var equator2 = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-EARTH_RADIUS - 5, 0, 0),
    new THREE.Vector3(-EARTH_RADIUS - 5, -c, 0),
    new THREE.Vector3(EARTH_RADIUS + 5, -c, 0),
    new THREE.Vector3(EARTH_RADIUS + 5, 0, 0)
);
var equator_geom2 = new THREE.Geometry();
equator_geom2.vertices = equator2.getPoints(50);

scene.add(new THREE.Line(equator_geom2, meridian_material));

var meridian1 = new THREE.CubicBezierCurve3(
    new THREE.Vector3(EARTH_RADIUS + 5, 0, 0),
    new THREE.Vector3(EARTH_RADIUS + 5, 0, c),
    new THREE.Vector3(-EARTH_RADIUS - 5, 0, c),
    new THREE.Vector3(-EARTH_RADIUS - 5, 0, 0)
);
var meridian_geom1 = new THREE.Geometry();
meridian_geom1.vertices = meridian1.getPoints(50);

scene.add(new THREE.Line(meridian_geom1, meridian_material));

var meridian2 = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-EARTH_RADIUS - 5, 0, 0),
    new THREE.Vector3(-EARTH_RADIUS - 5, 0, -c),
    new THREE.Vector3(EARTH_RADIUS + 5, 0, -c),
    new THREE.Vector3(EARTH_RADIUS + 5, 0, 0)
);
var meridian_geom2 = new THREE.Geometry();
meridian_geom2.vertices = meridian2.getPoints(50);

scene.add(new THREE.Line(meridian_geom2, meridian_material));

// tweaks to get the axes correspond to the ECEF standard
var half_PI = 0.5*Math.PI;
earth.rotateY(half_PI);
earth.rotateX(half_PI);
camera.up = new THREE.Vector3(0, 0, 1);
camera.position.x = 1.5*EARTH_RADIUS;
camera.position.y = 1.5*EARTH_RADIUS;
camera.position.z = 0;


// EQUATOR AND PRIME MERIDIAN
/*
var meridian_length = 2*Math.PI*EARTH_RADIUS;
var meridian_geometry = new THREE.PlaneGeometry(
  0.01*EARTH_RADIUS, 
  meridian_length
);
var curve= new THREE.CubicBezierCurve3(
    new THREE.Vector3(
for (i = 0; i < 3*meridian_length; i+=3) {
  var r = 1.01*EARTH_RADIUS;
  var theta = (i/(3*meridian_length))*(2*Math.PI);
  var y = r*Math.sin(theta);
  var z = r*Math.cos(theta);

  meridian_geometry.vertices[i] = new THREE.Vector3(-5, y, z);
  meridian_geometry.vertices[i+2] = new THREE.Vector3(5, y, z);
  meridian_geometry.vertices[i+1] = new THREE.Vector3(0, 1.005*y, z);

}

var meridian_material = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  side: THREE.DoubleSide
});
var prime_meridian = new THREE.Mesh(meridian_geometry, meridian_material);
scene.add(prime_meridian);
*/
// LIGHTS
var ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 );
scene.add( ambientLight );

var lights = [];

// A SUN OR SOMETHING
lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
/*
lights[ 1 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 2 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 3 ] = new THREE.PointLight( 0xffffff, 1, 0 );
*/
lights[ 0 ].position.set( 4*EARTH_RADIUS, 4*EARTH_RADIUS, 4*EARTH_RADIUS);
/*
lights[ 1 ].position.set( -0.5*EARTH_RADIUS, -1.5*EARTH_RADIUS, 0);
lights[ 2 ].position.set( -1.0*EARTH_RADIUS, -0.5*EARTH_RADIUS, -0.5*EARTH_RADIUS);
lights[ 3 ].position.set( 0, 0, 1.5*EARTH_RADIUS);
*/
scene.add( lights[ 0 ] );
/*
scene.add( lights[ 1 ] );
scene.add( lights[ 2 ] );
scene.add( lights[ 3 ] );
*/


//CONTROLS AND STATS
var controls = new THREE.OrbitControls(camera, renderer.domElement);
/*
var stats = new Stats();
container.appendChild(stats.dom);
*/

// COORDINATE SYSTEM
// X: RED
// Y: GREEN
// Z: BLUE
var coordinates = true;

if (coordinates) {
  var x_material = new THREE.LineBasicMaterial({
    color: 0xff0000,
  });
  var y_material = new THREE.LineBasicMaterial({
    color: 0x00ff00,
  });
  var z_material = new THREE.LineBasicMaterial({
    color: 0x0000ff,
  });
  var x_axis_geom = new THREE.Geometry();
  x_axis_geom.vertices.push(
      new THREE.Vector3(
        -camera_far_frustum,
        0,
        0
      ),
      new THREE.Vector3(
        camera_far_frustum,
        0,
        0
      )
  );

  var y_axis_geom = new THREE.Geometry();
  y_axis_geom.vertices.push(
      new THREE.Vector3(
        0,
        -camera_far_frustum,
        0
      ),
      new THREE.Vector3(
        0,
        camera_far_frustum,
        0
      )
  );
  var z_axis_geom = new THREE.Geometry();
  z_axis_geom.vertices.push(
      new THREE.Vector3(
        0,
        0,
        -camera_far_frustum
      ),
      new THREE.Vector3(
        0,
        0,
        camera_far_frustum
      )
  );

  var x_axis = new THREE.Line(x_axis_geom, x_material);
  scene.add(x_axis);
  var y_axis = new THREE.Line(y_axis_geom, y_material);
  scene.add(y_axis);
  var z_axis = new THREE.Line(z_axis_geom, z_material);
  scene.add(z_axis);
}

function render() {
  requestAnimationFrame(render);


  renderer.render(scene, camera);
}

render();
