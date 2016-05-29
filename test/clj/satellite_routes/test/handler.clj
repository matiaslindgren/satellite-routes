(ns satellite-routes.test.handler
  (:require [clojure.test :refer :all]
            [ring.mock.request :refer :all]
            [satellite-routes.handler :refer :all]
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

  (testing "not-found route"
    (let [response ((app) (request :get "/invalid"))]
      (is (= 404 (:status response))))))

