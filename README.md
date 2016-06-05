# satellite-routes [![Build Status](https://travis-ci.org/matiaslindgren/satellite-routes.svg?branch=master)](https://travis-ci.org/matiaslindgren/satellite-routes)

This project started as a debugging tool for validating my solutions to the [Reaktor Orbital Challenge](https://reaktor.com/orbital-challenge). The backend is stateless and written in Clojure on Luminus, a Leiningen template. The graph API [loom](https://github.com/aysylu/loom) has been of great help in modeling the satellite system. All Clojure dependencies can be found in the project.clj file, although it still probably contains some dependencies which are not required in this project. The frontend is built on HTML5 Boilerplate generated from [Initializr](http://www.initializr.com/) with some styling from [Bootstrap](http://getbootstrap.com/). The JavaScript graphics are implemented using [ThreeJS](http://threejs.org/) with textures from different sources:
* [Earth](http://visibleearth.nasa.gov/)
* [Mars](http://celestiamotherlode.net/creators/praesepe/MarsV3-Shaded-2k.jpg)
* [Jupiter](http://www.celestiamotherlode.net/catalog/jupiter.php)

Currently deployed to [Heroku](http://satellite-thing.herokuapp.com/)


## TODO

- Strip all unneeded dependencies and redundancies from the project
- The random generation of satellite positions seems to create clusters on the poles, do something about this
- Implement sensible random parameter generators for tests
- Make tests for JavaScript?
- Generate documentation and host on github.io


## License

MIT License
