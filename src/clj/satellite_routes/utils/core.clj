(ns satellite-routes.utils.core
  (:require [loom.graph :as graph]
            [loom.alg :as graph-alg]
            [clojure-csv.core :as csv]
            [clojure.string :as string]
            [clojure.pprint :as pprint]
            [satellite-routes.utils.algorithm :as alg]))


(def EARTH-RADIUS 6371.0)


(defn parse-data
  " Opens and parses the data file. Returns a hashmap with all the data. "
  [filepath] ; could be switched to json, url or whatever
  (loop [lines (csv/parse-csv (slurp filepath))
         hashmap {:satellites []}]
    (if (empty? lines)
      hashmap
      (let [line (first lines)
            [label & values] line]
        (cond 
          (string/includes? label "#SEED")
            (recur (rest lines)
                   (assoc hashmap :seed (first (re-seq #"\d\.\d*" label))))
          (string/includes? label "ROUTE") 
            (let [double-values (map #(Double/parseDouble %) values)
                  [start-lat start-long end-lat end-long] double-values
                  dist-from-earth-center (+ EARTH-RADIUS 0.1)
                  [xs ys zs] (alg/as-cartesian dist-from-earth-center
                                               start-lat
                                               start-long)
                  [xe ye ze] (alg/as-cartesian dist-from-earth-center
                                               end-lat
                                               end-long)]
              (recur (rest lines)
                     (assoc hashmap :route {:start [xs ys zs]
                                            :end [xe ye ze]})))
          :else ; Assuming all other blocks are sat-positions
            (let [double-values (map #(Double/parseDouble %) values)
                  [latitude longitude altitude] double-values
                  dist-from-earth-center (+ EARTH-RADIUS altitude)
                  [x y z] (alg/as-cartesian dist-from-earth-center
                                            latitude
                                            longitude)]
              (recur (rest lines)
                     ; append new satellite into satellites vector
                     (assoc hashmap :satellites 
                            (conj (:satellites hashmap)
                                   {:name label
                                    :pos [x y z]})))))))))


(defn sat-graph-with-edges
  " Takes as parameter the graph of satellite nodes with no edges and adds edges between every node. "
  [sat-graph]
  (if (not (empty? (graph/edges sat-graph)))
    (throw (Exception. "Satellite graph already has edges!"))
    (let [satellites (graph/nodes sat-graph)]
      (reduce graph/add-edges 
              sat-graph
              (for [sat-a satellites
                    sat-b satellites
                    :let [distance (alg/unobstructed-distance
                                     (:pos sat-a)
                                     (:pos sat-b)
                                     EARTH-RADIUS)]
                    :when (and (> (compare (:name sat-a)
                                           (:name sat-b))
                                  0)
                               (> distance 0))]
                  [sat-a sat-b distance])))))


(defn undirected-non-duplicate-edges
  " Returns all unique edges in sat-graph. "
  [all-edges]
  (loop [edges all-edges
         filtered-edges []
         look-up-table {}]
    (if (empty? edges)
      filtered-edges
      (let [[node-a node-b] (first edges)
            name-a (:name node-a)
            name-b (:name node-b)
            key-a (keyword name-a)
            key-b (keyword name-b)]
        (if (or (contains? (key-a look-up-table) name-b)
                (contains? (key-b look-up-table) name-a))
          (recur (rest edges) 
                 filtered-edges 
                 look-up-table)
          (recur (rest edges) 
                 (conj filtered-edges (first edges))
                 (assoc look-up-table 
                        key-a
                        (set (conj (key-a look-up-table) name-b)))))))))


(defn graph-edges
  " Returns the weighted unique edges of an undirected satellite graph. "
  [sat-graph]
  (loop [edges (graph/edges sat-graph)
         with-weights []]
    (if (empty? edges)
      with-weights
      (let [[edge-a edge-b] (first edges)
            weight (graph/weight sat-graph edge-a edge-b)
            new-edge (conj [] edge-a edge-b weight)]
        (recur (rest edges)
               (conj with-weights new-edge))))))


(defn graph-nodes
  " Returns the nodes of a satellite graph. "
  [sat-graph]
  (graph/nodes sat-graph))


(defn satellite-graph
  " Takes as parameter a vector of satellites and creates a weighted graph containing these satellites as nodes. Calls the function that adds edges to the graph and returns a graph with all edges added. "
  [sat-vector]
  (loop [satellites sat-vector
         wgraph (graph/weighted-graph)]
    (if (empty? satellites)
      (sat-graph-with-edges wgraph)
      (let [sat (first satellites)]
        (recur (rest satellites)
               (graph/add-nodes wgraph sat))))))


(defn sat-graph-with-endpoints
  [parsed-data]
  (let [satellites (:satellites parsed-data)
        route (:route parsed-data)
        start-pos (:start route)
        end-pos (:end route)
        start-node {:name "START"
                    :pos start-pos}
        end-node {:name "END"
                  :pos end-pos}
        sat-with-endpoints (conj satellites 
                                 start-node 
                                 end-node)
        sat-graph (satellite-graph sat-with-endpoints)]
    ;(pprint/pprint start-node ) (pprint/pprint end-node ) (pprint/pprint sat-graph)
    sat-graph))


(defn solve-route
  " Uses Dijkstra's algorithm to find the shortest path between nodes named START and END. Returns the solution as a sequence of nodes, START and END included. "
  [sat-graph]
  (let [nodes (graph/nodes sat-graph)
        start (some #(if (= (:name %) "START") %) nodes)
        end (some #(if (= (:name %) "END") %) nodes)]
    (graph-alg/dijkstra-path sat-graph start end)))


(defn edge-is-in-solution
  " Helper for apply-solution-path. Returns true if (first edge) and (second edge) are found in consequtive positions in the sequence of nodes called solution-path. "
  [edge solution-path]
  (let [edge-nodes #{(first edge) (second edge)}]
    (loop [solution solution-path]
      (let [sol-nodes #{(first solution) (second solution)}]
        (cond
          (or (empty? solution) (contains? sol-nodes nil)) false
          (= edge-nodes sol-nodes) true
          :else (recur (rest solution)))))))


(defn apply-solution-path
  " Adds a boolean value is_solution_path (= true) to each edge pair in sat-edges if the edge pair is part of the sequence of nodes in solution-path. Else false.
    This allows easier graphical representations of the shortest path via satellites. 
    Assumes undirected edges. "
  [sat-edges solution-path]
  (loop [edges sat-edges
         processed-edges []]
    (if (empty? edges)
      processed-edges
      (let [new-edge (conj (first edges) 
                           {:is_solution_path 
                             (edge-is-in-solution
                               (first edges)
                               solution-path)})]
        (recur (rest edges)
               (conj processed-edges new-edge))))))


; debugging stuff:

(defn data-path [n]
  (str "/home/matias/koodi/reaktor-orbital-challenge/resources/data" n))


(defn test-apply-solution
  [data-n]
  (let [satgraph (sat-graph-with-endpoints (parse-data (data-path data-n)))
        solved (solve-route satgraph)]
    (println "applying solution")
    (pprint/pprint (apply-solution-path (graph-edges satgraph) solved))))
  

; -----
; utils, could be moved to tests
; -----

(defn positions-valid?
  " Checks that no satellite is inside earth. "
  [sat-vector]
  (loop [satellites sat-vector]
    (if (empty? satellites)
      true
      (let [[x y z] (:pos (first satellites))
            xx (* x x)
            yy (* y y)
            zz (* z z)
            sq-sum (+ xx yy zz)
            sat-dist (Math/sqrt sq-sum)]
        (if (< sat-dist EARTH-RADIUS)
          false
          (recur (rest satellites)))))))


