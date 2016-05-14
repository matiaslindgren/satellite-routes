(ns satellite-routes.utils.parser
  (:require [loom.graph :as graph]
            [loom.alg :as graph-alg]
            [clojure.string :as string]
            [clojure.pprint :as pprint]
            [satellite-routes.utils.core :as core]
            [satellite-routes.utils.algorithm :as alg]))

(def EARTH-RADIUS 6371.0)

(defn integer-or-nil
  " Returns the parameter as an integer if the parameter is a string 
  containing an unsigned integer, else nil. "
  [string]
  (if-let [match (and string (re-matches #"\d+" string))]
    (Integer/parseInt match)
    nil))

(defn float-or-nil
  " Returns the parameter as a float if the parameter is a string 
  containing an unsigned integer or float, else nil. "
  [string]
  (if-let [match (and string (re-matches #"[0-9]*\.?[0-9]+" string))]
    (Float/parseFloat match)
    nil))

(defn valid-polyhedron?
  [polyhedron-name]
  (let [polyhedrons #{"tetrahedron"
                      "cube"
                      "octahedron"
                      "icosahedron"
                      "dodecahedron"}]
    (contains? polyhedrons polyhedron-name)))


(defn parse-polyhedron-query
  " Parses the query for generating polyhedron data.
  Returns a map of the parsed query parameters. "
  ;todo: add error message to response
  [query-params]
  (let [planet-radius-default EARTH-RADIUS
        min-alt-default 0.0

        polyhedron (:polyhedron query-params)
        pla-rad (float-or-nil (:planetRadius query-params))
        min-alt (float-or-nil (:minAltitude query-params))

        min-altitude (or min-alt min-alt-default)
        planet-radius (or pla-rad planet-radius-default)]
    {:polyhedron polyhedron
     :planet-radius planet-radius
     :min-altitude min-altitude}))


(defn parse-randomization-query
  " Parses the query for generating randomized data.
  Returns a map of the parsed query parameters. "
  ;todo: add error message to response
  [query-params]
  (let [sat-count-default 5
        min-alt-default 300.0
        max-alt-default 700.0
        planet-radius-default EARTH-RADIUS

        sat-cnt (integer-or-nil (:satelliteCount query-params))
        min-alt (float-or-nil (:minAltitude query-params))
        max-alt (float-or-nil (:maxAltitude query-params))
        pla-rad (float-or-nil (:planetRadius query-params))

        sat-count (or sat-cnt sat-count-default)
        min-altitude (if (and min-alt max-alt (> max-alt min-alt))
                       min-alt
                       min-alt-default)
        max-altitude (if (and min-alt max-alt (> max-alt min-alt))
                       max-alt
                       max-alt-default)
        planet-radius (or pla-rad planet-radius-default)]
    {:planet-radius planet-radius
     :min-altitude min-altitude
     :max-altitude max-altitude
     :sat-count sat-count}))

(defn satellites-random
  " Generates n satellite positions from 0 to n-1 randomly at least min-alt km 
  and at most max-alt above a sphere with the radius planet-radius. "
  [n min-alt max-alt planet-radius]
  (let [rand-longitude #(- (rand 360) 180)
        rand-latitude #(- (rand 180) 90)
        delta-min-max-alt (- max-alt min-alt)]
    (loop [sat-n 0
           sat-vec []]
      (if (>= sat-n n)
        sat-vec
        (let [lat (rand-latitude)
              long (rand-longitude)
              r (+ planet-radius (rand delta-min-max-alt) min-alt)
              xyz-pos (alg/as-cartesian r lat long)]
          (recur (inc sat-n)
                 (conj sat-vec {:name (str "SAT" sat-n)
                                :pos xyz-pos})))))))

(defn satellites-polyhedron
  " Generates satellite positions at the vertices of a polyhedron which
  are located altitude km above a sphere of radius planet-radius. "
  [polyhedron-name altitude planet-radius]
  (loop [polyh-vertices (alg/polyhedron-coordinates
                          (+ altitude planet-radius)
                          polyhedron-name)
         sat-n 0
         sat-vec []]
    (if (empty? polyh-vertices)
      sat-vec
      (recur (rest polyh-vertices)
             (inc sat-n)
             (conj sat-vec {:name (str "SAT" sat-n)
                            :pos (first polyh-vertices)})))))

(defn random-route
  " Generates random start and end positions for a planet with a given radius. "
  [planet-radius]
  (let [rand-longitude #(- (rand 360) 180)
        rand-latitude #(- (rand 180) 90)
        start (alg/as-cartesian 
                planet-radius
                (rand-latitude)
                (rand-longitude))
        end (alg/as-cartesian 
              planet-radius
              (rand-latitude)
              (rand-longitude))]
    [start end]))


(defn generate-graph-from-query
  " Pipes the raw query through different functions depending on the query
  and returns a graph with satellites as nodes and their connections as
  edges. The edges include the shortest path from START to END."
  [raw-query-params]
  ;the massive if + let construct is a bit clumsy, maybe make a 
  ;case switch somewhere that checks what sort of generation query is being sent.
  (let [generated-data 
        (if (valid-polyhedron? (:polyhedron raw-query-params))
          (let [parsed-query (parse-polyhedron-query raw-query-params)
                from-polyhedron (satellites-polyhedron
                                  (:polyhedron parsed-query)
                                  (:min-altitude parsed-query)
                                  (:planet-radius parsed-query))]
            from-polyhedron)
          (let [parsed-query (parse-randomization-query raw-query-params)
                from-random (satellites-random
                              (:sat-count parsed-query)
                              (:min-altitude parsed-query)
                              (:max-altitude parsed-query)
                              (:planet-radius parsed-query))]
            from-random))

        ;rnd route is temp, move start end to parameters or smthing
        [rnd-start rnd-end] (random-route EARTH-RADIUS)
        rnd-route {:start rnd-start :end rnd-end}

        sat-graph (core/satellite-graph-with-route
                    generated-data
                    rnd-route)
        nodes (core/graph-nodes sat-graph)
        edges (core/graph-weighted-edges sat-graph)
        solution (core/solve-route sat-graph)
        edges-with-solution (core/apply-solution-path edges solution)]
    {:nodes nodes
     :edges edges-with-solution}))




