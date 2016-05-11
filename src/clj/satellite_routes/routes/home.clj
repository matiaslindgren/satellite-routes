(ns satellite-routes.routes.home
  (:require [satellite-routes.layout :as layout]
            [compojure.core :refer [defroutes GET]]
            [satellite-routes.utils.core :as core]
            [satellite-routes.utils.parser :as parser]
            [ring.util.http-response :as response]
            [clojure.pprint :as pprint]
            [clj-json.core :as json]
            [clojure.java.io :as io]))

(defn app-page []
  (layout/render "graphics_content.html"))

(def EARTH-RADIUS 6371.0)

(defn generate-json [query]
  (pprint/pprint query)
  (let [sat-count (if-let [sat-count-str (-> query :params :satelliteCount)]
                    (Integer/parseInt sat-count-str)
                    20)
        data (parser/generate-data sat-count EARTH-RADIUS)
        sat-graph (core/sat-graph-with-endpoints data)
        nodes (core/graph-nodes sat-graph)
        all-edges (core/graph-edges sat-graph)
        edges (core/undirected-non-duplicate-edges all-edges)
        solution (core/solve-route sat-graph)
        edges-with-solution (core/apply-solution-path edges solution)
        json-data {:nodes nodes
                   :edges edges-with-solution}]
    (if (contains? (:headers query) "x-requested-with")
      (let [json-response {:status 200
                           :headers {"Content-Type" "application/json"}
                           :body (json/generate-string json-data)}]
        json-response)
      (layout/render "generate.html" json-data))))

(defn about-page []
  (layout/render "about.html"))


(defroutes home-routes
  (GET "/" [] (app-page))
  (GET "/generate" [] #(generate-json %))
  (GET "/about" [] (about-page)))

