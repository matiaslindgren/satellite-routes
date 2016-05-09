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
              (println "ROUTE:")
              (pprint/pprint double-values)
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
              (println "SATELLITE:" label)
              (pprint/pprint double-values)
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

(defn graph-edges
  " Returns the weighted edges of a satellite graph. "
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
  [sat-graph]
  (pprint/pprint (graph/nodes sat-graph))
  (let [nodes (graph/nodes sat-graph)
        start (some #(if (= (:name %) "START") %) nodes)
        end (some #(if (= (:name %) "END") %) nodes)]
    (graph-alg/dijkstra-path sat-graph start end)))

(defn data-path [n]
  (str "/home/matias/koodi/reaktor-orbital-challenge/resources/data" n))
; -----
; utils
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

    


