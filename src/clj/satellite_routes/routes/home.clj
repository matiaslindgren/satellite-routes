(ns satellite-routes.routes.home
  (:require [satellite-routes.layout :as layout]
            [compojure.core :refer [defroutes GET]]
            [satellite-routes.utils.core :as core]
            [satellite-routes.utils.parser :as parser]
            [ring.util.http-response :as response]
            [clojure.pprint :as pprint]
            [clj-json.core :as json]
            [clojure.java.io :as io]))




; ----------------
; Views for routes
; ----------------

(defn home-page []
  (layout/render "home.html"))

(defn app-page [query]
  (if (= (:query-string query) "high-res")
    (layout/render "graphics_content.html" {:highResTextures true})
    (layout/render "graphics_content.html" {:highResTextures false})))


(defn generate-json [query]
  " Depending on the query, returns the generated json-data or 
    renders the generator api page with the json-data prettified."
  (let [json-data (parser/generate-graph-from-query (:params query))]
    (if (contains? query :view-json)
      (layout/render "generator.html" json-data)
      (let [json-response {:status 200
                           :headers {"Content-Type" "application/json"}
                           :body (json/generate-string json-data)}]
        json-response))))


(defn view-json [query]
  (generate-json (assoc query :view-json true)))

(defn about-page []
  (layout/render "about.html"))


(defroutes home-routes
  (GET "/" [] (home-page))
  (GET "/app" [] #(app-page %))
  (GET "/generator.json" [] #(generate-json %))
  (GET "/generator" [] #(view-json %))
  (GET "/about" [] (about-page)))

