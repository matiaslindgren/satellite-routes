# satellite-routes [![Build Status](https://travis-ci.org/matiaslindgren/satellite-routes.svg?branch=master)](https://travis-ci.org/matiaslindgren/satellite-routes)

This project started as a debugging tool for validating my solutions to the [Reaktor Orbital Challenge](https://reaktor.com/orbital-challenge). The backend is written in Clojure on Luminus, a Leiningen template. The graph API [loom](https://github.com/aysylu/loom) has been of great help in modeling the satellite system. All Clojure dependencies can be found in the project.clj file, although it still probably contains some dependencies which are not required in this project. The frontend is built on HTML5 Boilerplate generated from [Initializr](http://www.initializr.com/) with some styling from [Bootstrap](http://getbootstrap.com/). The JavaScript graphics are implemented using [ThreeJS](http://threejs.org/) with textures from [NASA](http://visibleearth.nasa.gov/). The home page background image is from [pexels](https://www.pexels.com/photo/earth-space-cosmos-5439/).

The main purpose of this app is to serve as some kind of portfolio material. It should be noted that I haven't studied geomatics engineering or similar sciences so there might be inaccuracies and redundancies with how geographic positions are mapped to the graphical representation of the Earth.

Currently deployed to [Heroku](http://satellite-thing.herokuapp.com/)


## TODO

- Strip all unneeded dependencies and redundancies from the project
- The satellite graph is undirected and thus all duplicate edges are redundant, these could be removed completely
- Implement some kind of loading message on the /app page; the textures are quite large and loading takes currently a lot of time
- The random generation of satellite positions seems to create clusters on the poles, do something about this
- Implement sensible random parameter generators for tests
- Make tests for JavaScript?
- Generate documentation and host on github.io
- Bootstrap navbar resizes awkwardly on Android, maybe try to fix this


## License

MIT License
