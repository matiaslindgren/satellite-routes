(ns satellite-routes.utils.core
  (:require [loom.graph :as graph]
            [loom.alg :as graph-alg]
            [clojure.string :as string]
            [clojure.pprint :as pprint]
            [satellite-routes.utils.algorithm :as alg]))


(def EARTH-RADIUS 6371.0) ;todo, make this a parameter for all functions

(defn undirected-non-duplicate-edges
  " Returns all unique edges in sat-graph. "
  ; why is this even here?
  ; sat-graph-with-edges should not add duplicate edges?
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


(defn graph-weighted-edges
  " Returns the weighted edges of an undirected satellite graph. "
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
  " Returns the nodes of a satellite graph as a sequence. "
  [sat-graph]
  (seq (graph/nodes sat-graph)))


(defn sat-graph-with-edges
  " Takes as parameter an undirected, weighted graph of satellite nodes 
    with no edges and adds edges between every node that have unobstructed 
    visibility. "
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
                                     EARTH-RADIUS)] ;remove EARTH-RADIUS, could be in sat-graph
                    :when (and (> (compare (:name sat-a)
                                           (:name sat-b))
                                  0)
                               (> distance 0))]
                  [sat-a sat-b distance])))))


(defn satellite-graph
  " Takes as parameter a vector of satellites and creates a weighted graph 
    containing these satellites as nodes. 
    Calls sat-graph-with-edges and returns a graph with all edges added. "
  [sat-vector]
  (loop [satellites sat-vector
         wgraph (graph/weighted-graph)]
    (if (empty? satellites)
      (sat-graph-with-edges wgraph)
      (let [sat (first satellites)]
        (recur (rest satellites)
               (graph/add-nodes wgraph sat))))))


(defn satellite-graph-with-route
  " Does the same thing as satellite-graph but adds two nodes with keys :name 
    which maps to 'START' or 'END', and :pos which maps to 
    (:start route) or (:end route). "
  [satellite-vec route]
  (let [start-node {:name "START"
                    :pos (:start route)}
        end-node {:name "END"
                  :pos (:end route)}
        with-endpoints (conj satellite-vec 
                             start-node 
                             end-node)
        sat-graph (satellite-graph with-endpoints)]
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
  (if (empty? solution-path)
    false
    (let [edge-nodes #{(first edge) (second edge)}]
      (loop [solution solution-path]
        (let [sol-nodes #{(first solution) (second solution)}]
          (cond
            (or (empty? solution) (contains? sol-nodes nil)) false
            (= edge-nodes sol-nodes) true
            :else (recur (rest solution))))))))


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

