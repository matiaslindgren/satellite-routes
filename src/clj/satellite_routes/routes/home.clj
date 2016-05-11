(ns satellite-routes.routes.home
  (:require [satellite-routes.layout :as layout]
            [compojure.core :refer [defroutes GET]]
            [satellite-routes.utils.core :as core]
            [ring.util.http-response :as response]
            [clojure.pprint :as pprint]
            [clj-json.core :as json]
            [clojure.java.io :as io]))

(defn app-page [q-string]
  (if (nil? q-string)
    (layout/render "graphics_content.html")
    (let [datapath (core/data-path (Integer/parseInt q-string))
          data (core/parse-data datapath)
          sat-graph (core/sat-graph-with-endpoints data)
          nodes (core/graph-nodes sat-graph)
          all-edges (core/graph-edges sat-graph)
          edges (core/undirected-non-duplicate-edges all-edges)
          solution (core/solve-route sat-graph)
          edges-with-solution (core/apply-solution-path edges solution)
          json-data {:nodes nodes
                     :edges edges-with-solution}
          json-response {:status 200
                         :headers {"Content-Type" "application/json"}
                         :body (json/generate-string json-data)}]
    json-response)))

(defroutes home-routes
  (GET "/" [] (app-page nil))
  (GET "/app" [] #(app-page (:query-string %)))
  (GET "/docs" [] (response/ok (-> "docs/docs.md" io/resource slurp))))

