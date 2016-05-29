(ns satellite-routes.utils.parser
  (:require [loom.graph :as graph]
            [loom.alg :as graph-alg]
            [clojure.string :as string]
            [clj-json.core :as json]
            [ring.util.codec :as codec]
            [clojure.walk :as walk]
            [clojure.set :as clj-set]
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

(defn all-floats-or-nil
  " Takes a sequence of strings as parameter and returns a vector where all
  the strings have been converted to floats. If any of the float parses fail,
  return nil. "
  [str-seq]
  (if (empty? str-seq)
    nil
    (loop [str-float-seq str-seq
           float-vec []]
      (if (empty? str-float-seq)
        float-vec
        (let [string (first str-float-seq)]
          (if-let [match (and string (re-matches #"-?[0-9]*\.?[0-9]+" string))]
            (recur (rest str-float-seq)
                   (conj float-vec (Float/parseFloat match)))
            nil))))))

(defn polyhedron-or-nil
  [string]
  (if (= 0 (count string))
    "NONE"
    (let [polyhedrons #{"tetrahedron"
                        "cube"
                        "octahedron"
                        "icosahedron"
                        "dodecahedron"}]
      (if (contains? polyhedrons string)
        string
        nil))))

(defn parse-query
  " Parses the query for data generation request.
  Returns a map of the parsed query parameters.
  All missing or invalid parameters will be returned as nil. "
  [query-params]
  (let [sat-count (integer-or-nil (:satelliteCount query-params))
        min-alt (float-or-nil (:minAltitude query-params))
        max-alt (float-or-nil (:maxAltitude query-params))
        fixed-alt (float-or-nil (:altitude query-params))
        planet-radius (float-or-nil (:planetRadius query-params))
        polyhedron (polyhedron-or-nil (:polyhedron query-params))
        start (all-floats-or-nil (:start query-params))
        end (all-floats-or-nil (:end query-params))]
    {:satelliteCount sat-count
     :minAltitude min-alt
     :maxAltitude max-alt
     :altitude fixed-alt
     :planetRadius planet-radius
     :polyhedron polyhedron
     :start start
     :end end}))

(defn nils-as-defaults
  " Replace all nil values with the corresponding default values. "
  [parsed-query]
  (let [sat-count-default 5
        min-alt-default 300.0
        max-alt-default 700.0
        fixed-alt-default 0.0
        planet-radius-default EARTH-RADIUS
        polyhedron-default "cube"
        ;start and end defaults depends on the planet-radius

        sat-count (:satelliteCount parsed-query)
        min-alt (:minAltitude parsed-query)
        max-alt (:maxAltitude parsed-query)
        fixed-alt (:altitude parsed-query)
        planet-radius (:planetRadius parsed-query)
        polyhedron (:polyhedron parsed-query)
        start (:start parsed-query)
        end (:end parsed-query)

        satellite-count (or sat-count sat-count-default)
        min-altitude (if (and min-alt max-alt (> max-alt min-alt))
                       min-alt
                       min-alt-default)
        max-altitude (if (and min-alt max-alt (> max-alt min-alt))
                       max-alt
                       max-alt-default)
        fixed-altitude (or fixed-alt fixed-alt-default)
        planet-radius (or planet-radius planet-radius-default)
        polyhedron (or polyhedron polyhedron-default)

        start-default [0 0 planet-radius]
        end-default [0 0 (- planet-radius)]

        start (or start start-default)
        end (or end end-default)]
    {:satelliteCount satellite-count
     :minAltitude min-altitude
     :maxAltitude max-altitude
     :altitude fixed-altitude
     :planetRadius planet-radius
     :polyhedron polyhedron
     :start start
     :end end}))

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
    {:start start
     :end end}))


(defn generate-graph-from-query
  " Pipes the raw query through different functions depending on the query
  and returns a graph with satellites as nodes and their connections as
  edges. The edges include the shortest path from START to END."
  [raw-query-params]
  ;The massive if + let construct is a bit clumsy, maybe make a
  ;case switch somewhere that checks what sort of generation query is being sent.
  ;Also, it would be polite to send an error message if the query parameters
  ;were incorrect-pos.
  (let [parsed-query (nils-as-defaults (parse-query raw-query-params))
        generated-data (if (= "NONE" (:polyhedron parsed-query))
                         (satellites-random
                           (:satelliteCount parsed-query)
                           (:minAltitude parsed-query)
                           (:maxAltitude parsed-query)
                           (:planetRadius parsed-query))
                         (satellites-polyhedron
                           (:polyhedron parsed-query)
                           (:altitude parsed-query)
                           (:planetRadius parsed-query)))

        route {:start (:start parsed-query)
               :end (:end parsed-query)}

        sat-graph (core/satellite-graph-with-route
                    generated-data
                    route
                    (:planetRadius parsed-query))
        nodes (core/graph-nodes sat-graph)
        edges (core/graph-weighted-edges sat-graph)
        solution (core/solve-route sat-graph)
        edges-with-solution (core/apply-solution-path edges solution)]
    {:nodes nodes
     :edges edges-with-solution}))

(defn errors-in-query
  " Return an error message if sat-vector is invalid.
  Valid vector:
    - All nodes have keys :name and :pos.
    - Exactly one node with name 'START' and one with 'END' exists.
    - :pos must be a vector with three numbers. "
  [sat-vector]
  (if (empty? sat-vector)
    "No satellites loaded"
    (loop [sat-vec sat-vector
           parsed-names #{}]
      (if (empty? sat-vec)
        (if (not (clj-set/subset? #{"START" "END"} parsed-names))
          (str "START or END missing: " parsed-names)
          "")
        (let [current-node (first sat-vec)
              node-pos (:pos current-node)
              valid-pos (and (= (count node-pos) 3)
                             (every? number? node-pos))]
          (if (not valid-pos)
            (str "Invalid satellite pos: " node-pos)
            (let [node-name (:name current-node)]
              (if (contains? parsed-names node-name)
                (str "Duplicate satellite name: " node-name)
                (recur (rest sat-vec) (conj parsed-names node-name))))))))))

(defn update-solution-from-query
  " Parses a sequence of satellites, calculates new edges and the shortest
  path. Returns a map of nodes and edges with solutions similarly to
  generate-graph-from-query. "
  [raw-query-string]
  (let [parsed-data (-> raw-query-string
                        codec/percent-decode
                        json/parse-string
                        walk/keywordize-keys)
        errors (errors-in-query (:satellites parsed-data))]
    (if (not (empty? errors))
      {:parseError errors}
      (let [planet-radius (:planetRadius parsed-data)
            sat-vector (:satellites parsed-data)
            sat-graph (core/satellite-graph sat-vector planet-radius)
            nodes (core/graph-nodes sat-graph)
            edges (core/graph-weighted-edges sat-graph)
            solution (core/solve-route sat-graph)
            edges-with-solution (core/apply-solution-path edges solution)]
        {:nodes nodes
         :edges edges-with-solution}))))



