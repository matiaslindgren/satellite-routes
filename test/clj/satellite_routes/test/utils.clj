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
    (is (> 0 (alg/unobstructed-distance [0 1e9 0] [0 -1e9 0] 1e6)))
    (is (< 0 (alg/unobstructed-distance [2 2 2] [1.5 1.5 1.5] 1)))
    (is (< 0 (alg/unobstructed-distance [-2 -2 -2] [-1.5 -1.5 -1.5] 1)))
    (is (< 0 (alg/unobstructed-distance [1.5 0 0] [0 1.5 0] 1)))
    (is (< 0 (alg/unobstructed-distance [0 1e9 0] [1e6 1e9 0] 1e6))))

  (testing "polyhedron-coordinates"
    " Test if correct amount of vertices is returned. "
    (is (= 0 (count (alg/polyhedron-coordinates 2 "default"))))
    (is (= 4 (count (alg/polyhedron-coordinates 2 "tetrahedron"))))
    (is (= 6 (count (alg/polyhedron-coordinates 2 "octahedron"))))
    (is (= 8 (count (alg/polyhedron-coordinates 2 "cube"))))
    (is (= 12 (count (alg/polyhedron-coordinates 2 "icosahedron"))))
    (is (= 20 (count (alg/polyhedron-coordinates 2 "dodecahedron"))))))

(defn positions-valid?
  " Checks that all positions in node-vector is within the given limits. "
  [node-vector min-altitude max-altitude]
  (loop [nodes node-vector]
    (if (empty? nodes)
      true
      (let [pos (:pos (first nodes))
            sq-sum (reduce + (map #(* % %) pos))
            node-dist (Math/sqrt sq-sum)]
        (if (not (<= min-altitude node-dist max-altitude))
          false
          (recur (rest nodes)))))))

(deftest test-parser
  (testing "integer-or-nil"
    (is (nil? (parser/integer-or-nil "2a")))
    (is (nil? (parser/integer-or-nil "-1")))
    (is (nil? (parser/integer-or-nil "")))
    (is (nil? (parser/integer-or-nil nil)))
    (is (= 1 (parser/integer-or-nil "1")))
    (let [x (rand-int 1000000)]
      (is (= x (parser/integer-or-nil (str x))))))

  (testing "float-or-nil"
    (is (nil? (parser/float-or-nil "2.0a")))
    (is (nil? (parser/float-or-nil "-1")))
    (is (nil? (parser/float-or-nil "")))
    (is (nil? (parser/float-or-nil nil)))
    (let [close-enough? #(< (Math/abs (- %1 %2)) 1E-6)]
      (is (close-enough? 0.6666 (parser/float-or-nil "0.6666")))))

  (testing "valid-update-query"
    (let [missing-start [{:name "SAT1" :pos [1.0 0 -1.0]}
                         {:name "END" :pos [2.0 0 -2.0]}]
          missing-end [{:name "SAT1" :pos [1.0 0 -1.0]}
                       {:name "START" :pos [2.0 0 -2.0]}]
          bad-pos [{:name "SAT1" :pos [2 0 -1.0]}
                   {:name "START" :pos ["2" 0 -2.0]}
                   {:name "END" :pos [2.0 2 -2.0]}]
          wrong-dimension [{:name "SAT1" :pos [-1.0]}
                           {:name "START" :pos [2.0 0 -3.0]}
                           {:name "END" :pos [2.0 2 -2.0]}]
          duplicate [{:name "SAT1" :pos [-1.0 2 3]}
                     {:name "START" :pos [2.0 0 -3.0]}
                     {:name "SAT1" :pos [5.0 0 -3.0]}
                     {:name "END" :pos [2.0 2 -2.0]}]]
      (is (not (empty? (parser/errors-in-query missing-start))))
      (is (not (empty? (parser/errors-in-query missing-end))))
      (is (not (empty? (parser/errors-in-query bad-pos))))
      (is (not (empty? (parser/errors-in-query wrong-dimension))))
      (is (not (empty? (parser/errors-in-query duplicate)))))
    (let [correct [{:name "SAT1" :pos [2 0 -1.0]}
                   {:name "START" :pos [2 0 -2.0]}
                   {:name "END" :pos [2.0 2 -2.0]}]]
      (is (empty? (parser/errors-in-query correct))))))


(deftest test-core ;todo: implement a fancy random parameter generator for sat positions
  (testing "generate-satellite-graph"
    " Test that SAT0 sees SAT1 but none see SAT2. "
    (let [sat-seq [{:name "TEST-SAT0" :pos [2.1 1.9 2]}
                   {:name "TEST-SAT1" :pos [1.5 1.5 1.5]}
                   {:name "TEST-SAT2" :pos [-2 -2 -2]}]
          planet-radius 1.0
          sat-graph (core/satellite-graph sat-seq planet-radius)]
      (is (= (count (core/graph-nodes sat-graph)) (count sat-seq))
          "Wrong amount of nodes, expected 3.")
      (let [graph-edges (core/graph-weighted-edges sat-graph)]
        (is (= (count graph-edges) 2)
            "Wrong amount of edges, expected 2."))
      (let [sat-seq-with-endpoints (conj sat-seq
                                         {:name "START"
                                          :pos [0.57 0.58 0.59]}
                                         {:name "END"
                                          :pos [-0.2 0.95 0.35]})
            sat-graph-with-endpoints
              (core/satellite-graph sat-seq-with-endpoints planet-radius)
            solution-path (core/solve-route sat-graph-with-endpoints)
            edges (core/graph-weighted-edges sat-graph-with-endpoints)
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

