(ns satellite-routes.routes.home
  (:require [satellite-routes.layout :as layout]
            [compojure.core :refer [defroutes GET]]
            [satellite-routes.utils.core :as core]
            [ring.util.http-response :as response]
            [clojure.pprint :as pprint]
            [clj-json.core :as json]
            [clojure.java.io :as io]))


(defn home-page []
  (layout/render "home.html"))

(defn solve-page [q-string]
  (let [datapath (core/data-path (Integer/parseInt q-string))
        data (core/parse-data datapath)
        sat-graph (core/sat-graph-with-endpoints data)
        json-data {:nodes (core/graph-nodes sat-graph)
                   :edges (core/graph-edges sat-graph)
                   :solution (core/solve-route sat-graph)}
        json-response {:status 200
                       :headers {"Content-Type" "application/json"}
                       :body (json/generate-string json-data)}]
    json-response))

(defn app-page [q-string]
  (println "app page requested")
  (if (nil? q-string)
    (layout/render "simplefirst.html")
    (let [datapath (core/data-path (Integer/parseInt q-string))
          data (core/parse-data datapath)
          sat-graph (core/sat-graph-with-endpoints data)
          json-data {:nodes (core/graph-nodes sat-graph)
                     :edges (core/graph-edges sat-graph)
                     :solution (core/solve-route sat-graph)}
          json-response {:status 200
                         :headers {"Content-Type" "application/json"}
                         :body (json/generate-string json-data)}]
      (pprint/pprint json-data)

    json-response)))

(defroutes home-routes
  (GET "/" [] (home-page))
  (GET "/app" [] #(app-page (:query-string %)))
  (GET "/solve" [] #(solve-page (:query-string %)))
  (GET "/docs" [] (response/ok (-> "docs/docs.md" io/resource slurp))))

