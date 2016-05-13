(ns satellite-routes.test.handler
  (:require [clojure.test :refer :all]
            [ring.mock.request :refer :all]
            [satellite-routes.handler :refer :all]
            [satellite-routes.utils.algorithm :as alg]
            [clojure.string :as string]))

(deftest test-app
  (testing "main route"
    (let [response ((app) (request :get "/"))]
      (is (= 200 (:status response)))))

  (testing "generator json"
    (let [response ((app) (request :get "/generator.json"))
          content-type (get (:headers response) "Content-Type")]
      (is (= 200 (:status response)))
      (is (= "application/json" content-type))))

  (testing "generator route"
    (let [response ((app) (request :get "/generator"))
          content-type (get (:headers response) "Content-Type")]
      (is (= 200 (:status response)))
      (is (string/includes? content-type "text/html" ))))

  (testing "about route"
    (let [response ((app) (request :get "/about"))]
      (is (= 200 (:status response)))))

  (testing "app route"
    (let [response ((app) (request :get "/app"))]
      (is (= 200 (:status response)))))

  (testing "not-found route"
    (let [response ((app) (request :get "/invalid"))]
      (is (= 404 (:status response))))))

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
  

  

