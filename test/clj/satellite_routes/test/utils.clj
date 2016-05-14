(ns satellite-routes.test.utils
  (:require [clojure.test :refer :all]
            [satellite-routes.utils.algorithm :as alg]
            [satellite-routes.utils.parser :as parser]
            [satellite-routes.utils.core :as core]
            [clojure.string :as string]))

(deftest test-algorithm
  (testing "truncate-zero"
    (is (== 0.0 (alg/truncate-zero 1E-10)) "x < 1e-9 should truncate to 0.0")
    (is (not= 0.0 (alg/truncate-zero 1E-8)) "x > 1e-9 should NOT truncate to 0.0"))

  (testing "as-cartesian"
    (is (= 0 (compare [1.0 0.0 0.0] (alg/as-cartesian 1.0 0.0 0.0)))
       "r=1 lat=0'N long=0'E should be x=1 y=0 z=0")
    (is (= 0 (compare [0.0 0.0 1.0] (alg/as-cartesian 1.0 90.0 0.0)))
       "r=1 lat=90'N long=0'E should be x=0 y=0 z=1")
    (is (= 0 (compare [0.0 0.0 -1.0] (alg/as-cartesian 1.0 -90.0 0.0)))
       "r=1 lat=90'S long=0'E should be x=0 y=0 z=-1")
    (is (= 0 (compare [0.0 1.0 0.0] (alg/as-cartesian 1.0 0.0 90.0)))
       "r=1 lat=0'N long=90'E should be x=0 y=1 z=0")
    (is (= 0 (compare [-1.0 0.0 0.0] (alg/as-cartesian 1.0 0.0 180.0)))
       "r=1 lat=0'N long=180'E should be x=-1 y=0 z=0")
    (is (= 0 (compare [0.0 -1.0 0.0] (alg/as-cartesian 1.0 0.0 -90.0)))
       "r=1 lat=0'N long=-90'E should be x=0 y=-1 z=0"))

  (testing "unobstructed-distance"
    (is (> 0 (alg/unobstructed-distance [2 0 0] [-2 0 0] 1)))
    (is (> 0 (alg/unobstructed-distance [0 0 2] [0 0 -2] 1)))
    (is (> 0 (alg/unobstructed-distance [0 2 0] [0 -2 0] 1)))
    (is (< 0 (alg/unobstructed-distance [2 2 2] [1.5 1.5 1.5] 1)))
    (is (< 0 (alg/unobstructed-distance [-2 -2 -2] [-1.5 -1.5 -1.5] 1)))
    (is (< 0 (alg/unobstructed-distance [1.5 0 0] [0 1.5 0] 1)))))


(defn random-satellite-data [n] " Generates a sequence of n satellites with random parameters.
    Returns a vector with the sequence and the random radius used in the sequence. "
  (let [rand-radius (+ (rand 1000000) 10)
        min-alt (+ (rand 1000) 1)
        max-alt (+ (rand 1000) (+ 1 min-alt))
        sat-seq (:satellites (parser/generate-random-data 
                               n min-alt max-alt rand-radius))]
    [sat-seq rand-radius]))

(defn positions-valid?
  " Checks that no satellite is inside a planet. "
  [sat-vector planet-radius]
  (loop [satellites sat-vector]
    (if (empty? satellites)
      true
      (let [pos (:pos (first satellites))
            sq-sum (reduce + (map #(* % %) pos))
            sat-dist (Math/sqrt sq-sum)]
        (if (< sat-dist planet-radius)
          false
          (recur (rest satellites)))))))

(deftest test-parser
  (testing "generate-data-valid-positions"
    " Test that no randomly placed satellite is inside a planet with a given radius. "
    (let [random-data-sets (for [i (range 1 11)]
                             (random-satellite-data 10))]
      (is (reduce #(and %1 (apply positions-valid? %2)) random-data-sets)
          "Satellites should not be inside planets."))))

(deftest test-core ;todo: implement a fancy random parameter generator for sat positions
  (testing "generate-satellite-graph"
    " Test that SAT0 sees SAT1 but none see SAT2. "
    (let [sat-seq [{:name "TEST-SAT0" :pos [2.1 1.9 2]}
                   {:name "TEST-SAT1" :pos [1.5 1.5 1.5]}
                   {:name "TEST-SAT2" :pos [-2 -2 -2]}]
          planet-radius 1.0
          sat-graph (core/satellite-graph sat-seq)]
      (is (= (count (core/graph-nodes sat-graph)) (count sat-seq))
          "Wrong amount of nodes, expected 3.")
      (let [graph-edges (core/graph-edges sat-graph)]
        (is (= (count graph-edges) 2)
            "Wrong amount of edges, expected 2.")
        (is (= (count (core/undirected-non-duplicate-edges
                        graph-edges)) 1)
            "Wrong amount of unique edges, expected 1."))
      (let [sat-seq-with-endpoints (conj sat-seq 
                                         {:name "START"
                                          :pos [0.57 0.58 0.59]}
                                         {:name "END"
                                          :pos [-0.2 0.95 0.35]})
            sat-graph-with-endpoints (core/satellite-graph sat-seq-with-endpoints)
            solution-path (core/solve-route sat-graph-with-endpoints)
            edges (core/graph-edges sat-graph-with-endpoints)
            with-solution-flags (core/apply-solution-path edges solution-path)
            is-in-solution? (fn [edge name1 name2]
                              (and (or (and (= (:name (first edge)) name1)
                                            (= (:name (second edge)) name2))
                                       (and (= (:name (first edge)) name2)
                                            (= (:name (second edge)) name1)))
                                   (:is_solution_path (get edge 3))))]
        (is (not (empty? solution-path))
            "Expected a valid route from START to END.")
        (is (and (some #(is-in-solution? % "START" "TEST-SAT1") with-solution-flags)
                 (some #(is-in-solution? % "END" "TEST-SAT1") with-solution-flags))
            "Expected TEST-SAT1 on the valid route.")))))
            
